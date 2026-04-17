"""
Ranking domain logic: queries for leaderboard display.
"""

from django.db.utils import DatabaseError, IntegrityError, OperationalError
from user_profile.models import Ranking
from utils.log import logger


def get_leaderboard_rankings(limit: int):
  """
  Return up to ``limit`` Ranking rows, highest ELO first.
  Security: Public read-only operation with audit logging.
  """
  try:
    # Security: Log ranking access for audit
    logger.info("Leaderboard accessed limit={}", limit)
    
    rankings = list(
      Ranking.objects.select_related("user", "user__profile").order_by("-elo", "user_id")[:limit]
    )
    
    # Security: Validate data integrity before returning
    for ranking in rankings:
      if ranking.elo < 0 or ranking.elo > 4000:
        logger.warning(
          "Invalid ELO detected in ranking user_id={} elo={}",
          ranking.user.id,
          ranking.elo
        )
    
    return rankings
  except (OperationalError, IntegrityError, DatabaseError) as exc:
    logger.opt(exception=exc).error(
      "get_leaderboard_rankings database error limit={}",
      limit,
    )
    raise
