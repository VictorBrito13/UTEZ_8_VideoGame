from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .services import get_leaderboard_rankings


def _parse_limit(raw: str | None) -> int:
  if raw is None:
    return 100
  try:
    return int(raw)
  except ValueError:
    return 100


@api_view(["GET"])
@permission_classes([AllowAny])
def leaderboard(request):
  """
  Public leaderboard: users ordered by ELO (descending).
  Query: ``limit`` (1–500, default 100).
  """
  limit = _parse_limit(request.query_params.get("limit"))
  limit = max(1, min(limit, 500))
  rankings = get_leaderboard_rankings(limit)
  data = [
    {
      "userId": r.user_id,
      "username": r.user.username,
      "elo": r.elo,
      "wins": r.wins,
      "losses": r.losses,
    }
    for r in rankings
  ]
  return Response({"results": data}, status=status.HTTP_200_OK)
