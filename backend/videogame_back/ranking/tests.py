from django.contrib.auth.models import User
from django.test import TestCase
from user_profile.models import Ranking


class LeaderboardApiTests(TestCase):
  def test_leaderboard_orders_by_elo_desc(self):
    u_lo = User.objects.create_user(username="lo", password="x")
    u_hi = User.objects.create_user(username="hi", password="x")
    Ranking.objects.update_or_create(user=u_lo, defaults={"elo": 900})
    Ranking.objects.update_or_create(user=u_hi, defaults={"elo": 1100})

    response = self.client.get("/api/leaderboard?limit=10")
    self.assertEqual(response.status_code, 200)
    payload = response.json()
    self.assertIn("results", payload)
    self.assertEqual(len(payload["results"]), 2)
    self.assertEqual(payload["results"][0]["username"], "hi")
    self.assertEqual(payload["results"][0]["elo"], 1100)
