from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Creature
from .serializers import CreatureSerializer


class CreatureViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing base creatures and their stats (HP, Attack, Defense, etc.)
    Fulfills RF-06: Attributes and abilities consultation.
    Secured by IsAuthenticated as per R3.2.
    """
    queryset = Creature.objects.all().order_by('pokedex_id')
    serializer_class = CreatureSerializer
    permission_classes = [IsAuthenticated]
