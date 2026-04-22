from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Type(models.Model):
  name = models.CharField(max_length=50)

  def __str__(self):
    return self.name


class SpecialAbility(models.Model):
  """
  Passive special abilities that activate during battle with 30% probability.
  Examples: Paralyze, Burn, Freeze, etc.
  """
  
  EFFECT_CHOICES = [
    ("PARALYZE", "Paralyze - Reduce opponent speed by 75%"),
    ("BURN", "Burn - Reduce opponent attack by 50%"),
    ("FREEZE", "Freeze - Opponent skips next turn"),
    ("POISON", "Poison - Damage per turn"),
    ("CONFUSION", "Confusion - Opponent may attack self"),
    ("SLEEP", "Sleep - Opponent sleeps for 1-3 turns"),
  ]
  
  name = models.CharField(max_length=100)
  effect_type = models.CharField(max_length=20, choices=EFFECT_CHOICES)
  trigger_probability = models.FloatField(
    default=0.3,
    validators=[MinValueValidator(0), MaxValueValidator(1)],
    help_text="Probability of triggering this ability (default 30%)"
  )
  description = models.TextField(blank=True)
  
  def __str__(self):
    return f"{self.name} ({self.effect_type})"


class Creature(models.Model):
  """
  Enhanced model for 100 base-form Pokemon with 6 stats and animated sprites.
  """

  name = models.CharField(max_length=100)
  pokedex_id = models.IntegerField(unique=True, null=True, blank=True)

  # Types
  type_1 = models.ForeignKey(
    Type, on_delete=models.CASCADE, related_name="creatures_main"
  )
  type_2 = models.ForeignKey(
    Type,
    on_delete=models.CASCADE,
    related_name="creatures_secondary",
    null=True,
    blank=True,
  )

  # Special Ability
  special_ability = models.ForeignKey(
    SpecialAbility,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="creatures",
    help_text="Passive ability that triggers with 30% probability"
  )

  # Stats
  hp = models.IntegerField()
  attack = models.IntegerField()
  defense = models.IntegerField()
  special_attack = models.IntegerField()
  special_defense = models.IntegerField()
  speed = models.IntegerField()

  # Sprites
  front_sprite = models.URLField(max_length=500, null=True, blank=True)
  back_sprite = models.URLField(max_length=500, null=True, blank=True)

  created_at = models.DateTimeField(auto_now_add=True)

  def clean(self):
    if self.hp <= 0:
      raise ValueError("HP must be positive")
    if self.attack <= 0:
      raise ValueError("Attack must be positive")

  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)

  def __str__(self):
    return f"#{self.pokedex_id} {self.name}"


class Ability(models.Model):
  """
  Abilities/Moves for Creatures.
  Enhanced with VFX types and base damage for the UI.
  """

  VFX_CHOICES = [
    ("FIRE_FX", "Red Flames"),
    ("WATER_FX", "Blue Bubbles"),
    ("GRASS_FX", "Green Leaves"),
    ("ELECTRIC_FX", "Yellow Sparks"),
    ("PHYSICAL_HIT", "Red Screen Shake"),
    ("SPECIAL_HIT", "Purple Screen Flash"),
  ]

  name = models.CharField(max_length=100)
  ability_type = models.ForeignKey(
    Type,
    on_delete=models.PROTECT,
    related_name="abilities",
    null=True,
    blank=True,
  )
  base_damage = models.PositiveIntegerField(default=20, help_text="Base damage of the ability")
  damage_multiplier = models.FloatField(default=1.0)
  effect = models.CharField(max_length=100, blank=True)
  effect_probability = models.FloatField(default=0.0)

  # Final Sprint Field
  vfx_type = models.CharField(
    max_length=20, choices=VFX_CHOICES, default="PHYSICAL_HIT"
  )

  def clean(self):
    if not (0 <= self.effect_probability <= 1):
      raise ValueError("Probability must be between 0 and 1")
    if self.base_damage <= 0:
      raise ValueError("Base damage must be positive")

  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)

  def __str__(self):
    type_name = self.ability_type.name if self.ability_type else "Unknown"
    return f"[{self.vfx_type}] {self.name} ({type_name} DMG: {self.base_damage})"


class CreatureAbility(models.Model):
  """
  Links creatures to their moves/abilities with slot ordering.
  Each creature can have max 4 moves (slots 1-4).
  """
  creature = models.ForeignKey(Creature, on_delete=models.CASCADE, related_name="creature_abilities")
  ability = models.ForeignKey(Ability, on_delete=models.CASCADE)
  slot = models.PositiveIntegerField(
    choices=[(1, "Slot 1"), (2, "Slot 2"), (3, "Slot 3"), (4, "Slot 4")],
    default=1,
    help_text="Ability slot (1-4)",
  )

  class Meta:
    unique_together = [("creature", "ability"), ("creature", "slot")]
    ordering = ["creature", "slot"]

  def clean(self):
    # Validate max 4 abilities per creature
    from django.core.exceptions import ValidationError
    if self.creature_id:
      count = CreatureAbility.objects.filter(creature=self.creature).count()
      if count >= 4 and (not self.id):  # Allow updates, only limit new additions
        raise ValidationError("Each creature can have maximum 4 abilities")

  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)

  def __str__(self):
    return f"{self.creature.name} - Slot {self.slot}: {self.ability.name}"
