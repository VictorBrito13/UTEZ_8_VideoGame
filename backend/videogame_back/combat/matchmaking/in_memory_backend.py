from __future__ import annotations

import threading

from .backend import MatchmakingTicket


class InMemoryMatchmakingBackend:
  def __init__(self) -> None:
    self._lock = threading.Lock()
    self._tickets_by_user: dict[int, MatchmakingTicket] = {}

  def upsert_ticket(self, ticket: MatchmakingTicket) -> None:
    with self._lock:
      self._tickets_by_user[ticket.user_id] = ticket

  def remove_ticket(self, user_id: int) -> None:
    with self._lock:
      self._tickets_by_user.pop(user_id, None)

  def list_tickets(self) -> list[MatchmakingTicket]:
    with self._lock:
      return list(self._tickets_by_user.values())
