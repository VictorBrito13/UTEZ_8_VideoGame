from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import Creature
from .serializers import CreatureSerializer
from user_profile.models import UserCreature, Team, TeamCreature
from user_profile.serializers import UserCreatureSerializer


class CreatureViewSet(viewsets.ReadOnlyModelViewSet):
  """
  API for the general Pokedex (view all available species).
  """

  queryset = Creature.objects.all().order_by("pokedex_id")
  serializer_class = CreatureSerializer
  permission_classes = [permissions.IsAuthenticated]


class UserCreatureViewSet(viewsets.ModelViewSet):
  """
  API for managing the user's personal collection of creatures.
  """

  serializer_class = UserCreatureSerializer
  permission_classes = [permissions.IsAuthenticated]

  def get_queryset(self):
    return UserCreature.objects.filter(user=self.request.user)

  @action(detail=True, methods=["post"], url_path="toggle-team")
  def toggle_team(self, request, pk=None):
    """
    Add or remove a creature from the active team (limit 3).
    """
    user_creature = self.get_object()
    team, _ = Team.objects.get_or_create(user=request.user)

    team_creature = TeamCreature.objects.filter(
      team=team, user_creature=user_creature
    ).first()

    if team_creature:
      # Already in team, remove it
      team_creature.delete()
      return Response(
        {"status": "removed", "message": "Removed from team"},
        status=status.HTTP_200_OK,
      )
    else:
      # Try to add it
      if team.team_creatures.count() >= 3:
        return Response(
          {"status": "error", "message": "Max 3 creatures per team"},
          status=status.HTTP_400_BAD_REQUEST,
        )

      TeamCreature.objects.create(team=team, user_creature=user_creature)
      return Response(
        {"status": "added", "message": "Added to team"},
        status=status.HTTP_201_CREATED,
      )
