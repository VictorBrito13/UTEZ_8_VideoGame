from __future__ import annotations

from decimal import Decimal

from django.db import models, transaction

from .models import Battle


class CreatureType(models.Model):
  """Creature types for damage calculation - Pokemon standard 18 types"""

  NORMAL = "normal"
  FIRE = "fire"
  WATER = "water"
  GRASS = "grass"
  ELECTRIC = "electric"
  ICE = "ice"
  FIGHTING = "fighting"
  POISON = "poison"
  GROUND = "ground"
  FLYING = "flying"
  PSYCHIC = "psychic"
  BUG = "bug"
  ROCK = "rock"
  GHOST = "ghost"
  DRAGON = "dragon"
  DARK = "dark"
  STEEL = "steel"
  FAIRY = "fairy"

  TYPE_CHOICES = [
    (NORMAL, "Normal"),
    (FIRE, "Fire"),
    (WATER, "Water"),
    (GRASS, "Grass"),
    (ELECTRIC, "Electric"),
    (ICE, "Ice"),
    (FIGHTING, "Fighting"),
    (POISON, "Poison"),
    (GROUND, "Ground"),
    (FLYING, "Flying"),
    (PSYCHIC, "Psychic"),
    (BUG, "Bug"),
    (ROCK, "Rock"),
    (GHOST, "Ghost"),
    (DRAGON, "Dragon"),
    (DARK, "Dark"),
    (STEEL, "Steel"),
    (FAIRY, "Fairy"),
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
    return (
      f"{self.attacking_type.name} vs {self.defending_type.name}: "
      f"{self.multiplier}x"
    )


class DamageCalculation(models.Model):
  """Deterministic damage calculation records with detailed stats"""

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
  
  # New detailed damage calculation fields
  ability_base_damage = models.PositiveIntegerField(
    help_text="Base damage of the move"
  )
  attacker_attack = models.PositiveIntegerField(
    help_text="Attacking creature's attack stat"
  )
  defender_defense = models.PositiveIntegerField(
    help_text="Defending creature's defense stat"
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
    ability_base_damage,
    attacker_attack,
    defender_defense,
    turn_number,
  ):
    """
    Calculate damage using enhanced formula:
    total_attack = ability_base_damage + attacker_attack
    defense_factor = max(1, total_attack - defender_defense)
    Damage_final = defense_factor * type_multiplier
    """
    with transaction.atomic():
      # Get type effectiveness
      effectiveness = TypeEffectiveness.objects.get(
        attacking_type=attacking_type, defending_type=defending_type
      )
      type_multiplier = effectiveness.multiplier

      # Calculate total attack
      total_attack = ability_base_damage + attacker_attack
      
      # Calculate base damage considering defense
      damage_before_type = max(1, total_attack - defender_defense)
      
      # Apply type multiplier
      damage_with_modifier = Decimal(damage_before_type) * type_multiplier

      # Deterministic rounding (always round down)
      final_damage = int(
        damage_with_modifier.to_integral_value(rounding="ROUND_DOWN")
      )
      final_damage = max(1, final_damage)  # Ensure at least 1 damage

      # Record calculation
      return cls.objects.create(
        battle=battle,
        attacker_id=attacker_id,
        defender_id=defender_id,
        attacking_type=attacking_type,
        defending_type=defending_type,
        ability_base_damage=ability_base_damage,
        attacker_attack=attacker_attack,
        defender_defense=defender_defense,
        base_damage=damage_before_type,
        type_multiplier=type_multiplier,
        final_damage=final_damage,
        turn_number=turn_number,
      )

