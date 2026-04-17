"""Unit tests for matchmaking queue (no Channels WebSocket required)."""

from datetime import timedelta

from django.test import SimpleTestCase

from combat.matchmaking.backend import MatchmakingTicket
from combat.matchmaking.in_memory_backend import InMemoryMatchmakingBackend
from combat.matchmaking.service import (
  MatchmakingConfig,
  _now_utc,
  try_match_for_user,
)


class MatchmakingQueueTests(SimpleTestCase):
  def test_two_players_match_and_both_removed_from_queue(self):
    backend = InMemoryMatchmakingBackend()
    cfg = MatchmakingConfig()

    now = _now_utc()
    t1 = MatchmakingTicket(
      user_id=1,
      elo=1000,
      queued_at=now,
      channel_name="ch1",
    )
    t2 = MatchmakingTicket(
      user_id=2,
      elo=1000,
      queued_at=now,
      channel_name="ch2",
    )
    backend.upsert_ticket(t1)
    backend.upsert_ticket(t2)

    pair = try_match_for_user(backend, 1, cfg, now=now)
    self.assertIsNotNone(pair)
    self.assertEqual(len(backend.list_tickets()), 0)

  def test_stale_ticket_dropped_before_match(self):
    backend = InMemoryMatchmakingBackend()
    cfg = MatchmakingConfig(stale_ticket_max_age_s=60)

    now = _now_utc()
    stale = MatchmakingTicket(
      user_id=99,
      elo=1000,
      queued_at=now - timedelta(minutes=30),
      channel_name="ghost",
    )
    fresh = MatchmakingTicket(
      user_id=2,
      elo=1000,
      queued_at=now,
      channel_name="ch2",
    )
    backend.upsert_ticket(stale)
    backend.upsert_ticket(fresh)

    try_match_for_user(backend, 2, cfg, now=now)
    ids = [t.user_id for t in backend.list_tickets()]
    self.assertEqual(ids, [2])

  def test_stale_removed_third_player_not_paired_with_ghost(self):
    """Old queue rows past max age are removed (missed disconnect cleanup)."""
    backend = InMemoryMatchmakingBackend()
    cfg = MatchmakingConfig(stale_ticket_max_age_s=120)

    now = _now_utc()
    ghost = MatchmakingTicket(
      user_id=1,
      elo=1000,
      queued_at=now - timedelta(hours=2),
      channel_name="dead",
    )
    backend.upsert_ticket(ghost)

    try_match_for_user(backend, 1, cfg, now=now)
    self.assertEqual(backend.list_tickets(), [])

    third = MatchmakingTicket(
      user_id=3,
      elo=1000,
      queued_at=now,
      channel_name="ch3",
    )
    backend.upsert_ticket(third)
    pair = try_match_for_user(backend, 3, cfg, now=now)
    self.assertIsNone(pair)
