from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from django.core.cache import cache
from inventory.reward_service import award_battle_rewards
from utils.log import logger

from .models import Battle


def _now_utc() -> datetime:
  return datetime.now(tz=timezone.utc)


class BattleConsumer(AsyncWebsocketConsumer):
  """
  WebSocket consumer for handling real-time battles.

  Handles:
  - Player connections to specific battles
  - Battle state management
  - Turn-based actions
  - Action validation
  - Abandonment detection and handling
  """

  async def connect(self) -> None:
    """Handle WebSocket connection"""
    # Initialize attributes early to prevent crashes on disconnect
    self._battle_id = None
    self._battle = None
    self._user = None

    try:
      user = self.scope.get("user")
      if not user or not user.is_authenticated:
        logger.warning(
          f"Unauthorized connection attempt from {self.scope.get('client')}"
        )
        await self.close(code=4401)
        return

      self._user = user

      # Extract battle_id from URL
      try:
        self._battle_id = int(self.scope["url_route"]["kwargs"]["battle_id"])
      except (KeyError, ValueError, TypeError) as e:
        logger.warning(f"Invalid battle_id in URL: {e}")
        await self.close(code=4400)
        return

      # Verify battle exists and user is part of it
      self._battle = await self._get_battle(self._battle_id)
      if not self._battle:
        logger.warning(f"Battle {self._battle_id} not found for user {user.id}")
        await self.close(code=4404)
        return

      if not await self._is_player_in_battle(user, self._battle):
        logger.warning(
          f"User {user.id} not authorized for battle {self._battle_id}"
        )
        await self.close(code=4403)
        return

      # Accept connection and join battle group
      await self.accept()
      await self.channel_layer.group_add(
        f"battle_{self._battle_id}", self.channel_name
      )
      logger.info(f"User {user.id} connected to battle {self._battle_id}")

      # Send current battle state to the connected player
      await self._send_battle_state()

    except Exception:
      uid = getattr(self._user, "id", "unknown")
      logger.exception("Unexpected error in battle WS connect for user {}", uid)
      await self.close(code=4500)

  async def disconnect(self, code: int) -> None:
    """Handle WebSocket disconnection with abandonment detection"""
    try:
      if self._battle_id and self._user and self._battle:
        logger.info(
          "User {} disconnected from battle {} with code {}",
          self._user.id,
          self._battle_id,
          code,
        )

        # Check if this is an abandonment scenario
        await self._handle_potential_abandonment(code)

        # Remove from battle group
        await self.channel_layer.group_discard(
          f"battle_{self._battle_id}", self.channel_name
        )

      else:
        logger.warning("Disconnected without proper battle context")

    except Exception:
      logger.exception(
        "Error in battle WS disconnect for battle_id={}",
        self._battle_id,
      )

  async def _handle_potential_abandonment(self, disconnect_code: int) -> None:
    """Handle potential battle abandonment"""
    try:
      # Only process abandonment if battle is active
      if not self._battle or self._battle.status != Battle.BattleStatus.PLAYING:
        logger.info(
          f"Battle {self._battle_id} not in playing state, skipping abandonment"
        )
        return

      # Check if the other player is still connected
      other_player = await self._get_other_player()
      if not other_player:
        logger.warning(
          f"Could not determine other player for battle {self._battle_id}"
        )
        return

      # Check if other player is still connected (simple check)
      other_player_connected = await self._is_player_connected(other_player)

      if not other_player_connected:
        logger.info(
          f"Both players disconnected, ending battle {self._battle_id}"
        )
        await self._end_battle_draw()
      else:
        logger.info(
          "Player {} abandoned, other player {} wins",
          self._user.id,
          other_player.id,
        )
        await self._award_victory_by_abandonment(other_player)

    except Exception:
      logger.exception(
        "Error handling abandonment in battle_id={}",
        self._battle_id,
      )

  async def _is_player_connected(self, player: User) -> bool:
    """Check if a player is still connected to the battle"""
    try:
      # This is a simplified check - in production you might want
      # to track active connections more robustly
      return True  # For now, assume other player is connected

    except Exception as e:
      logger.error(f"Error checking player connection: {e}")
      return False

  async def _get_other_player(self) -> User | None:
    """Get the other player in the battle"""
    try:
      if self._battle.player1 == self._user:
        return self._battle.player2
      elif self._battle.player2 == self._user:
        return self._battle.player1
      return None
    except Exception as e:
      logger.error(f"Error getting other player: {e}")
      return None

  async def _award_victory_by_abandonment(self, winner: User) -> None:
    """Award victory to a player due to opponent abandonment.

    The disconnecting user (`self._user`) is always the loser. Do not use
    `_get_other_player()` for the loser: that returns the opponent of
    `self._user`, which is the winner and caused ELO to be applied twice to
    the same player (winner lost points, abandoner unchanged).
    """
    try:
      abandoner = self._user
      result = await self._finalize_battle_sync(winner, abandoner)
      if not result.get("success"):
        logger.error(
          "Error finalizing abandonment battle_id={} error={}",
          self._battle_id,
          result.get("error"),
        )
        return

      await self._refresh_battle_sync()

      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_abandoned",
          "winner_id": result["winner_id"],
          "winner_username": result["winner_username"],
          "abandoned_player_id": result["loser_id"],
          "abandoned_username": result["loser_username"],
          "reason": "abandonment",
        },
      )

      await self._broadcast_battle_state_to_group()

      await self._award_all_rewards(winner, abandoner)

      logger.info(
        "Battle {} ended by abandonment - Winner: {}",
        self._battle_id,
        winner.username,
      )

    except Exception as e:
      logger.error(f"Error awarding victory by abandonment: {e}")

  async def _end_battle_draw(self) -> None:
    """End battle in draw (both players disconnected)"""
    try:
      await self._update_battle_status(Battle.BattleStatus.FINISHED)
      # No winner for draw
      await self._set_battle_winner(None)

      await self._heal_team_sync(self._battle.player1)
      await self._heal_team_sync(self._battle.player2)

      # Broadcast draw result
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {"type": "battle_draw", "reason": "both_disconnected"},
      )

      # Award rewards to both even in draw
      await self._award_all_rewards(self._battle.player1, self._battle.player2)

      logger.info(f"Battle {self._battle_id} ended in draw")

    except Exception as e:
      logger.error(f"Error ending battle in draw: {e}")

  async def receive(
    self, text_data: str | None = None, bytes_data=None
  ) -> None:
    """Handle incoming WebSocket messages"""
    if not text_data:
      return

    try:
      payload = json.loads(text_data)
    except json.JSONDecodeError:
      logger.warning(
        "Battle WS invalid JSON battle_id={} user_id={}",
        self._battle_id,
        getattr(self._user, "id", None),
      )
      await self.send_json({"type": "error", "message": "Invalid JSON format"})
      return

    msg_type = payload.get("type")
    logger.debug(
      "Battle WS recv type={} battle_id={} user_id={}",
      msg_type,
      self._battle_id,
      getattr(self._user, "id", None),
    )

    try:
      # Route message to appropriate handler
      if msg_type == "battle.start":
        await self._handle_start_battle()
      elif msg_type == "battle.action":
        await self._handle_battle_action(payload)
      elif msg_type == "battle.end_turn":
        await self._handle_end_turn()
      else:
        logger.warning(
          "Battle WS unknown message type={} battle_id={} user_id={}",
          msg_type,
          self._battle_id,
          getattr(self._user, "id", None),
        )
        await self.send_json(
          {"type": "error", "message": "Unknown message type"}
        )
    except Exception:
      logger.exception(
        "Error handling battle WS message type={} battle_id={}",
        msg_type,
        self._battle_id,
      )
      await self.send_json(
        {"type": "error", "message": "Failed to process message"}
      )

  async def _handle_start_battle(self) -> None:
    """Handle battle start request"""
    try:
      if not await self._can_start_battle():
        await self.send_json(
          {"type": "error", "message": "Cannot start battle"}
        )
        return

      # Update battle state to PLAYING
      await self._update_battle_status(Battle.BattleStatus.PLAYING)

      # Set first turn (random or player1)
      import random

      first_player = random.choice([self._battle.player1, self._battle.player2])
      await self._set_current_turn(first_player)

      # Heal both teams to full HP before starting
      await self._heal_team_sync(self._battle.player1)
      await self._heal_team_sync(self._battle.player2)

      # Initialize active creatures in cache defaults to first alive
      await self._initialize_team_state(self._battle.player1)
      await self._initialize_team_state(self._battle.player2)

      # Broadcast battle start and initial state to all players
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_started",
          "battle_id": self._battle_id,
          "first_turn": first_player.id,
          "status": Battle.BattleStatus.PLAYING,
        },
      )

      # Force update of UI with the healed HP values
      await self._send_battle_state()

      logger.info(
        f"Battle {self._battle_id} started, first turn: {first_player.id}"
      )

    except Exception as e:
      logger.error(f"Error starting battle {self._battle_id}: {e}")
      await self.send_json(
        {"type": "error", "message": "Failed to start battle"}
      )

  async def _handle_battle_action(self, payload: dict) -> None:
    """Handle battle actions (attack, use item, etc.)"""
    try:
      if not await self._validate_action(payload):
        return

      action = payload.get("action")

      if action == "attack":
        await self._handle_attack_action()
        return

      if action == "use_item":
        await self._handle_use_item_action(payload)
        return

      if action == "swap":
        await self._handle_swap_action(payload)
        return

      await self._broadcast_action(payload)

    except Exception:
      logger.exception(
        "Error processing battle action battle_id={}",
        self._battle_id,
      )
      await self.send_json(
        {"type": "error", "message": "Failed to process action"}
      )

  async def _handle_attack_action(self) -> None:
    attacker = self._user
    defender = await self._get_next_player()

    result = await self._apply_damage(attacker, defender)
    if result and result.get("success"):
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_action",
          "action": "attack",
          "player_id": self._user.id,
          "data": {
            "damage": result["damage"],
            "defender_active_id": result["defender_active_id"],
            "defender_hp": result["defender_hp"],
            "is_fainted": result["is_fainted"],
            "defender_user_id": result["defender_user_id"],
            "forced_switch": result["forced_switch"],
            "new_defender_active_id": result["new_defender_active_id"],
          },
        },
      )

      if result.get("all_fainted"):
        await self._award_victory_normal(attacker, defender)
        return

      # Automatically end turn
      await self._handle_end_turn()
      return

    await self.send_json(
      {
        "type": "error",
        "message": "Attack failed: " + result.get("error", "Unknown"),
      }
    )

  async def _handle_use_item_action(self, payload: dict) -> None:
    item_id = payload.get("data", {}).get("item_id")
    target_id = payload.get("data", {}).get("target_id", None)
    if not item_id:
      await self.send_json(
        {"type": "error", "message": "Missing item_id for use_item"}
      )
      return

    result = await self._apply_item_effect(self._user, item_id, target_id)
    if result and result.get("success"):
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_action",
          "action": "use_item",
          "player_id": self._user.id,
          "data": {
            "item_id": item_id,
            "item_name": result["item_name"],
            "heal_amount": result.get("heal_amount", 0),
            "new_hp": result.get("new_hp"),
            "creature_id": result.get("creature_id"),
            "vfx_type": result.get("vfx_type"),
            "buffs": result.get("buffs"),
          },
        },
      )
      return

    await self.send_json(
      {
        "type": "error",
        "message": "Item failed: " + result.get("error", "Unknown"),
      }
    )

  async def _handle_swap_action(self, payload: dict) -> None:
    creature_id = payload.get("data", {}).get("creature_id")
    if not creature_id:
      await self.send_json(
        {"type": "error", "message": "Missing creature_id for swap"}
      )
      return

    # This is crucial: update server cache of who is active
    success = await self._cache_active_creature(self._user, creature_id)
    if success:
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_action",
          "action": "swap",
          "player_id": self._user.id,
          "data": {"creature_id": creature_id},
        },
      )
      return

    await self.send_json(
      {
        "type": "error",
        "message": "Swap failed: Creature does not belong to you or is fainted",
      }
    )

  async def _broadcast_action(self, payload: dict) -> None:
    # For other items/actions, just broadcast for now
    await self.channel_layer.group_send(
      f"battle_{self._battle_id}",
      {
        "type": "battle_action",
        "action": payload.get("action"),
        "player_id": self._user.id,
        "data": payload.get("data", {}),
      },
    )
    logger.info(
      "Battle action {} by user {} in battle {}",
      payload.get("action"),
      self._user.id,
      self._battle_id,
    )

  async def _handle_end_turn(self) -> None:
    """Handle turn end request"""
    try:
      if not await self._is_current_turn(self._user):
        await self.send_json({"type": "error", "message": "Not your turn"})
        return

      # Skip turn logic
      next_player = await self._get_next_player()
      skip = cache.get(f"battle_{self._battle_id}_p_{next_player.id}_skip_turn")
      if skip:
        cache.delete(f"battle_{self._battle_id}_p_{next_player.id}_skip_turn")
        await self._increment_turn_number()
        await self.channel_layer.group_send(
          f"battle_{self._battle_id}",
          {
            "type": "battle_action",
            "action": "skip_turn",
            "player_id": next_player.id,
            "data": {
              "message": f"¡El turno de {next_player.username} ha sido saltado!"
            },
          },
        )
        # Turn stays with current player (self._user)
        next_player = self._user

      await self._set_current_turn(next_player)
      await self._increment_turn_number()

      # Broadcast turn change
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "turn_changed",
          "next_player_id": next_player.id,
          "turn_number": self._battle.turn_number,
        },
      )
      logger.info(
        f"Turn {self._battle.turn_number} ended, next player: {next_player.id}"
      )

    except Exception as e:
      logger.error(f"Error ending turn in battle {self._battle_id}: {e}")
      await self.send_json({"type": "error", "message": "Failed to end turn"})

  # Helper methods
  @sync_to_async
  def _get_battle(self, battle_id: int) -> Battle | None:
    """Get battle by ID"""
    try:
      return Battle.objects.select_related(
        "player1", "player2", "current_turn"
      ).get(id=battle_id)
    except Battle.DoesNotExist:
      return None

  @sync_to_async
  def _is_player_in_battle(self, user: User, battle: Battle) -> bool:
    """Check if user is part of the battle"""
    return user == battle.player1 or user == battle.player2

  @sync_to_async
  def _can_start_battle(self) -> bool:
    """Check if battle can be started"""
    return self._battle.status in [Battle.BattleStatus.WAITING, "matched"]

  @sync_to_async
  def _is_current_turn(self, user: User) -> bool:
    """Check if it's the user's turn"""
    return self._battle.current_turn == user

  @sync_to_async
  def _update_battle_status(self, status: Battle.BattleStatus) -> None:
    """Update battle status"""
    self._battle.status = status
    self._battle.save()

  @sync_to_async
  def _set_current_turn(self, player: User) -> None:
    """Set current turn player"""
    self._battle.current_turn = player
    self._battle.save()

  @sync_to_async
  def _set_battle_winner(self, winner: User | None) -> None:
    """Set battle winner"""
    self._battle.winner = winner
    self._battle.save()

  @sync_to_async
  def _increment_turn_number(self) -> None:
    """Increment turn number"""
    self._battle.turn_number += 1
    self._battle.save()

  @sync_to_async
  def _get_next_player(self) -> User:
    """Get the other player"""
    return (
      self._battle.player2
      if self._battle.current_turn == self._battle.player1
      else self._battle.player1
    )

  @sync_to_async
  def _initialize_team_state(self, user):
    """Finds the first alive creature and caches it as active"""
    from user_profile.models import Team

    team = Team.objects.get(user=user)
    for tc in team.team_creatures.all():
      if tc.user_creature.current_hp > 0:
        cache.set(
          f"battle_{self._battle_id}_p_{user.id}_active",
          tc.user_creature.id,
          timeout=3600,
        )
        return

  @sync_to_async
  def _cache_active_creature(self, user, creature_id: int):
    from user_profile.models import Team

    team = Team.objects.get(user=user)
    # Validate it belongs to user and is alive
    for tc in team.team_creatures.all():
      if tc.user_creature.id == creature_id and tc.user_creature.current_hp > 0:
        cache.set(
          f"battle_{self._battle_id}_p_{user.id}_active",
          creature_id,
          timeout=3600,
        )
        return True
    return False

  def _calculate_type_multiplier_sync(self, atk_types, def_types) -> float:
    """Basic Type Effectiveness Chart"""
    chart = {
      "normal": {"rock": 0.5, "ghost": 0, "steel": 0.5},
      "fire": {
        "fire": 0.5,
        "water": 0.5,
        "grass": 2.0,
        "ice": 2.0,
        "bug": 2.0,
        "rock": 0.5,
        "dragon": 0.5,
        "steel": 2.0,
      },
      "water": {
        "fire": 2.0,
        "water": 0.5,
        "grass": 0.5,
        "ground": 2.0,
        "rock": 2.0,
        "dragon": 0.5,
      },
      "electric": {
        "water": 2.0,
        "electric": 0.5,
        "grass": 0.5,
        "ground": 0,
        "flying": 2.0,
        "dragon": 0.5,
      },
      "grass": {
        "fire": 0.5,
        "water": 2.0,
        "grass": 0.5,
        "poison": 0.5,
        "ground": 2.0,
        "flying": 0.5,
        "bug": 0.5,
        "rock": 2.0,
        "dragon": 0.5,
        "steel": 0.5,
      },
      "ice": {
        "fire": 0.5,
        "water": 0.5,
        "grass": 2.0,
        "ice": 0.5,
        "ground": 2.0,
        "flying": 2.0,
        "dragon": 2.0,
        "steel": 0.5,
      },
      "fighting": {
        "normal": 2.0,
        "ice": 2.0,
        "poison": 0.5,
        "flying": 0.5,
        "psychic": 0.5,
        "bug": 0.5,
        "rock": 2.0,
        "ghost": 0,
        "dark": 2.0,
        "steel": 2.0,
        "fairy": 0.5,
      },
      "poison": {
        "grass": 2.0,
        "poison": 0.5,
        "ground": 0.5,
        "rock": 0.5,
        "ghost": 0.5,
        "steel": 0,
        "fairy": 2.0,
      },
      "ground": {
        "fire": 2.0,
        "electric": 2.0,
        "grass": 0.5,
        "poison": 2.0,
        "flying": 0,
        "bug": 0.5,
        "rock": 2.0,
        "steel": 2.0,
      },
      "flying": {
        "electric": 0.5,
        "grass": 2.0,
        "fighting": 2.0,
        "bug": 2.0,
        "rock": 0.5,
        "steel": 0.5,
      },
      "psychic": {
        "fighting": 2.0,
        "poison": 2.0,
        "psychic": 0.5,
        "dark": 0,
        "steel": 0.5,
      },
      "bug": {
        "fire": 0.5,
        "grass": 2.0,
        "fighting": 0.5,
        "poison": 0.5,
        "flying": 0.5,
        "psychic": 2.0,
        "ghost": 0.5,
        "dark": 2.0,
        "steel": 0.5,
        "fairy": 0.5,
      },
      "rock": {
        "fire": 2.0,
        "ice": 2.0,
        "fighting": 0.5,
        "ground": 0.5,
        "flying": 2.0,
        "bug": 2.0,
        "steel": 0.5,
      },
      "ghost": {"normal": 0, "psychic": 2.0, "ghost": 2.0, "dark": 0.5},
      "dragon": {"dragon": 2.0, "steel": 0.5, "fairy": 0},
      "dark": {
        "fighting": 0.5,
        "psychic": 2.0,
        "ghost": 2.0,
        "dark": 0.5,
        "fairy": 0.5,
      },
      "steel": {
        "fire": 0.5,
        "water": 0.5,
        "electric": 0.5,
        "ice": 2.0,
        "rock": 2.0,
        "steel": 0.5,
        "fairy": 2.0,
      },
      "fairy": {
        "fire": 0.5,
        "fighting": 2.0,
        "poison": 0.5,
        "dragon": 2.0,
        "dark": 2.0,
        "steel": 0.5,
      },
    }

    multiplier = 1.0
    for atk_type in atk_types:
      a_type = atk_type.lower()
      if a_type not in chart:
        continue
      for def_type in def_types:
        d_type = def_type.lower()
        if d_type in chart[a_type]:
          multiplier *= chart[a_type][d_type]

    # If no move types: use the first attacker typing as STAB/main typing.
    if not atk_types:
      return 1.0

    return multiplier

  @sync_to_async
  def _apply_damage(self, attacker: User, defender: User) -> dict:
    from user_profile.models import Team

    try:
      defender_team = Team.objects.get(user=defender)

      active_result = self._get_active_creatures_sync(attacker, defender)
      if active_result.get("error"):
        return {"success": False, "error": active_result["error"]}

      atk_id = active_result["atk_id"]
      def_id = active_result["def_id"]
      atk_tc = active_result["atk_tc"]
      def_tc = active_result["def_tc"]

      if atk_tc.current_hp <= 0 or def_tc.current_hp <= 0:
        return {
          "success": False,
          "error": "Cannot attack with or target a fainted creature",
        }

      level = atk_tc.level

      # Apply Buffs
      atk_buff = cache.get(
        f"battle_{self._battle_id}_p_{attacker.id}_b_{atk_id}_buff_atk", 1.0
      )
      def_buff = cache.get(
        f"battle_{self._battle_id}_p_{defender.id}_b_{def_id}_buff_def", 1.0
      )
      has_choice_band = cache.get(
        f"battle_{self._battle_id}_p_{attacker.id}_b_{atk_id}_choice_band"
      )

      atk_stat = atk_tc.creature.attack * atk_buff
      if has_choice_band:
        atk_stat *= 1.5

      def_stat = def_tc.creature.defense * def_buff
      power = 50  # Default baseline power for basic attacks

      # Extract types
      atk_types = [atk_tc.creature.type_1.name]
      if atk_tc.creature.type_2:
        atk_types.append(atk_tc.creature.type_2.name)

      def_types = [def_tc.creature.type_1.name]
      if def_tc.creature.type_2:
        def_types.append(def_tc.creature.type_2.name)

      # Use the primary type of the Pokemon for its basic attack
      move_type = [atk_types[0]]

      # Fetch type multiplier
      multiplier = self._calculate_type_multiplier_sync(move_type, def_types)

      # Pokemon Damage Formula
      import random

      random_factor = random.uniform(0.85, 1.0)

      base_damage = (
        ((2 * level / 5 + 2) * power * (atk_stat / max(1, def_stat))) / 50
      ) + 2
      damage = int(
        base_damage * multiplier * random_factor * 1.5
      )  # x1.5 STAB bonus for using own type

      # Ensure at least 1 damage is dealt
      damage = max(1, damage)

      new_hp = def_tc.current_hp - damage

      # Item Effect: Focus Band
      new_hp = self._apply_focus_band_sync(defender, def_id, new_hp)

      def_tc.current_hp = max(0, new_hp)

      # Item Effect: Oran Berry
      self._apply_oran_berry_sync(defender, def_id, def_tc)

      def_tc.save()

      # Fresh query so bench HP reflects DB (avoids stale prefetch edge cases)
      all_fainted = not defender_team.team_creatures.filter(
        user_creature__current_hp__gt=0
      ).exists()

      forced_switch, new_defender_active_id = self._resolve_forced_switch_sync(
        defender_team,
        defender,
        def_tc,
        all_fainted,
      )

      return {
        "success": True,
        "damage": damage,
        "defender_active_id": def_tc.id,
        "defender_hp": def_tc.current_hp,
        "is_fainted": def_tc.current_hp <= 0,
        "all_fainted": all_fainted,
        "defender_user_id": defender.id,
        "forced_switch": forced_switch,
        "new_defender_active_id": new_defender_active_id,
      }
    except Exception as e:
      logger.error(f"Error applying damage: {e}")
      return {"success": False, "error": str(e)}

  def _get_active_creatures_sync(self, attacker: User, defender: User) -> dict:
    from user_profile.models import UserCreature

    atk_id = cache.get(f"battle_{self._battle_id}_p_{attacker.id}_active")
    def_id = cache.get(f"battle_{self._battle_id}_p_{defender.id}_active")

    if not atk_id or not def_id:
      return {"error": "Active creatures not set properly in cache"}

    atk_tc = UserCreature.objects.filter(id=atk_id, user=attacker).first()
    def_tc = UserCreature.objects.filter(id=def_id, user=defender).first()
    if not atk_tc or not def_tc:
      return {"error": "Active creatures not found in DB"}

    return {
      "atk_id": atk_id,
      "def_id": def_id,
      "atk_tc": atk_tc,
      "def_tc": def_tc,
    }

  def _apply_focus_band_sync(
    self,
    defender: User,
    def_id: int,
    new_hp: int,
  ) -> int:
    has_focus_band = cache.get(
      f"battle_{self._battle_id}_p_{defender.id}_b_{def_id}_focus_band"
    )
    if new_hp <= 0 and has_focus_band:
      cache.delete(
        f"battle_{self._battle_id}_p_{defender.id}_b_{def_id}_focus_band"
      )
      return 1
    return new_hp

  def _apply_oran_berry_sync(
    self,
    defender: User,
    def_id: int,
    def_tc,
  ) -> None:
    has_oran_berry = cache.get(
      f"battle_{self._battle_id}_p_{defender.id}_b_{def_id}_oran_berry"
    )
    if (
      def_tc.current_hp > 0
      and def_tc.current_hp < (def_tc.creature.hp / 2)
      and has_oran_berry
    ):
      def_tc.current_hp = min(def_tc.creature.hp, def_tc.current_hp + 10)
      cache.delete(
        f"battle_{self._battle_id}_p_{defender.id}_b_{def_id}_oran_berry"
      )

  def _resolve_forced_switch_sync(
    self,
    defender_team,
    defender: User,
    def_tc,
    all_fainted: bool,
  ) -> tuple[bool, int]:
    forced_switch = False
    new_defender_active_id = def_tc.id
    if def_tc.current_hp > 0 or all_fainted:
      return forced_switch, new_defender_active_id

    for tc in defender_team.team_creatures.select_related(
      "user_creature"
    ).order_by("id"):
      uc = tc.user_creature
      if uc.current_hp > 0:
        cache.set(
          f"battle_{self._battle_id}_p_{defender.id}_active",
          uc.id,
          timeout=3600,
        )
        new_defender_active_id = uc.id
        forced_switch = True
        break

    return forced_switch, new_defender_active_id

  @sync_to_async
  def _apply_item_effect(
    self, user: User, item_id: int, target_id: int | None = None
  ) -> dict:
    from inventory.models import InventoryItem

    try:
      # Verify item availability
      inv_item = (
        InventoryItem.objects.filter(id=item_id, inventory__user=user)
        .select_related("object")
        .first()
      )
      if not inv_item or inv_item.quantity <= 0:
        return {"success": False, "error": "Item not owned or out of stock"}

      obj = inv_item.object

      creature_result = self._resolve_item_target_sync(user, target_id)
      if creature_result.get("error"):
        return {"success": False, "error": creature_result["error"]}
      creature = creature_result["creature"]

      target_validation = self._validate_item_target_sync(
        obj.effect_type,
        creature,
      )
      if target_validation:
        return {"success": False, "error": target_validation}

      res = {
        "success": True,
        "item_name": obj.name,
        "creature_id": creature.id,
        "vfx_type": obj.vfx_type,
      }

      if not self._apply_item_effect_by_type_sync(user, creature, obj, res):
        return {
          "success": False,
          "error": "Item effect not implemented for battle yet",
        }

      self._consume_inventory_item_sync(inv_item)
      res["buffs"] = self._get_creature_buffs_snapshot_sync(user, creature.id)
      return res

    except Exception as e:
      logger.error(f"Error applying item effect: {e}")
      return {"success": False, "error": str(e)}

  def _resolve_item_target_sync(
    self,
    user: User,
    target_id: int | None,
  ) -> dict:
    from user_profile.models import UserCreature

    if target_id:
      creature = UserCreature.objects.filter(id=target_id, user=user).first()
      if not creature:
        return {"error": "Target creature not found"}
      return {"creature": creature}

    active_id = cache.get(f"battle_{self._battle_id}_p_{user.id}_active")
    if not active_id:
      return {"error": "No active creature to use item on"}

    creature = UserCreature.objects.filter(id=active_id, user=user).first()
    if not creature:
      return {"error": "Target creature not found"}

    return {"creature": creature}

  def _validate_item_target_sync(self, effect_type: str, creature) -> str | None:
    if effect_type != "REVIVE" and creature.current_hp <= 0:
      return "Cannot use this item on fainted creatures"

    if effect_type == "REVIVE" and creature.current_hp > 0:
      return "Cannot use revive on a conscious creature"

    return None

  def _apply_item_effect_by_type_sync(
    self,
    user: User,
    creature,
    obj,
    res: dict,
  ) -> bool:
    if obj.effect_type == "HEAL":
      old_hp = creature.current_hp
      creature.current_hp = min(
        creature.creature.hp,
        creature.current_hp + int(obj.effect_value),
      )
      creature.save()
      res["heal_amount"] = creature.current_hp - old_hp
      res["new_hp"] = creature.current_hp
      return True

    if obj.effect_type == "REVIVE":
      creature.current_hp = max(1, int(creature.creature.hp * obj.effect_value))
      creature.save()
      res["heal_amount"] = creature.current_hp
      res["new_hp"] = creature.current_hp
      return True

    if obj.effect_type == "AUTO_HEAL":
      cache.set(
        f"battle_{self._battle_id}_p_{user.id}_b_{creature.id}_oran_berry",
        True,
        timeout=7200,
      )
      return True

    if obj.effect_type == "EQUIP_ATK":
      cache.set(
        f"battle_{self._battle_id}_p_{user.id}_b_{creature.id}_choice_band",
        True,
        timeout=7200,
      )
      return True

    if obj.effect_type == "EQUIP_SURVIVE":
      cache.set(
        f"battle_{self._battle_id}_p_{user.id}_b_{creature.id}_focus_band",
        True,
        timeout=7200,
      )
      return True

    if obj.effect_type == "BUFF_ATK":
      current_buff = cache.get(
        f"battle_{self._battle_id}_p_{user.id}_b_{creature.id}_buff_atk",
        1.0,
      )
      cache.set(
        f"battle_{self._battle_id}_p_{user.id}_b_{creature.id}_buff_atk",
        current_buff + obj.effect_value,
        timeout=7200,
      )
      return True

    if obj.effect_type == "BUFF_DEF":
      current_buff = cache.get(
        f"battle_{self._battle_id}_p_{user.id}_b_{creature.id}_buff_def",
        1.0,
      )
      cache.set(
        f"battle_{self._battle_id}_p_{user.id}_b_{creature.id}_buff_def",
        current_buff + obj.effect_value,
        timeout=7200,
      )
      return True

    if obj.effect_type == "BUFF_SPEED":
      # X-Speed now freezes the opponent
      other_player = (
        self._battle.player2
        if user == self._battle.player1
        else self._battle.player1
      )
      cache.set(
        f"battle_{self._battle_id}_p_{other_player.id}_skip_turn",
        True,
        timeout=3600,
      )
      return True

    return False

  def _consume_inventory_item_sync(self, inv_item) -> None:
    inv_item.quantity -= 1
    if inv_item.quantity <= 0:
      inv_item.delete()
      return

    inv_item.save()

  def _get_creature_buffs_snapshot_sync(
    self,
    user: User,
    creature_id: int,
  ) -> dict:
    return {
      "atk": cache.get(
        f"battle_{self._battle_id}_p_{user.id}_b_{creature_id}_buff_atk",
        1.0,
      ),
      "def": cache.get(
        f"battle_{self._battle_id}_p_{user.id}_b_{creature_id}_buff_def",
        1.0,
      ),
      "has_choice": bool(
        cache.get(
          f"battle_{self._battle_id}_p_{user.id}_b_{creature_id}_choice_band"
        )
      ),
      "has_focus": bool(
        cache.get(
          f"battle_{self._battle_id}_p_{user.id}_b_{creature_id}_focus_band"
        )
      ),
      "has_oran": bool(
        cache.get(
          f"battle_{self._battle_id}_p_{user.id}_b_{creature_id}_oran_berry"
        )
      ),
    }

  @sync_to_async
  def _finalize_battle_sync(self, winner: User, loser: User) -> dict:
    """All-in-one sync method to update DB at victory to avoid async errors"""
    from .models import Battle

    try:
      # 1. Update status and winner
      self._battle.status = Battle.BattleStatus.FINISHED
      self._battle.winner = winner
      self._battle.save()

      # 2. Heal both teams
      from user_profile.models import Team

      for u in [winner, loser]:
        team = Team.objects.prefetch_related(
          "team_creatures__user_creature__creature"
        ).get(user=u)
        for tc in team.team_creatures.all():
          uc = tc.user_creature
          uc.current_hp = uc.creature.hp
          uc.save()

      # 3. Update ELO
      from user_profile.models import Ranking

      winner_ranking, _ = Ranking.objects.get_or_create(user=winner)
      loser_ranking, _ = Ranking.objects.get_or_create(user=loser)
      K, expected_winner = (
        32,
        1 / (1 + 10 ** ((loser_ranking.elo - winner_ranking.elo) / 400)),
      )
      winner_ranking.elo += int(K * (1 - expected_winner))
      loser_ranking.elo += int(K * (0 - (1 - expected_winner)))
      winner_ranking.wins += 1
      loser_ranking.losses += 1
      winner_ranking.save()
      loser_ranking.save()

      return {
        "success": True,
        "winner_id": winner.id,
        "winner_username": winner.username,
        "loser_id": loser.id,
        "loser_username": loser.username,
      }
    except Exception as e:
      logger.error(f"Error in _finalize_battle_sync: {e}")
      return {"success": False, "error": str(e)}

  async def _award_victory_normal(self, winner: User, loser: User) -> None:
    """Award normal victory (HP depletion)"""
    # Use the definitive sync helper for all DB actions
    result = await self._finalize_battle_sync(winner, loser)

    if result.get("success"):
      # Refresh local object
      await self._refresh_battle_sync()

      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_abandoned",
          "winner_id": result["winner_id"],
          "winner_username": result["winner_username"],
          "abandoned_player_id": result["loser_id"],
          "abandoned_username": result["loser_username"],
          "reason": "knockout",
        },
      )

      await self._broadcast_battle_state_to_group()

      await self._award_all_rewards(winner, loser)
      logger.info(
        "Battle {} ended by KO - Winner: {}",
        self._battle_id,
        result["winner_username"],
      )
    else:
      logger.error(f"Failed to finalize battle: {result.get('error')}")

  @sync_to_async
  def _heal_team_sync(self, user):
    """Heal all creatures of a user back to max HP"""
    from user_profile.models import Team

    try:
      team = Team.objects.prefetch_related(
        "team_creatures__user_creature__creature"
      ).get(user=user)
      for tc in team.team_creatures.all():
        uc = tc.user_creature
        uc.current_hp = uc.creature.hp
        uc.save()
    except Exception as e:
      logger.error(f"Error healing team for user {user.id}: {e}")

  @sync_to_async
  def _refresh_battle_sync(self):
    """Reload battle with FKs so async code never triggers lazy ORM queries."""
    from .models import Battle

    self._battle = Battle.objects.select_related(
      "player1",
      "player2",
      "winner",
      "current_turn",
    ).get(pk=self._battle.pk)

  async def _validate_action(self, payload: dict) -> bool:
    """Validate battle action"""
    # Refresh battle from DB to avoid cached status mismatch between instances
    await self._refresh_battle_sync()

    action = payload.get("action")
    if not action:
      await self.send_json({"type": "error", "message": "Action is required"})
      return False

    # Check if battle is in PLAYING state
    if self._battle.status != Battle.BattleStatus.PLAYING:
      await self.send_json(
        {"type": "error", "message": "Battle not in playing state"}
      )
      return False

    # Check if it's player's turn, EXCEPT if they are just swapping
    if action != "swap" and not await self._is_current_turn(self._user):
      await self.send_json({"type": "error", "message": "Not your turn"})
      return False

    return True

  @sync_to_async
  def _get_team_data(self, user):
    from user_profile.models import Profile, Team

    try:
      # Pre-fetch everything for the team to avoid lazy-loading issues in async
      team = (
        Team.objects.select_related("user")
        .prefetch_related(
          "team_creatures__user_creature__creature",
          "team_creatures__user_creature__creature__type_1",
          "team_creatures__user_creature__creature__type_2",
        )
        .get(user=user)
      )

      profile, _ = Profile.objects.get_or_create(user=user)
      team_data = []

      for tc in team.team_creatures.all():
        c = tc.user_creature
        team_data.append(
          {
            "id": c.id,
            "name": c.creature.name,
            "hp": c.current_hp,
            "max_hp": c.creature.hp,
            "level": c.level,
            "sprite": c.creature.front_sprite,
            "buffs": {
              "atk": cache.get(
                f"battle_{self._battle_id}_p_{user.id}_b_{c.id}_buff_atk", 1.0
              ),
              "def": cache.get(
                f"battle_{self._battle_id}_p_{user.id}_b_{c.id}_buff_def", 1.0
              ),
              "has_choice": bool(
                cache.get(
                  f"battle_{self._battle_id}_p_{user.id}_b_{c.id}_choice_band"
                )
              ),
              "has_focus": bool(
                cache.get(
                  f"battle_{self._battle_id}_p_{user.id}_b_{c.id}_focus_band"
                )
              ),
              "has_oran": bool(
                cache.get(
                  f"battle_{self._battle_id}_p_{user.id}_b_{c.id}_oran_berry"
                )
              ),
            },
          }
        )

      active_id = cache.get(f"battle_{self._battle_id}_p_{user.id}_active")

      # If no active in cache but team exists, default to first alive
      if not active_id and team_data:
        for c in team_data:
          if c["hp"] > 0:
            active_id = c["id"]
            break

      return {
        "team": team_data,
        "active_creature_id": active_id,
        "trainer_sprite": profile.trainer_sprite,
      }
    except Exception as e:
      logger.error(f"Error getting team data: {e}")
      return {"team": [], "active_creature_id": None, "trainer_sprite": ""}

  async def _send_battle_state(self) -> None:
    """Send current battle state to player"""
    try:
      p1_data = await self._get_team_data(self._battle.player1)
      p2_data = await self._get_team_data(self._battle.player2)

      await self.send_json(
        {
          "type": "battle_state",
          "battle_id": self._battle_id,
          "status": self._battle.status,
          "winner_id": self._battle.winner_id,
          "current_turn": self._battle.current_turn_id,
          "turn_number": self._battle.turn_number,
          "player1": {
            "id": self._battle.player1.id,
            "username": self._battle.player1.username,
            "team": p1_data["team"],
            "active_creature_id": p1_data["active_creature_id"],
            "trainer_sprite": p1_data["trainer_sprite"],
          },
          "player2": {
            "id": self._battle.player2.id,
            "username": self._battle.player2.username,
            "team": p2_data["team"],
            "active_creature_id": p2_data["active_creature_id"],
            "trainer_sprite": p2_data["trainer_sprite"],
          },
        }
      )
    except Exception as e:
      logger.error(f"Error sending battle state for {self._battle_id}: {e}")

  async def _broadcast_battle_state_to_group(self) -> None:
    """Push full battle_state to every client in the battle group."""
    try:
      await self._refresh_battle_sync()
      p1_data = await self._get_team_data(self._battle.player1)
      p2_data = await self._get_team_data(self._battle.player2)
      payload = {
        "type": "battle_state",
        "battle_id": self._battle_id,
        "status": self._battle.status,
        "winner_id": self._battle.winner_id,
        "current_turn": self._battle.current_turn_id,
        "turn_number": self._battle.turn_number,
        "player1": {
          "id": self._battle.player1.id,
          "username": self._battle.player1.username,
          "team": p1_data["team"],
          "active_creature_id": p1_data["active_creature_id"],
          "trainer_sprite": p1_data["trainer_sprite"],
        },
        "player2": {
          "id": self._battle.player2.id,
          "username": self._battle.player2.username,
          "team": p2_data["team"],
          "active_creature_id": p2_data["active_creature_id"],
          "trainer_sprite": p2_data["trainer_sprite"],
        },
      }
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {"type": "battle_state_broadcast", "payload": payload},
      )
    except Exception as e:
      logger.error(
        f"Error broadcasting battle state for {self._battle_id}: {e}"
      )

  async def _award_all_rewards(self, winner: User, loser: User) -> None:
    """Award rewards to both winner and loser"""
    try:
      # Award to winner
      winner_rewards = await sync_to_async(award_battle_rewards)(
        winner, count=50
      )
      # Award to loser
      loser_rewards = await sync_to_async(award_battle_rewards)(loser, count=50)

      # Broadcast to winner channel
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_rewards_assigned",
          "player_id": winner.id,
          "rewards": winner_rewards,
        },
      )

      # Broadcast to loser channel
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_rewards_assigned",
          "player_id": loser.id,
          "rewards": loser_rewards,
        },
      )

      logger.info(f"Rewards awarded for battle {self._battle_id}")

    except Exception as e:
      logger.error(f"Error awarding battle rewards: {e}")

  async def battle_rewards_assigned(self, event: dict) -> None:
    """Handle rewards assigned broadcast"""
    try:
      # Only send to the specific player if we want private rewards,
      # or broadcast to all if we want transparency.
      # The guide doesn't specify, so we broadcast but client filters.
      await self.send_json(
        {
          "type": "battle.rewards_assigned",
          "playerId": event["player_id"],
          "rewards": event["rewards"],
        }
      )
    except Exception as e:
      logger.error(f"Error handling battle_rewards_assigned event: {e}")

  async def send_json(self, payload: dict[str, Any]) -> None:
    """Send JSON response"""
    try:
      await self.send(text_data=json.dumps(payload))
    except Exception as e:
      logger.error(f"Error sending JSON response: {e}")

  # Channel message handlers
  async def battle_started(self, event: dict) -> None:
    """Handle battle started broadcast"""
    try:
      await self.send_json(
        {
          "type": "battle_started",
          "battle_id": event["battle_id"],
          "first_turn": event["first_turn"],
          "status": event["status"],
        }
      )
    except Exception as e:
      logger.error(f"Error handling battle_started event: {e}")

  async def battle_action(self, event: dict) -> None:
    """Handle battle action broadcast"""
    try:
      await self.send_json(
        {
          "type": "battle_action",
          "action": event["action"],
          "player_id": event["player_id"],
          "data": event["data"],
        }
      )
    except Exception as e:
      logger.error(f"Error handling battle_action event: {e}")

  async def turn_changed(self, event: dict) -> None:
    """Handle turn change broadcast"""
    try:
      await self.send_json(
        {
          "type": "turn_changed",
          "next_player_id": event["next_player_id"],
          "turn_number": event["turn_number"],
        }
      )
    except Exception as e:
      logger.error(f"Error handling turn_changed event: {e}")

  async def battle_state_broadcast(self, event: dict) -> None:
    """Forward full battle_state from group_send to this websocket."""
    try:
      await self.send_json(event["payload"])
    except Exception as e:
      logger.error(f"Error handling battle_state_broadcast: {e}")

  async def battle_abandoned(self, event: dict) -> None:
    """Handle battle abandonment broadcast"""
    try:
      await self.send_json(
        {
          "type": "battle_abandoned",
          "winner_id": event["winner_id"],
          "winner_username": event["winner_username"],
          "abandoned_player_id": event["abandoned_player_id"],
          "abandoned_username": event["abandoned_username"],
          "reason": event["reason"],
        }
      )
    except Exception as e:
      logger.error(f"Error handling battle_abandoned event: {e}")

  async def battle_draw(self, event: dict) -> None:
    """Handle battle draw broadcast"""
    try:
      await self.send_json({"type": "battle_draw", "reason": event["reason"]})
    except Exception as e:
      logger.error(f"Error handling battle_draw event: {e}")
