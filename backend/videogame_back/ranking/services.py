"""
Ranking domain logic: queries for leaderboard display.
"""

from user_profile.models import Ranking


def get_leaderboard_rankings(limit: int):
  """
  Return up to ``limit`` Ranking rows, highest ELO first.
  """
  return list(
    Ranking.objects.select_related("user").order_by("-elo", "user_id")[:limit]
  )
