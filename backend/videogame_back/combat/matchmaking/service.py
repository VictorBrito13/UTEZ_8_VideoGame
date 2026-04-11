from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from .backend import MatchmakingBackend, MatchmakingPair, MatchmakingTicket


@dataclass(frozen=True, slots=True)
class MatchmakingConfig:
  initial_range: int = 50
  expand_every_seconds: int = 10
  range_step: int = 50
  max_range: int = 500


def _now_utc() -> datetime:
  return datetime.now(tz=timezone.utc)


def current_range_for_ticket(
  ticket: MatchmakingTicket,
  config: MatchmakingConfig,
  now: datetime | None = None,
) -> int:
  if now is None:
    now = _now_utc()

  waited = max(timedelta(0), now - ticket.queued_at)
  steps = int(waited.total_seconds() // config.expand_every_seconds)
  value = config.initial_range + (steps * config.range_step)
  return min(value, config.max_range)


def try_match_for_user(
  backend: MatchmakingBackend,
  user_id: int,
  config: MatchmakingConfig,
  now: datetime | None = None,
) -> MatchmakingPair | None:
  if now is None:
    now = _now_utc()

  tickets = backend.list_tickets()
  seeker = next((t for t in tickets if t.user_id == user_id), None)
  if seeker is None:
    return None

  seeker_range = current_range_for_ticket(seeker, config, now=now)

  candidates: list[MatchmakingTicket] = []
  for ticket in tickets:
    if ticket.user_id == seeker.user_id:
      continue
    diff = abs(ticket.elo - seeker.elo)
    if diff <= seeker_range:
      candidates.append(ticket)

  if not candidates:
    return None

  candidates.sort(
    key=lambda t: (
      abs(t.elo - seeker.elo),
      t.queued_at,
      t.user_id,
    )
  )
  opponent = candidates[0]

  backend.remove_ticket(seeker.user_id)
  backend.remove_ticket(opponent.user_id)
  return MatchmakingPair(player1=seeker, player2=opponent)
