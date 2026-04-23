from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from django.db import models
from .backend import MatchmakingBackend, MatchmakingPair, MatchmakingTicket


def _have_played_together_recently(user1_id: int, user2_id: int, minutes: int = 1) -> bool:
  """
  Verifica si dos jugadores han competido en los últimos 'minutos' especificados.
  Previene manipulación con cuentas secundarias.
  """
  from ..models import Battle
  
  # Buscar batallas entre estos dos jugadores en los últimos minutos
  cutoff_time = datetime.now(tz=timezone.utc) - timedelta(minutes=minutes)
  
  recent_battles = Battle.objects.filter(
    models.Q(player1_id=user1_id, player2_id=user2_id) | 
    models.Q(player1_id=user2_id, player2_id=user1_id),
    created_at__gte=cutoff_time,
    status__in=[Battle.BattleStatus.PLAYING, Battle.BattleStatus.FINISHED]
  )
  
  return recent_battles.exists()


@dataclass(frozen=True, slots=True)
class MatchmakingConfig:
  initial_range: int = 50
  expand_every_seconds: int = 10
  range_step: int = 50
  max_range: int = 500
  # Drop queue entries whose WebSocket likely died without disconnect cleanup.
  stale_ticket_max_age_s: int = 600


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


def _drop_stale_tickets(
  backend: MatchmakingBackend,
  now: datetime,
  max_age_s: int,
) -> None:
  """Remove tickets older than max_age (orphaned if disconnect was missed)."""
  limit = timedelta(seconds=max_age_s)
  for ticket in backend.list_tickets():
    if now - ticket.queued_at > limit:
      backend.remove_ticket(ticket.user_id)


def try_match_for_user(
  backend: MatchmakingBackend,
  user_id: int,
  config: MatchmakingConfig,
  now: datetime | None = None,
) -> MatchmakingPair | None:
  if now is None:
    now = _now_utc()

  _drop_stale_tickets(backend, now, config.stale_ticket_max_age_s)

  tickets = backend.list_tickets()
  seeker = next((t for t in tickets if t.user_id == user_id), None)
  if seeker is None:
    return None

  seeker_range = current_range_for_ticket(seeker, config, now=now)
  candidates: list[MatchmakingTicket] = []
  for ticket in tickets:
    if ticket.user_id == seeker.user_id:
      continue
    
    # Verificación anti-cuentas secundarias
    # if _have_played_together_recently(seeker.user_id, ticket.user_id):
    #   continue
    
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
