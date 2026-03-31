from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Ranking


@require_GET
def leaderboard(request):
  try:
    limit = int(request.GET.get("limit", "100"))
  except ValueError:
    limit = 100

  limit = max(1, min(limit, 500))

  rankings = Ranking.objects.select_related("user").order_by("-elo", "user_id")[
    :limit
  ]

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

  return JsonResponse({"results": data})
