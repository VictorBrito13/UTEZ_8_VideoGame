from core.payload_crypto import decrypt_json
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
  Query: ``limit`` (1–500, default 100), or ``e_limit`` (AES-GCM ciphertext for
  an int or ``{"limit": n}``).
  """
  e_limit_raw = request.query_params.get("e_limit")
  if e_limit_raw:
    try:
      lim_val = decrypt_json(e_limit_raw)
    except ValueError:
      return Response(
        {"error": "Invalid e_limit payload"},
        status=status.HTTP_400_BAD_REQUEST,
      )
    if isinstance(lim_val, int):
      limit = lim_val
    elif isinstance(lim_val, dict) and "limit" in lim_val:
      try:
        limit = int(lim_val["limit"])
      except (TypeError, ValueError):
        return Response(
          {"error": "Invalid e_limit payload"},
          status=status.HTTP_400_BAD_REQUEST,
        )
    else:
      return Response(
        {"error": "Invalid e_limit payload"},
        status=status.HTTP_400_BAD_REQUEST,
      )
  else:
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
      "fotoBase64": r.user.profile.foto_base64 if hasattr(r.user, 'profile') else None,
      "trainerSprite": r.user.profile.trainer_sprite if hasattr(r.user, 'profile') else None,
    }
    for r in rankings
  ]
  return Response({"results": data}, status=status.HTTP_200_OK)
