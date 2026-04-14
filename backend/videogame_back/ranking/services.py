"""
Ranking domain logic: queries for leaderboard display.
"""

from django.db.utils import DatabaseError, IntegrityError, OperationalError
from user_profile.models import Ranking
from utils.log import logger


def get_leaderboard_rankings(limit: int):
  """
  Return up to ``limit`` Ranking rows, highest ELO first.
  """
  try:
    return list(
      Ranking.objects.select_related("user").order_by("-elo", "user_id")[:limit]
    )
  except (OperationalError, IntegrityError, DatabaseError) as exc:
    logger.opt(exception=exc).error(
      "get_leaderboard_rankings database error limit={}",
      limit,
    )
    raise
