from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from core.payload_crypto import decrypt_json
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import transaction
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
    """Award victory to a player due to opponent abandonment with integrity validation.

    The disconnecting user (`self._user`) is always the loser. Do not use
    `_get_other_player()` for the loser: that returns the opponent of
    `self._user`, which is the winner and caused ELO to be applied twice to
    the same player (winner lost points, abandoner unchanged).
    """
    try:
      abandoner = self._user

      # Security: Validate abandonment scenario
      if not await self._validate_abandonment_scenario_async(winner, abandoner):
        logger.error(
          "Abandonment scenario validation failed battle_id={} winner={} abandoner={}",
          self._battle_id,
          winner.id,
          abandoner.id
        )
        await self.send_json({
          "type": "error",
          "message": "Invalid abandonment scenario detected"
        })
        return

      result = await self._finalize_battle_sync(
        winner, abandoner, abandonment=True
      )
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
      elif msg_type == "battle.abandon":
        await self._handle_manual_abandonment()
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

      # In simultaneous selection, there is no single 'first player' turn.
      # We set current_turn to None to indicate both players can act.
      await self._set_current_turn(None)

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
          "first_turn": None,
          "status": Battle.BattleStatus.PLAYING,
        },
      )

      # Force update of UI with the healed HP values
      await self._send_battle_state()

      logger.info(
        f"Battle {self._battle_id} started in simultaneous mode"
      )

    except Exception as e:
      logger.error(f"Error starting battle {self._battle_id}: {e}")
      await self.send_json(
        {"type": "error", "message": "Failed to start battle"}
      )

  async def _handle_battle_action(self, payload: dict) -> None:
    """Handle battle actions (attack, use item, etc.)"""
    try:
      enc = payload.get("data_encrypted")
      if enc:
        try:
          data = decrypt_json(enc)
        except ValueError:
          await self.send_json(
            {"type": "error", "message": "Invalid encrypted battle data"}
          )
          return
        if not isinstance(data, dict):
          await self.send_json(
            {"type": "error", "message": "Invalid encrypted battle data"}
          )
          return
        payload["data"] = data

      self._last_action_data = payload.get("data", {})

      if not await self._validate_action(payload):
        return

      # Queue the action in cache
      user_id = self._user.id
      action_type = payload.get("action")
      logger.info(f"Battle action '{action_type}' received from user {user_id} in battle {self._battle_id}")
      
      # Item use is special: it doesn't consume the turn and executes immediately
      if action_type == "use_item":
        await self._handle_use_item_action_internal(self._user, payload)
        await self._broadcast_battle_state_to_group()
        return # Do not set action cache or notify ready

      cache.set(f"battle_{self._battle_id}_p_{user_id}_action", payload, timeout=300)

      # If it's a swap, execute it immediately so the other player sees it
      if action_type == "swap":
        await self._handle_swap_action_internal(self._user, payload)
        await self._broadcast_battle_state_to_group()

      # Notify both that a player is ready
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "player_ready",
          "player_id": user_id,
        },
      )

      # Check if both players have submitted their actions
      p1 = self._battle.player1
      p2 = self._battle.player2
      
      a1 = cache.get(f"battle_{self._battle_id}_p_{p1.id}_action")
      a2 = cache.get(f"battle_{self._battle_id}_p_{p2.id}_action")

      logger.debug(f"Action cache status: P1({p1.id})={'READY' if a1 else 'WAITING'}, P2({p2.id})={'READY' if a2 else 'WAITING'}")

      if a1 and a2:
        logger.info(f"Both players ready in battle {self._battle_id}. Resolving turn...")
        # Both are ready, resolve the turn
        await self._resolve_turn_actions(a1, a2)
      else:
        # Just notify the sender that their action is registered
        await self.send_json({
          "type": "action_queued",
          "message": "Waiting for opponent to select their action..."
        })

    except Exception:
      logger.exception(
        "Error processing battle action battle_id={}",
        self._battle_id,
      )
      await self.send_json(
        {"type": "error", "message": "Failed to process action"}
      )

  async def _handle_manual_abandonment(self) -> None:
    """Handle manual surrender request"""
    await self._refresh_battle_sync()
    if self._battle.status == Battle.BattleStatus.PLAYING:
      other_player = self._battle.player2 if self._user == self._battle.player1 else self._battle.player1
      logger.info(f"Player {self._user.id} requested manual surrender in battle {self._battle_id}")
      await self._award_victory_by_abandonment(other_player)

  async def _resolve_turn_actions(self, a1: dict, a2: dict) -> None:
    """Resolve both players' actions based on priority and speed."""
    p1 = self._battle.player1
    p2 = self._battle.player2
    
    actions_list = [
      {"player": p1, "payload": a1},
      {"player": p2, "payload": a2},
    ]

    def get_priority(act):
      action_type = act["payload"].get("action")
      if action_type in ["swap", "forced_swap"]:
        return 100
      if action_type == "use_item":
        return 50
      return 10 # Attack

    # Get speeds for tie-breaking attacks (Sum of Creature Speed + Move Speed)
    s1 = await self._calculate_action_speed_async(p1, a1)
    s2 = await self._calculate_action_speed_async(p2, a2)

    # Sort actions: Priority first, then Speed
    actions_list.sort(
      key=lambda x: (
        get_priority(x), 
        s1 if x["player"] == p1 else s2
      ), 
      reverse=True
    )

    # Clear queued actions BEFORE resolution to avoid race conditions
    cache.delete(f"battle_{self._battle_id}_p_{p1.id}_action")
    cache.delete(f"battle_{self._battle_id}_p_{p2.id}_action")

    # BUG FIX #2: Snapshot active creature IDs BEFORE any action executes.
    # This prevents a newly swapped-in creature from inheriting an attack
    # that was queued by the fainted predecessor.
    snapshot_active = {
      p1.id: await self._get_active_creature_id(p1),
      p2.id: await self._get_active_creature_id(p2),
    }

    import asyncio
    for act in actions_list:
      player = act["player"]
      action_type = act["payload"].get("action")

      # Survival check: Validate that the ORIGINAL creature that queued the
      # action is still the active, conscious creature. If a forced_switch
      # happened due to the first attacker KO-ing it, the new creature must
      # NOT execute the dead creature's queued attack.
      if action_type == "attack":
        original_active_id = snapshot_active.get(player.id)
        current_active_id = await self._get_active_creature_id(player)
        if original_active_id != current_active_id:
          logger.info(
            f"Action skipped (phantom attack): Player {player.id}'s active creature "
            f"changed from {original_active_id} to {current_active_id}."
          )
          continue
        if not await self._is_specific_creature_alive(player, original_active_id):
          logger.info(f"Action skipped: Player {player.id} creature {original_active_id} is fainted.")
          continue

      await self._execute_resolved_action(player, act["payload"])

      # DRAMATIC PAUSE: Allow users to see the animation and damage result
      await asyncio.sleep(2.5)

      # Check if battle ended during resolution
      await self._refresh_battle_sync()
      if self._battle.status == Battle.BattleStatus.FINISHED:
        break

    # End of turn processing
    if self._battle.status == Battle.BattleStatus.PLAYING:
      await self._set_current_turn(None)
      await self._increment_turn_number()
      await self._apply_end_of_turn_statuses()
      await self._broadcast_battle_state_to_group()

  async def _execute_resolved_action(self, player: User, payload: dict) -> None:
    """Execute a single action for a specific player."""
    action = payload.get("action")
    self._last_action_data = payload.get("data", {}) # For legacy handlers

    if action == "attack":
      await self._handle_attack_action_internal(player)
    elif action == "use_item":
      await self._handle_use_item_action_internal(player, payload)
    elif action in ["swap", "forced_swap"]:
      await self._handle_swap_action_internal(player, payload)

  async def _handle_attack_action_internal(self, attacker: User) -> None:
    # Identify defender
    defender = self._battle.player2 if attacker == self._battle.player1 else self._battle.player1
    data = getattr(self, "_last_action_data", {})
    move_id = data.get("move_id")

    skip_flag = cache.get(f"battle_{self._battle_id}_p_{attacker.id}_skip_turn")
    if skip_flag:
      cache.delete(f"battle_{self._battle_id}_p_{attacker.id}_skip_turn")
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_action",
          "action": "skip_turn",
          "player_id": attacker.id,
          "data": {
            "message": f"{attacker.username} is unable to move!",
          },
        },
      )
      return

    move = await self._get_move_for_attack_sync(attacker, move_id)
    if not move:
      return

    result = await self._apply_damage(attacker, defender, move)
    if result and result.get("success"):
      payload = {
        "damage": result["damage"],
        "defender_active_id": result["defender_active_id"],
        "defender_hp": result["defender_hp"],
        "is_fainted": result["is_fainted"],
        "defender_user_id": result["defender_user_id"],
        "forced_switch": result["forced_switch"],
        "new_defender_active_id": result["new_defender_active_id"],
        "move_name": move.name,
        "move_type_name": move.move_type.name if move.move_type else None,
        "special_ability_triggered": result.get("special_ability_triggered", False),
        "special_ability_name": result.get("special_ability_name"),
        "special_ability_effect": result.get("special_ability_effect"),
      }
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_action",
          "action": "attack",
          "player_id": attacker.id,
          "data": payload,
        },
      )

      if result.get("all_fainted"):
        await self._award_victory_normal(attacker, defender)

  async def _handle_use_item_action_internal(self, player: User, payload: dict) -> None:
    item_id = payload.get("data", {}).get("item_id")
    target_id = payload.get("data", {}).get("target_id")
    if not item_id:
      return

    result = await self._apply_item_effect(player, item_id, target_id)
    if result.get("success"):
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_action",
          "action": "use_item",
          "player_id": player.id,
          "data": result,
        },
      )

  async def _handle_swap_action_internal(self, player: User, payload: dict) -> None:
    try:
      data = payload.get("data", {})
      creature_id = data.get("creature_id")
      if not creature_id:
        return

      success = await self._cache_active_creature(player, creature_id)
      if success:
        # Get creature name for logging
        from user_profile.models import UserCreature
        uc = await self._get_user_creature_async(creature_id)
        creature_name = uc.creature.name if uc else "Unknown"

        await self.channel_layer.group_send(
          f"battle_{self._battle_id}",
          {
            "type": "battle_action",
            "action": "swap",
            "player_id": player.id,
            "data": {
              "creature_id": creature_id,
              "creature_name": creature_name
            },
          },
        )
    except Exception as e:
      logger.error(f"Error handling swap action for player {player.id}: {e}")

  async def _calculate_action_speed_async(self, player, action_payload) -> int:
    """Calculate the final speed for an action (Pokemon Speed + Move Speed if applicable)"""
    base_speed = await self._get_creature_speed_sync(player)
    
    action_type = action_payload.get("action")
    if action_type == "attack":
        # Extract move_id from payload
        move_id = action_payload.get("data", {}).get("move_id")
        if move_id:
            move_speed = await self._get_move_speed_sync(move_id)
            return base_speed + move_speed
            
    return base_speed

  @sync_to_async
  def _get_move_speed_sync(self, move_id: int) -> int:
    from creatures.models import Ability
    move = Ability.objects.filter(id=move_id).only("speed").first()
    return move.speed if move else 0

  @sync_to_async
  def _get_creature_speed_sync(self, user: User) -> int:
    from user_profile.models import UserCreature
    active_id = cache.get(f"battle_{self._battle_id}_p_{user.id}_active")
    if not active_id:
      return 0
    tc = UserCreature.objects.filter(id=active_id, user=user).first()
    return tc.creature.speed if tc else 0

  @sync_to_async
  def _is_active_creature_alive(self, user: User) -> bool:
    from user_profile.models import UserCreature
    active_id = cache.get(f"battle_{self._battle_id}_p_{user.id}_active")
    if not active_id:
      return False
    tc = UserCreature.objects.filter(id=active_id, user=user).first()
    return tc and tc.current_hp > 0

  async def _get_active_creature_id(self, user: User) -> int | None:
    """Return the cached active creature ID for the given player (no DB hit)."""
    return cache.get(f"battle_{self._battle_id}_p_{user.id}_active")

  @sync_to_async
  def _is_specific_creature_alive(self, user: User, creature_id: int | None) -> bool:
    """Check if a SPECIFIC creature (by ID) is still alive. Used after snapshot."""
    if not creature_id:
      return False
    from user_profile.models import UserCreature
    tc = UserCreature.objects.filter(id=creature_id, user=user).first()
    return bool(tc and tc.current_hp > 0)

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

  async def _advance_turn(self) -> None:
    """Advance to the next player's turn. Called internally after attack/item/swap."""
    try:
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
      await self._apply_end_of_turn_statuses()

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
      logger.error(f"Error advancing turn in battle {self._battle_id}: {e}")

  async def _handle_end_turn(self) -> None:
    """End turn handler (deprecated for simultaneous selection)"""
    pass

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
  def _apply_damage(self, attacker: User, defender: User, move) -> dict:
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
      power = move.base_power + atk_tc.creature.attack

      # Extract types
      atk_types = [atk_tc.creature.type_1.name]
      if atk_tc.creature.type_2:
        atk_types.append(atk_tc.creature.type_2.name)

      def_types = [def_tc.creature.type_1.name]
      if def_tc.creature.type_2:
        def_types.append(def_tc.creature.type_2.name)

      move_type = [move.move_type.name] if move.move_type else atk_types
      multiplier = self._calculate_type_multiplier_sync(move_type, def_types)
      stab = 1.5 if move.move_type and move.move_type.name in atk_types else 1.0

      import random
      random_factor = random.uniform(0.90, 1.0)

      raw_damage = max(1, power - def_stat)
      damage = int(raw_damage * multiplier * move.damage_multiplier * stab * random_factor)
      damage = max(1, damage)

      new_hp = def_tc.current_hp - damage

      # Item Effect: Focus Band
      new_hp = self._apply_focus_band_sync(defender, def_id, new_hp)

      def_tc.current_hp = max(0, new_hp)

      # Item Effect: Oran Berry
      self._apply_oran_berry_sync(defender, def_id, def_tc)

      def_tc.save()

      move_effect_result = self._apply_move_effect_sync(
        move, attacker, defender, atk_tc, def_tc
      )
      special_result = self._evaluate_special_ability_sync(def_tc.creature, attacker, atk_tc)
      if special_result.get("status") == "paralyzed":
        cache.set(
          f"battle_{self._battle_id}_p_{attacker.id}_skip_turn",
          True,
          timeout=3600,
        )

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
        "move_effect_triggered": move_effect_result.get("triggered", False),
        "move_effect_name": move_effect_result.get("effect"),
        "move_effect_details": move_effect_result.get("details"),
        "special_ability_triggered": special_result.get("triggered", False),
        "special_ability_name": special_result.get("name"),
        "special_ability_effect": special_result.get("effect"),
      }
    except Exception as e:
      logger.error(f"Error applying damage: {e}")
      return {"success": False, "error": str(e)}

  @sync_to_async
  def _get_move_for_attack_sync(self, attacker: User, move_id: int | None):
    from creatures.models import CreatureAbility
    from user_profile.models import Team

    active_id = cache.get(f"battle_{self._battle_id}_p_{attacker.id}_active")

    # Fallback: find first alive creature in team if cache is empty
    if not active_id:
      try:
        team = Team.objects.get(user=attacker)
        for tc in team.team_creatures.all():
          if tc.user_creature.current_hp > 0:
            active_id = tc.user_creature.id
            cache.set(
              f"battle_{self._battle_id}_p_{attacker.id}_active",
              active_id,
              timeout=3600,
            )
            break
      except Exception:
        pass

    if not active_id:
      return None

    query = CreatureAbility.objects.filter(
      creature__usercreature__id=active_id
    ).select_related("ability__move_type")

    if move_id is None:
      first = query.first()
      return first.ability if first else None

    ability_relation = query.filter(ability_id=move_id).first()
    return ability_relation.ability if ability_relation else None

  def _evaluate_special_ability_sync(self, defender_creature, attacker: User, atk_tc) -> dict:
    import random

    special_name = defender_creature.special_ability_name
    special_effect = defender_creature.special_ability_effect.lower()
    probability = defender_creature.special_ability_probability

    if not special_name or not special_effect or probability <= 0:
      return {"triggered": False}

    if random.random() > probability:
      return {"triggered": False}

    result = {
      "triggered": True,
      "name": special_name,
      "effect": special_effect,
      "status": special_effect,
    }

    if special_effect == "paralyze":
      cache.set(
        f"battle_{self._battle_id}_p_{attacker.id}_skip_turn",
        True,
        timeout=3600,
      )
    elif special_effect == "burn":
      cache.set(
        f"battle_{self._battle_id}_p_{attacker.id}_burned",
        True,
        timeout=3600,
      )
    elif special_effect == "freeze":
      cache.set(
        f"battle_{self._battle_id}_p_{attacker.id}_skip_turn",
        True,
        timeout=3600,
      )

    return result

  def _apply_move_effect_sync(self, move, attacker: User, defender: User, atk_tc, def_tc) -> dict:
    import random

    if not move.effect or move.effect_probability <= 0:
      return {"triggered": False}

    if random.random() > move.effect_probability:
      return {"triggered": False}

    effect = move.effect.lower()
    result = {"triggered": True, "effect": effect, "details": ""}

    if effect == "burn":
      cache.set(
        f"battle_{self._battle_id}_p_{defender.id}_burned",
        True,
        timeout=3600,
      )
      result["details"] = "Burn applied: damage each turn"
    elif effect == "poison":
      cache.set(
        f"battle_{self._battle_id}_p_{defender.id}_poisoned",
        True,
        timeout=3600,
      )
      result["details"] = "Poison applied: damage each turn"
    elif effect in {"paralyze", "freeze", "sleep"}:
      cache.set(
        f"battle_{self._battle_id}_p_{defender.id}_skip_turn",
        True,
        timeout=3600,
      )
      result["details"] = f"{effect.capitalize()} applied: defender may miss next turn"
    elif effect == "heal":
      heal_amount = max(1, int(atk_tc.creature.hp * 0.25))
      atk_tc.current_hp = min(atk_tc.creature.hp, atk_tc.current_hp + heal_amount)
      atk_tc.save()
      result["details"] = f"Healed {heal_amount} HP"
    elif effect == "buff_atk":
      cache.set(
        f"battle_{self._battle_id}_p_{attacker.id}_b_{atk_tc.id}_buff_atk",
        1.2,
        timeout=3600,
      )
      result["details"] = "Attack boosted by 20%"
    elif effect == "debuff_def":
      cache.set(
        f"battle_{self._battle_id}_p_{defender.id}_b_{def_tc.id}_buff_def",
        0.8,
        timeout=3600,
      )
      result["details"] = "Defense reduced by 20%"
    else:
      result["details"] = "Effect applied"

    return result

  async def _apply_end_of_turn_statuses(self) -> None:
    for user in [self._battle.player1, self._battle.player2]:
      status_result = await self._apply_end_of_turn_statuses_sync(user)
      if status_result.get("damage"):
        await self.channel_layer.group_send(
          f"battle_{self._battle_id}",
          {
            "type": "battle_action",
            "action": "status_tick",
            "player_id": status_result["user_id"],
            "data": {
              "creature_id": status_result["creature_id"],
              "damage": status_result["damage"],
              "current_hp": status_result["current_hp"],
              "status": status_result["status"],
            },
          },
        )

  @sync_to_async
  def _apply_end_of_turn_statuses_sync(self, user: User) -> dict:
    from user_profile.models import UserCreature

    active_id = cache.get(f"battle_{self._battle_id}_p_{user.id}_active")
    if not active_id:
      return {}

    tc = UserCreature.objects.filter(id=active_id, user=user).first()
    if not tc or tc.current_hp <= 0:
      return {}

    damage = 0
    status = None
    if cache.get(f"battle_{self._battle_id}_p_{user.id}_burned"):
      damage += max(1, int(tc.creature.hp * 0.08))
      status = "burned"
    if cache.get(f"battle_{self._battle_id}_p_{user.id}_poisoned"):
      damage += max(1, int(tc.creature.hp * 0.06))
      status = status or "poisoned"

    if damage <= 0:
      return {}

    tc.current_hp = max(0, tc.current_hp - damage)
    tc.save()

    return {
      "creature_id": tc.id,
      "user_id": user.id,
      "damage": damage,
      "current_hp": tc.current_hp,
      "status": status,
    }

  def _get_active_creatures_sync(self, attacker: User, defender: User) -> dict:
    from user_profile.models import Team, UserCreature

    def _resolve_active(user):
      """Get active creature id from cache, or fall back to first alive in team."""
      active_id = cache.get(f"battle_{self._battle_id}_p_{user.id}_active")
      if active_id:
        return active_id
      # Fallback: pick first alive creature and prime the cache
      try:
        team = Team.objects.get(user=user)
        for tc in team.team_creatures.all():
          if tc.user_creature.current_hp > 0:
            active_id = tc.user_creature.id
            cache.set(
              f"battle_{self._battle_id}_p_{user.id}_active",
              active_id,
              timeout=3600,
            )
            return active_id
      except Exception:
        pass
      return None

    atk_id = _resolve_active(attacker)
    def_id = _resolve_active(defender)

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

  async def _get_team_async(self, user: User):
    from user_profile.models import Team
    return await sync_to_async(Team.objects.get)(user=user)

  async def _get_user_creature_async(self, creature_id: int):
    from user_profile.models import UserCreature
    return await sync_to_async(UserCreature.objects.select_related("creature").get)(id=creature_id)

  async def _refresh_user_creature_async(self, user_creature):
    return await sync_to_async(user_creature.refresh_from_db)()

  def _get_team_sync(self, user: User):
    from user_profile.models import Team

    return Team.objects.prefetch_related("team_creatures__user_creature").get(user=user)

  def _get_alive_creature_ids(self, team) -> list[int]:
    return [
      tc.user_creature.id
      for tc in team.team_creatures.all()
      if tc.user_creature.current_hp > 0
    ]

  def _get_participant_validation_reason(
    self, winner: User, loser: User
  ) -> str | None:
    if self._battle.player1 not in [winner, loser] or self._battle.player2 not in [winner, loser]:
      return "Winner/loser not matching battle participants"
    return None

  @sync_to_async
  @transaction.atomic
  def _finalize_battle_sync(
    self, winner: User, loser: User, *, abandonment: bool = False
  ) -> dict:
    """All-in-one sync method to update DB at victory to avoid async errors"""
    from .models import Battle

    try:
      # 0. Security: Validate battle integrity before finalizing
      integrity_check = self._validate_battle_integrity_sync(
        winner, loser, abandonment=abandonment
      )
      if not integrity_check["valid"]:
        logger.error(
          "Battle integrity check failed battle_id={} reason={}",
          self._battle_id,
          integrity_check["reason"]
        )
        return {"success": False, "error": f"Battle integrity validation failed: {integrity_check['reason']}"}

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

      # 3. Update ELO with security validations
      from user_profile.models import Ranking

      winner_ranking, _ = Ranking.objects.get_or_create(user=winner)
      loser_ranking, _ = Ranking.objects.get_or_create(user=loser)

      K, expected_winner = (
        32,
        1 / (1 + 10 ** ((loser_ranking.elo - winner_ranking.elo) / 400)),
      )

      winner_elo_change = int(K * (1 - expected_winner))
      loser_elo_change = int(K * (0 - (1 - expected_winner)))

      # Security: Validate reasonable ELO changes
      if abs(winner_elo_change) > 50 or abs(loser_elo_change) > 50:
        logger.warning(
          "Unusual ELO change detected battle_id={} winner_change={} loser_change={}",
          self._battle_id,
          winner_elo_change,
          loser_elo_change
        )

      winner_ranking.elo += winner_elo_change
      loser_ranking.elo += loser_elo_change
      winner_ranking.wins += 1
      loser_ranking.losses += 1
      winner_ranking.save()
      loser_ranking.save()

      # Security: Audit log for ranking changes
      logger.info(
        "Ranking updated battle_id={} winner_id={} winner_elo_change={} loser_id={} loser_elo_change={}",
        self._battle_id,
        winner.id,
        winner_elo_change,
        loser.id,
        loser_elo_change
      )

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

  def _validate_battle_integrity_sync(
    self, winner: User, loser: User, *, abandonment: bool = False
  ) -> dict:
    """
    Security: Complete battle integrity validation before ranking updates.
    Verifies that the battle ended legitimately and all conditions are met.

    For knockout victories, the loser must have no HP remaining. Abandonment
    forfeits without KO, so HP-based checks are skipped when abandonment=True.
    """
    from user_profile.models import Team

    try:
      if self._battle.status not in [
        Battle.BattleStatus.PLAYING,
        Battle.BattleStatus.WAITING,
        "matched",
      ]:
        return {"valid": False, "reason": f"Invalid battle status: {self._battle.status}"}

      try:
        winner_team = self._get_team_sync(winner)
        loser_team = self._get_team_sync(loser)
      except Team.DoesNotExist:
        return {"valid": False, "reason": "Missing team for one or both players"}

      winner_alive_creatures = self._get_alive_creature_ids(winner_team)
      loser_alive_creatures = self._get_alive_creature_ids(loser_team)

      if not abandonment:
        if loser_alive_creatures:
          return {
            "valid": False,
            "reason": f"Loser has {len(loser_alive_creatures)} alive creatures: {loser_alive_creatures}",
          }
        if not winner_alive_creatures:
          return {"valid": False, "reason": "Winner has no alive creatures"}

      participant_reason = self._get_participant_validation_reason(winner, loser)
      if participant_reason:
        return {"valid": False, "reason": participant_reason}

      total_creatures_winner = winner_team.team_creatures.count()
      total_creatures_loser = loser_team.team_creatures.count()

      if total_creatures_winner == 0 or total_creatures_loser == 0:
        return {"valid": False, "reason": "One or both teams have no creatures"}

      logger.info(
        "Battle integrity validated battle_id={} winner={} loser={} winner_alive={} loser_alive={}",
        self._battle_id,
        winner.id,
        loser.id,
        len(winner_alive_creatures),
        len(loser_alive_creatures),
      )

      return {"valid": True, "reason": "All integrity checks passed"}

    except Exception as e:
      logger.error(f"Error in battle integrity validation: {e}")
      return {"valid": False, "reason": f"Validation error: {str(e)}"}

  async def _verify_victory_conditions_async(self, winner: User, loser: User) -> bool:
    """
    Security: Async verification that victory conditions are legitimately met.
    Double-checks that loser team is completely defeated.
    """
    try:

      # Get loser team with current creature data
      loser_team = await self._get_team_async(loser)
      if not loser_team:
        return False

      # Verify all loser creatures have HP = 0
      all_fainted = True
      fainted_creatures = []

      for tc in loser_team.team_creatures.all():
        await self._refresh_user_creature_async(tc.user_creature)
        if tc.user_creature.current_hp > 0:
          all_fainted = False
          fainted_creatures.append({
            "id": tc.user_creature.id,
            "name": tc.user_creature.creature.name,
            "hp": tc.user_creature.current_hp
          })

      if not all_fainted:
        logger.warning(
          "Victory validation failed - loser has alive creatures battle_id={} creatures={}",
          self._battle_id,
          fainted_creatures
        )
        return False

      # Verify winner has at least one alive creature
      winner_team = await self._get_team_async(winner)
      if not winner_team:
        return False

      winner_has_alive = False
      for tc in winner_team.team_creatures.all():
        await self._refresh_user_creature_async(tc.user_creature)
        if tc.user_creature.current_hp > 0:
          winner_has_alive = True
          break

      if not winner_has_alive:
        logger.warning(
          "Victory validation failed - winner has no alive creatures battle_id={}",
          self._battle_id
        )
        return False

      logger.info(
        "Victory conditions verified battle_id={} winner={} loser={}",
        self._battle_id,
        winner.id,
        loser.id
      )

      return True

    except Exception as e:
      logger.error(f"Error in victory conditions verification: {e}")
      return False

  async def _get_team_async(self, user: User):
    """Get team with async support"""
    try:
      from user_profile.models import Team
      return await Team.objects.prefetch_related("team_creatures__user_creature").aget(user=user)
    except Team.DoesNotExist:
      return None

  async def _refresh_user_creature_async(self, user_creature):
    """Refresh user_creature from database"""
    try:
      from user_profile.models import UserCreature
      fresh = await UserCreature.objects.aget(id=user_creature.id)
      user_creature.current_hp = fresh.current_hp
      user_creature.level = fresh.level
    except UserCreature.DoesNotExist:
      pass

  async def _validate_abandonment_scenario_async(self, winner: User, abandoner: User) -> bool:
    """
    Security: Validate that abandonment scenario is legitimate.
    Ensures battle is in proper state and participants are correct.
    """
    try:
      # 1. Verify battle is in active state
      if self._battle.status != Battle.BattleStatus.PLAYING:
        logger.warning(
          "Abandonment validation failed - battle not in PLAYING status battle_id={} status={}",
          self._battle_id,
          self._battle.status
        )
        return False

      # 2. Verify participants match battle
      if self._battle.player1 not in [winner, abandoner] or self._battle.player2 not in [winner, abandoner]:
        logger.warning(
          "Abandonment validation failed - participants mismatch battle_id={} winner={} abandoner={} player1={} player2={}",
          self._battle_id,
          winner.id,
          abandoner.id,
          self._battle.player1.id,
          self._battle.player2.id
        )
        return False

      # 3. Verify both teams exist and have creatures
      winner_team = await self._get_team_async(winner)
      abandoner_team = await self._get_team_async(abandoner)

      if not winner_team or not abandoner_team:
        logger.warning(
          "Abandonment validation failed - missing teams battle_id={} winner_team={} abandoner_team={}",
          self._battle_id,
          bool(winner_team),
          bool(abandoner_team)
        )
        return False

      if winner_team.team_creatures.count() == 0 or abandoner_team.team_creatures.count() == 0:
        logger.warning(
          "Abandonment validation failed - empty teams battle_id={} winner_creatures={} abandoner_creatures={}",
          self._battle_id,
          winner_team.team_creatures.count(),
          abandoner_team.team_creatures.count()
        )
        return False

      # 4. Verify abandoner is actually the disconnecting user
      if abandoner != self._user:
        logger.warning(
          "Abandonment validation failed - abandoner mismatch battle_id={} expected={} actual={}",
          self._battle_id,
          self._user.id,
          abandoner.id
        )
        return False

      logger.info(
        "Abandonment scenario validated battle_id={} winner={} abandoner={}",
        self._battle_id,
        winner.id,
        abandoner.id
      )

      return True

    except Exception as e:
      logger.error(f"Error in abandonment scenario validation: {e}")
      return False

  async def _award_victory_normal(self, winner: User, loser: User) -> None:
    """Award normal victory (HP depletion) with integrity validation"""
    # Security: Additional validation before awarding victory
    if not await self._verify_victory_conditions_async(winner, loser):
      logger.error(
        "Victory conditions validation failed battle_id={} winner={} loser={}",
        self._battle_id,
        winner.id,
        loser.id
      )
      await self.send_json({
        "type": "error",
        "message": "Invalid victory conditions detected"
      })
      return

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
    await self._refresh_battle_sync()

    action = payload.get("action")
    if not action:
      await self.send_json({"type": "error", "message": "Action is required"})
      return False

    # Check if battle is in PLAYING state
    if self._battle.status != Battle.BattleStatus.PLAYING:
      await self.send_json(
        {"type": "error", "message": f"Battle not in playing state (current: {self._battle.status})"}
      )
      return False

    # Prevent double submission
    if cache.get(f"battle_{self._battle_id}_p_{self._user.id}_action"):
      await self.send_json(
        {"type": "error", "message": "Action already selected for this turn"}
      )
      return False

    # If current_turn is set to a specific player, only they can act (e.g. forced swap)
    # If it is None, both can act (simultaneous selection)
    if self._battle.current_turn_id is not None and self._battle.current_turn_id != self._user.id:
      await self.send_json(
        {"type": "error", "message": f"It is not your turn (current: {self._battle.current_turn_id})"}
      )
      return False

    return True


  def _get_team_data_sync(self, user):
    from creatures.models import CreatureAbility
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
        moves = []
        creature_moves = CreatureAbility.objects.filter(
          creature=c.creature
        ).select_related("ability__move_type")
        for ca in creature_moves:
          ability = ca.ability
          if ability:
            moves.append(
              {
                "id": ability.id,
                "name": ability.name,
                "base_power": ability.base_power,
                "speed": ability.speed,
                "move_type_name": ability.move_type.name if ability.move_type else None,
                "damage_multiplier": ability.damage_multiplier,
                "effect": ability.effect,
                "effect_probability": ability.effect_probability,
                "vfx_type": ability.vfx_type,
              }
            )

        team_data.append(
          {
            "id": c.id,
            "name": c.creature.name,
            "hp": c.current_hp,
            "max_hp": c.creature.hp,
            "speed": c.creature.speed,
            "level": c.level,
            "sprite": c.creature.front_sprite,
            "back_sprite": c.creature.back_sprite,
            "type_1_name": c.creature.type_1.name if c.creature.type_1 else None,
            "type_2_name": c.creature.type_2.name if c.creature.type_2 else None,
            "moves": moves,
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

  @sync_to_async
  def _get_battle_state_payload_sync(self):
    self._refresh_battle_sync.__wrapped__(self)
    p1_data = self._get_team_data_sync(self._battle.player1)
    p2_data = self._get_team_data_sync(self._battle.player2)
    return {
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

  async def _send_battle_state(self) -> None:
    """Send current battle state to player"""
    try:
      payload = await self._get_battle_state_payload_sync()
      await self.send_json(payload)
    except Exception as e:
      logger.error(f"Error sending battle state for {self._battle_id}: {e}")

  async def _broadcast_battle_state_to_group(self) -> None:
    """Push full battle_state to every client in the battle group."""
    try:
      payload = await self._get_battle_state_payload_sync()
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

  async def player_ready(self, event: dict) -> None:
    """Forward player_ready notification to this websocket."""
    try:
      await self.send_json(event)
    except Exception as e:
      logger.error(f"Error handling player_ready event: {e}")

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
