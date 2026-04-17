from django.db import models


class Type(models.Model):
  name = models.CharField(max_length=50)

  def __str__(self):
    return self.name


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
  Enhanced with VFX types for the UI.
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
  damage_multiplier = models.FloatField()
  effect = models.CharField(max_length=100, blank=True)
  effect_probability = models.FloatField()

  # Final Sprint Field
  vfx_type = models.CharField(
    max_length=20, choices=VFX_CHOICES, default="PHYSICAL_HIT"
  )

  def clean(self):
    if not (0 <= self.effect_probability <= 1):
      raise ValueError("Probability must be between 0 and 1")

  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)

  def __str__(self):
    return f"[{self.vfx_type}] {self.name}"


class CreatureAbility(models.Model):
  creature = models.ForeignKey(Creature, on_delete=models.CASCADE)
  ability = models.ForeignKey(Ability, on_delete=models.CASCADE)

  class Meta:
    unique_together = ("creature", "ability")
