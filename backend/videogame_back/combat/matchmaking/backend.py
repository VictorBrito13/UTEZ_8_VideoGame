from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True, slots=True)
class MatchmakingTicket:
  user_id: int
  elo: int
  queued_at: datetime
  channel_name: str


@dataclass(frozen=True, slots=True)
class MatchmakingPair:
  player1: MatchmakingTicket
  player2: MatchmakingTicket


class MatchmakingBackend(Protocol):
  def upsert_ticket(self, ticket: MatchmakingTicket) -> None:
    raise NotImplementedError

  def remove_ticket(self, user_id: int) -> None:
    raise NotImplementedError

  def list_tickets(self) -> list[MatchmakingTicket]:
    raise NotImplementedError
