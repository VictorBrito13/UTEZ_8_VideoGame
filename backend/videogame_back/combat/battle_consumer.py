from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from .models import Battle

# Configure logging for battle consumer
logger = logging.getLogger(__name__)


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
        logger.error(f"Invalid battle_id in URL: {e}")
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

    except Exception as e:
      logger.error(
        f"Unexpected error in connect for user {getattr(self._user, 'id', 'unknown')}: {e}"
      )
      await self.close(code=4500)

  async def disconnect(self, code: int) -> None:
    """Handle WebSocket disconnection with abandonment detection"""
    try:
      if self._battle_id and self._user and self._battle:
        logger.info(
          f"User {self._user.id} disconnected from battle {self._battle_id} with code {code}"
        )

        # Check if this is an abandonment scenario
        await self._handle_potential_abandonment(code)

        # Remove from battle group
        await self.channel_layer.group_discard(
          f"battle_{self._battle_id}", self.channel_name
        )

      else:
        logger.info(f"Disconnected without proper battle context")

    except Exception as e:
      logger.error(f"Error in disconnect for battle {self._battle_id}: {e}")

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
          f"Player {self._user.id} abandoned, other player {other_player.id} wins"
        )
        await self._award_victory_by_abandonment(other_player)

    except Exception as e:
      logger.error(
        f"Error handling abandonment in battle {self._battle_id}: {e}"
      )

  async def _is_player_connected(self, player: User) -> bool:
    """Check if a player is still connected to the battle"""
    try:
      # Get current connections in the battle group
      group_name = f"battle_{self._battle_id}"

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
    """Award victory to a player due to opponent abandonment"""
    try:
      # Update battle status
      await self._update_battle_status(Battle.BattleStatus.FINISHED)
      await self._set_battle_winner(winner)

      # Update ELO ratings
      loser = await self._get_other_player()
      if loser:
        await self._update_elo_ratings(winner, loser)

      # Broadcast abandonment result
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_abandoned",
          "winner_id": winner.id,
          "winner_username": winner.username,
          "abandoned_player_id": self._user.id,
          "abandoned_username": self._user.username,
          "reason": "abandonment",
        },
      )

      logger.info(
        f"Battle {self._battle_id} ended by abandonment - Winner: {winner.username}"
      )

    except Exception as e:
      logger.error(f"Error awarding victory by abandonment: {e}")

  async def _end_battle_draw(self) -> None:
    """End battle in draw (both players disconnected)"""
    try:
      await self._update_battle_status(Battle.BattleStatus.FINISHED)
      # No winner for draw
      await self._set_battle_winner(None)

      # Broadcast draw result
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {"type": "battle_draw", "reason": "both_disconnected"},
      )

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
      await self.send_json({"type": "error", "message": "Invalid JSON format"})
      return

    msg_type = payload.get("type")

    try:
      # Route message to appropriate handler
      if msg_type == "battle.start":
        await self._handle_start_battle()
      elif msg_type == "battle.action":
        await self._handle_battle_action(payload)
      elif msg_type == "battle.end_turn":
        await self._handle_end_turn()
      else:
        await self.send_json(
          {"type": "error", "message": "Unknown message type"}
        )
    except Exception as e:
      logger.error(
        f"Error handling message type {msg_type} in battle {self._battle_id}: {e}"
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

      # Broadcast battle start to all players
      await self.channel_layer.group_send(
        f"battle_{self._battle_id}",
        {
          "type": "battle_started",
          "battle_id": self._battle_id,
          "first_turn": first_player.id,
          "status": Battle.BattleStatus.PLAYING,
        },
      )
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

      # Process action logic will go here
      # For now, just broadcast the action
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
        f"Battle action {payload.get('action')} by user {self._user.id} in battle {self._battle_id}"
      )

    except Exception as e:
      logger.error(f"Error processing battle action in {self._battle_id}: {e}")
      await self.send_json(
        {"type": "error", "message": "Failed to process action"}
      )

  async def _handle_end_turn(self) -> None:
    """Handle turn end request"""
    try:
      if not await self._is_current_turn(self._user):
        await self.send_json({"type": "error", "message": "Not your turn"})
        return

      # Switch to other player
      next_player = await self._get_next_player()
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
    return self._battle.status == Battle.BattleStatus.WAITING

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
  def _update_elo_ratings(self, winner: User, loser: User) -> None:
    """Update ELO ratings after battle"""
    try:
      from user_profile.models import Ranking

      # Get or create rankings
      winner_ranking, _ = Ranking.objects.get_or_create(user=winner)
      loser_ranking, _ = Ranking.objects.get_or_create(user=loser)

      # Calculate ELO changes
      K = 32  # K-factor for ELO calculation
      expected_winner = 1 / (
        1 + 10 ** ((loser_ranking.elo - winner_ranking.elo) / 400)
      )
      expected_loser = 1 - expected_winner

      # Update ELO
      winner_ranking.elo += int(K * (1 - expected_winner))
      loser_ranking.elo += int(K * (0 - expected_loser))

      # Update win/loss records
      winner_ranking.wins += 1
      loser_ranking.losses += 1

      # Save rankings
      winner_ranking.save()
      loser_ranking.save()

      logger.info(
        f"ELO Updated - {winner.username}: {winner_ranking.elo}, {loser.username}: {loser_ranking.elo}"
      )

    except Exception as e:
      logger.error(f"Error updating ELO ratings: {e}")

  async def _validate_action(self, payload: dict) -> bool:
    """Validate battle action"""
    # Check if it's player's turn
    if not await self._is_current_turn(self._user):
      await self.send_json({"type": "error", "message": "Not your turn"})
      return False

    # Check if battle is in PLAYING state
    if self._battle.status != Battle.BattleStatus.PLAYING:
      await self.send_json(
        {"type": "error", "message": "Battle not in playing state"}
      )
      return False

    # Validate required fields
    action = payload.get("action")
    if not action:
      await self.send_json({"type": "error", "message": "Action is required"})
      return False

    return True

  async def _send_battle_state(self) -> None:
    """Send current battle state to player"""
    try:
      await self.send_json(
        {
          "type": "battle_state",
          "battle_id": self._battle_id,
          "status": self._battle.status,
          "current_turn": self._battle.current_turn.id
          if self._battle.current_turn
          else None,
          "turn_number": self._battle.turn_number,
          "player1": {
            "id": self._battle.player1.id,
            "username": self._battle.player1.username,
          },
          "player2": {
            "id": self._battle.player2.id,
            "username": self._battle.player2.username,
          },
        }
      )
    except Exception as e:
      logger.error(f"Error sending battle state for {self._battle_id}: {e}")

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
