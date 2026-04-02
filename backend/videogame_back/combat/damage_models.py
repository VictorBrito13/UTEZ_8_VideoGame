from __future__ import annotations

import logging
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction

from .models import Battle

logger = logging.getLogger(__name__)


class CreatureType(models.Model):
  """Creature types for damage calculation"""

  FIRE = "fire"
  WATER = "water"
  EARTH = "earth"
  AIR = "air"

  TYPE_CHOICES = [
    (FIRE, "Fire"),
    (WATER, "Water"),
    (EARTH, "Earth"),
    (AIR, "Air"),
  ]

  name = models.CharField(max_length=20, choices=TYPE_CHOICES, unique=True)

  class Meta:
    db_table = "combat_creature_types"

  def __str__(self):
    return self.name


class TypeEffectiveness(models.Model):
  """Type effectiveness matrix - factor_type for damage calculation"""

  attacking_type = models.ForeignKey(
    CreatureType, on_delete=models.CASCADE, related_name="attacks"
  )
  defending_type = models.ForeignKey(
    CreatureType, on_delete=models.CASCADE, related_name="defends"
  )
  multiplier = models.DecimalField(
    max_digits=3, decimal_places=2, help_text="Damage multiplier (factor_type)"
  )

  class Meta:
    db_table = "combat_type_effectiveness"
    unique_together = ["attacking_type", "defending_type"]

  def __str__(self):
    return f"{self.attacking_type.name} vs {self.defending_type.name}: {self.multiplier}x"


class DamageCalculation(models.Model):
  """Deterministic damage calculation records"""

  battle = models.ForeignKey(
    Battle, on_delete=models.CASCADE, related_name="damage_calculations"
  )
  attacker_id = models.PositiveIntegerField()
  defender_id = models.PositiveIntegerField()
  attacking_type = models.ForeignKey(
    CreatureType, on_delete=models.PROTECT, related_name="damage_dealt"
  )
  defending_type = models.ForeignKey(
    CreatureType, on_delete=models.PROTECT, related_name="damage_received"
  )
  base_damage = models.PositiveIntegerField()
  type_multiplier = models.DecimalField(max_digits=3, decimal_places=2)
  final_damage = models.PositiveIntegerField()
  turn_number = models.PositiveIntegerField()

  class Meta:
    db_table = "combat_damage_calculations"
    ordering = ["battle", "turn_number"]

  @classmethod
  def calculate_damage(
    cls,
    battle,
    attacker_id,
    defender_id,
    attacking_type,
    defending_type,
    base_damage,
    turn_number,
  ):
    """
    Calculate damage using deterministic formula:
    Damage_final = Damage_base +/- Damage_base*factor_type
    """
    with transaction.atomic():
      # Get factor_type from effectiveness table
      effectiveness = TypeEffectiveness.objects.get(
        attacking_type=attacking_type, defending_type=defending_type
      )
      factor_type = effectiveness.multiplier

      # Apply formula: Damage_final = Damage_base +/- Damage_base*factor_type
      damage_with_modifier = Decimal(base_damage) + (
        Decimal(base_damage) * factor_type
      )

      # Deterministic rounding (always round down)
      final_damage = int(
        damage_with_modifier.to_integral_value(rounding="ROUND_DOWN")
      )
      final_damage = max(0, final_damage)  # Ensure non-negative

      # Record calculation
      return cls.objects.create(
        battle=battle,
        attacker_id=attacker_id,
        defender_id=defender_id,
        attacking_type=attacking_type,
        defending_type=defending_type,
        base_damage=base_damage,
        type_multiplier=factor_type,
        final_damage=final_damage,
        turn_number=turn_number,
      )
