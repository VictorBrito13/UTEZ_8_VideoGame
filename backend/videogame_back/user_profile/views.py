from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .serializers import (
  UserRegistrationSerializer,
  UserCreatureSerializer,
  TeamCreatureSerializer,
  ProfileSerializer,
)
from .models import Ranking, UserCreature, Team, TeamCreature, Profile, Creature


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


class TeamViewSet(viewsets.ReadOnlyModelViewSet):
  """
  API for viewing the user's current team.
  """

  serializer_class = TeamCreatureSerializer
  permission_classes = [IsAuthenticated]

  def get_queryset(self):
    return TeamCreature.objects.filter(team__user=self.request.user)

  @action(detail=False, methods=["POST"])
  def set_team(self, request):
    """
    Bulk update many-to-many team relation using base Creature IDs.
    Expects: { "creature_ids": [id1, id2, id3] }
    """
    creature_ids = request.data.get("creature_ids", [])
    if not isinstance(creature_ids, list):
      return Response(
        {"message": "Invalid data format"}, status=status.HTTP_400_BAD_REQUEST
      )

    if len(creature_ids) > 3:
      return Response(
        {"message": "Team cannot exceed 3 creatures"},
        status=status.HTTP_400_BAD_REQUEST,
      )

    # Get species and create UserCreatures if necessary
    species_list = Creature.objects.filter(id__in=creature_ids)
    if species_list.count() != len(creature_ids):
      return Response(
        {"message": "One or more species not found"},
        status=status.HTTP_404_NOT_FOUND,
      )

    # Get or create user team
    team, created = Team.objects.get_or_create(user=request.user)

    # Clear existing team members
    TeamCreature.objects.filter(team=team).delete()

    # Ensure UserCreatures exist and add to team
    for species in species_list:
      uc, _ = UserCreature.objects.get_or_create(
        user=request.user,
        creature=species,
        defaults={"level": 5, "current_hp": species.hp},
      )
      TeamCreature.objects.create(team=team, user_creature=uc)

    return Response(
      {"message": "Team updated successfully", "status": "success"}
    )


class ProfileViewSet(viewsets.ModelViewSet):
  """
  API for viewing and updating user profile.
  """

  serializer_class = ProfileSerializer
  permission_classes = [IsAuthenticated]

  def get_queryset(self):
    return Profile.objects.filter(user=self.request.user)

  @action(detail=False, methods=["GET"])
  def me(self, request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    # Ensure Ranking exists as well
    Ranking.objects.get_or_create(user=request.user)
    serializer = self.get_serializer(profile)
    return Response(serializer.data)

  @action(detail=False, methods=["PATCH"])
  def update_profile(self, request):
    profile = Profile.objects.get(user=request.user)
    serializer = self.get_serializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
      serializer.save()
      return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
