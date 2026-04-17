from core.payload_crypto import decrypt_json
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from user_profile.models import Team, TeamCreature, UserCreature
from user_profile.serializers import UserCreatureSerializer

from .creature_security import CreatureAccessError, CreatureSecurityService
from .models import Creature
from .serializers import CreatureSerializer


class CreatureViewSet(viewsets.ReadOnlyModelViewSet):
  """
  API for the general Pokedex (view all available species).
  Enhanced with security validation for creature access.
  """

  queryset = Creature.objects.all().order_by("pokedex_id")
  serializer_class = CreatureSerializer
  permission_classes = [permissions.IsAuthenticated]

  def retrieve(self, request, pk=None):
    """
    Retrieve a single creature with security validation.
    Validates that the creature ID exists and is accessible.
    """
    try:
      # Validate creature ID and access
      creature = CreatureSecurityService.validate_public_creature_access(
        request.user,
        int(pk)
      )

      # Return the creature data
      serializer = self.get_serializer(creature)
      return Response(serializer.data)

    except (CreatureAccessError, ValueError) as e:
      return Response(
        {'error': str(e), 'detail': 'Invalid creature ID or access denied'},
        status=status.HTTP_400_BAD_REQUEST
      )
    except NotFound as e:
      return Response(
        {'error': str(e), 'detail': 'Creature not found'},
        status=status.HTTP_404_NOT_FOUND
      )
    except PermissionDenied as e:
      return Response(
        {'error': str(e), 'detail': 'Access denied'},
        status=status.HTTP_403_FORBIDDEN
      )
    except Exception as e:
      from utils.log import logger
      logger.error(f"Unexpected error in creature retrieve: {e}")
      return Response(
        {'error': 'Internal server error'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
      )

  def list(self, request):
    """
    List all public creatures (pokedex).
    This is considered safe as all creatures are public.
    """
    # Detect suspicious access patterns
    creature_ids = [creature.id for creature in self.queryset]
    if CreatureSecurityService.detect_suspicious_access_pattern(request.user, creature_ids):
      from utils.log import logger
      logger.warning(f"Suspicious pokedex access pattern: {request.user.username}")

    return super().list(request)


class UserCreatureViewSet(viewsets.ModelViewSet):
  """
  API for managing the user's personal collection of creatures.
  Enhanced with security validation for private creature access.
  """

  serializer_class = UserCreatureSerializer
  permission_classes = [permissions.IsAuthenticated]

  def get_queryset(self):
    return UserCreature.objects.filter(user=self.request.user)

  def retrieve(self, request, pk=None):
    """
    Retrieve a single user creature with security validation.
    Validates that the creature exists and belongs to the authenticated user.
    """
    try:
      # Validate creature ID and ownership
      user_creature = CreatureSecurityService.validate_private_creature_access(
        request.user,
        int(pk)
      )

      # Return the creature data
      serializer = self.get_serializer(user_creature)
      return Response(serializer.data)

    except (CreatureAccessError, ValueError) as e:
      return Response(
        {'error': str(e), 'detail': 'Invalid creature ID or access denied'},
        status=status.HTTP_400_BAD_REQUEST
      )
    except NotFound as e:
      return Response(
        {'error': str(e), 'detail': 'Creature not found or access denied'},
        status=status.HTTP_404_NOT_FOUND
      )
    except PermissionDenied as e:
      return Response(
        {'error': str(e), 'detail': 'Access denied'},
        status=status.HTTP_403_FORBIDDEN
      )
    except Exception as e:
      from utils.log import logger
      logger.error(f"Unexpected error in user creature retrieve: {e}")
      return Response(
        {'error': 'Internal server error'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
      )

  def list(self, request):
    """
    List user's creatures with security validation.
    """
    try:
      queryset = self.get_queryset()

      # Detect suspicious access patterns
      creature_ids = [creature.id for creature in queryset]
      if CreatureSecurityService.detect_suspicious_access_pattern(request.user, creature_ids):
        from utils.log import logger
        logger.warning(f"Suspicious user creature access pattern: {request.user.username}")

      serializer = self.get_serializer(queryset, many=True)
      return Response(serializer.data)

    except Exception as e:
      from utils.log import logger
      logger.error(f"Error in user creature list: {e}")
      return Response(
        {'error': 'Failed to load creatures'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
      )

  @action(detail=True, methods=["post"], url_path="toggle-team")
  def toggle_team(self, request, pk=None):
    """
    Add or remove a creature from the active team (limit 3).
    """
    if request.data.get("user_creature_id_encrypted"):
      try:
        raw = decrypt_json(request.data["user_creature_id_encrypted"])
      except ValueError:
        return Response(
          {"error": "Invalid user_creature_id_encrypted"},
          status=status.HTTP_400_BAD_REQUEST,
        )
      if isinstance(raw, int):
        resolved_pk = raw
      elif isinstance(raw, dict) and "user_creature_id" in raw:
        resolved_pk = raw["user_creature_id"]
      else:
        return Response(
          {"error": "Invalid user_creature_id_encrypted"},
          status=status.HTTP_400_BAD_REQUEST,
        )
      self.kwargs["pk"] = str(resolved_pk)

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
