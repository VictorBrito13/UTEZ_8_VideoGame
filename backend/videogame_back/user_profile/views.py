from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .serializers import UserRegistrationSerializer, UserCreatureSerializer
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .models import Ranking, UserCreature


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
  serializer = UserRegistrationSerializer(data=request.data)
  if serializer.is_valid():
    user = serializer.save()
    return Response(
      {
        "message": "User registered successfully",
        "id": user.id,
        "username": user.username,
      },
      status=status.HTTP_201_CREATED,
    )

  return Response(
    {"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
  )


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


class UserCreatureViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for the user to consult their own creatures and their stats.
    Fulfills RF-06: Consultation of attributes and abilities.
    Secure access: only the user's creatures are returned (R3.2).
    """
    serializer_class = UserCreatureSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filtering by current user to avoid unauthorized access (R3.2)
        return UserCreature.objects.filter(user=self.request.user)
