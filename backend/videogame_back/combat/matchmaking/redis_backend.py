from __future__ import annotations

from .backend import MatchmakingBackend, MatchmakingTicket


class RedisMatchmakingBackend(MatchmakingBackend):
  """
  Placeholder for a Redis-backed implementation.

  When you switch to Redis, implement the same interface with shared storage
  (e.g., sorted sets keyed by ELO, plus a hash for ticket metadata).
  """

  def __init__(self) -> None:
    raise NotImplementedError("Redis backend is not wired yet")

  def upsert_ticket(self, ticket: MatchmakingTicket) -> None:
    raise NotImplementedError

  def remove_ticket(self, user_id: int) -> None:
    raise NotImplementedError

  def list_tickets(self) -> list[MatchmakingTicket]:
    raise NotImplementedError
