from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from user_profile.models import Ranking
from videogame_back.rate_limit import check_rate_limit

from .matchmaking.backend import MatchmakingTicket
from .matchmaking.factory import get_matchmaking_backend
from .matchmaking.service import MatchmakingConfig, try_match_for_user
from .models import Battle


def _now_utc() -> datetime:
  return datetime.now(tz=timezone.utc)


@sync_to_async
def _get_or_create_ranking_elo(user_id: int) -> int:
  ranking, _ = Ranking.objects.get_or_create(user_id=user_id)
  return ranking.elo


@sync_to_async
def _create_battle(player1_id: int, player2_id: int) -> int:
  battle = Battle.objects.create(
    player1_id=player1_id,
    player2_id=player2_id,
    status="matched",
  )
  return battle.id


class MatchmakingConsumer(AsyncWebsocketConsumer):
  config = MatchmakingConfig()

  async def connect(self) -> None:
    # Initialize these early so disconnect won't crash on early close/reject.
    self._in_queue = False
    self._cancel_event = asyncio.Event()
    self._match_task: asyncio.Task[None] | None = None

    user = self.scope.get("user")
    if not user or not user.is_authenticated:
      await self.close(code=4401)
      return

    self.user_id = int(user.id)
    await self.accept()

  async def disconnect(self, code: int) -> None:
    if hasattr(self, "_cancel_event"):
      self._cancel_event.set()

    if getattr(self, "_match_task", None) is not None:
      self._match_task.cancel()
      self._match_task = None

    if getattr(self, "_in_queue", False):
      backend = get_matchmaking_backend()
      if hasattr(self, "user_id"):
        backend.remove_ticket(self.user_id)
      self._in_queue = False

  async def receive(
    self, text_data: str | None = None, bytes_data=None
  ) -> None:
    if not text_data:
      return

    try:
      payload = json.loads(text_data)
    except json.JSONDecodeError:
      await self.send_json({"type": "error", "message": "Invalid JSON"})
      return

    msg_type = payload.get("type")
    if msg_type == "matchmaking.join":
      await self._handle_join()
      return

    if msg_type == "matchmaking.cancel":
      await self._handle_cancel()
      return

    await self.send_json({"type": "error", "message": "Unknown message type"})

  async def _handle_join(self) -> None:
    if self._in_queue:
      await self.send_json({"type": "matchmaking.queued"})
      return

    allowed = check_rate_limit(
      f"ws:{self.user_id}:matchmaking.join",
      limit=5,
      window_s=10,
    )
    if not allowed:
      await self.send_json(
        {"type": "rate_limited", "message": "Too many requests"}
      )
      return

    elo = await _get_or_create_ranking_elo(self.user_id)
    backend = get_matchmaking_backend()
    ticket = MatchmakingTicket(
      user_id=self.user_id,
      elo=int(elo),
      queued_at=_now_utc(),
      channel_name=self.channel_name,
    )
    backend.upsert_ticket(ticket)
    self._in_queue = True
    self._cancel_event.clear()

    await self.send_json({"type": "matchmaking.queued", "elo": int(elo)})

    if self._match_task is None or self._match_task.done():
      self._match_task = asyncio.create_task(self._search_for_match())

  async def _search_for_match(self) -> None:
    backend = get_matchmaking_backend()

    try:
      while self._in_queue and not self._cancel_event.is_set():
        pair = try_match_for_user(backend, self.user_id, self.config)
        if pair is not None:
          self._in_queue = False
          battle_id = await _create_battle(
            pair.player1.user_id,
            pair.player2.user_id,
          )

          await self.channel_layer.send(
            pair.player1.channel_name,
            {
              "type": "match_found",
              "battle_id": battle_id,
              "opponent_user_id": pair.player2.user_id,
              "opponent_elo": pair.player2.elo,
            },
          )
          await self.channel_layer.send(
            pair.player2.channel_name,
            {
              "type": "match_found",
              "battle_id": battle_id,
              "opponent_user_id": pair.player1.user_id,
              "opponent_elo": pair.player1.elo,
            },
          )
          return

        # If our ticket was removed by someone else's match, stop the search
        # task so we can handle the incoming match_found event.
        has_ticket = any(
          t.user_id == self.user_id for t in backend.list_tickets()
        )
        if not has_ticket:
          self._in_queue = False
          return

        await asyncio.sleep(1)
    except asyncio.CancelledError:
      raise

  async def _handle_cancel(self) -> None:
    if not self._in_queue:
      await self.send_json({"type": "matchmaking.cancelled"})
      return

    backend = get_matchmaking_backend()
    backend.remove_ticket(self.user_id)
    self._in_queue = False
    self._cancel_event.set()
    if self._match_task is not None:
      self._match_task.cancel()
      self._match_task = None
    await self.send_json({"type": "matchmaking.cancelled"})

  async def match_found(self, event: dict[str, Any]) -> None:
    await self.send_json(
      {
        "type": "matchmaking.found",
        "battleId": event["battle_id"],
        "opponent": {
          "userId": event["opponent_user_id"],
          "elo": event["opponent_elo"],
        },
      }
    )

  async def send_json(self, payload: dict[str, Any]) -> None:
    await self.send(text_data=json.dumps(payload))
