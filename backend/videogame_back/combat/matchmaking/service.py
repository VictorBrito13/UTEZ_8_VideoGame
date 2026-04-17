from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from django.db import models
from .backend import MatchmakingBackend, MatchmakingPair, MatchmakingTicket


def _have_played_together_recently(user1_id: int, user2_id: int, hours: int = 2) -> bool:
  """
  Verifica si dos jugadores han competido en las últimas 'horas' especificadas.
  Previene manipulación con cuentas secundarias.
  """
  from django.contrib.auth.models import User
  from ..models import Battle
  
  try:
    user1 = User.objects.get(id=user1_id)
    user2 = User.objects.get(id=user2_id)
    
    # Buscar batallas entre estos dos jugadores en las últimas horas
    cutoff_time = datetime.now(tz=timezone.utc) - timedelta(hours=hours)
    
    recent_battles = Battle.objects.filter(
      models.Q(player1=user1, player2=user2) | 
      models.Q(player1=user2, player2=user1),
      created_at__gte=cutoff_time,
      status__in=[Battle.BattleStatus.PLAYING, Battle.BattleStatus.FINISHED]
    )
    
    return recent_battles.exists()
  except User.DoesNotExist:
    return False


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
    
    # Verificación anti-cuentas secundarias
    if _have_played_together_recently(seeker.user_id, ticket.user_id):
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
