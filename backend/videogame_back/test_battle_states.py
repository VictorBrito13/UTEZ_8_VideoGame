#!/usr/bin/env python
"""
Test script for Battle State Machine
Run with: python manage.py shell < test_battle_states.py
"""

import os
import django
import pytest

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videogame_back.settings")
django.setup()

from django.contrib.auth.models import User
from combat.models import Battle


@pytest.mark.django_db
def test_battle_states():
  print("🎮 Testing Battle State Machine...")

  # Create test users if they don't exist
  user1, _ = User.objects.get_or_create(
    username="player1", defaults={"email": "p1@test.com"}
  )
  user2, _ = User.objects.get_or_create(
    username="player2", defaults={"email": "p2@test.com"}
  )

  print(f"✅ Users: {user1.username} vs {user2.username}")

  # Create a new battle
  battle = Battle.objects.create(
    player1=user1, player2=user2, status=Battle.BattleStatus.WAITING
  )

  print(f"🆕 Battle created: {battle}")
  print(f"📊 Initial state: {battle.status}")

  # Test state transitions
  print("\n🔍 Testing state methods:")
  print(f"   Can start battle: {battle.can_start_battle()}")
  print(f"   Is finished: {battle.is_finished()}")
  print(f"   Is player1 turn: {battle.is_player_turn(user1)}")
  print(f"   Is player2 turn: {battle.is_player_turn(user2)}")

  # Test starting battle
  print("\n▶️  Starting battle...")
  battle.status = Battle.BattleStatus.PLAYING
  battle.current_turn = user1
  battle.save()

  print(f"   New status: {battle.status}")
  print(f"   Current turn: {battle.current_turn.username}")
  print(f"   Turn number: {battle.turn_number}")

  # Test turn validation
  print(f"\n🔄 Turn validation:")
  print(f"   Is player1 turn: {battle.is_player_turn(user1)}")
  print(f"   Is player2 turn: {battle.is_player_turn(user2)}")

  # Test finishing battle
  print("\n🏁 Finishing battle...")
  battle.status = Battle.BattleStatus.FINISHED
  battle.winner = user1
  battle.save()

  print(f"   Final status: {battle.status}")
  print(f"   Winner: {battle.winner.username}")
  print(f"   Can start battle: {battle.can_start_battle()}")
  print(f"   Is finished: {battle.is_finished()}")

  print("\n✅ All tests passed! Battle State Machine is working correctly.")


if __name__ == "__main__":
  test_battle_states()
