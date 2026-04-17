import base64
from django.db import models
from django.contrib.auth.models import User
from creatures.models import Creature


class Profile(models.Model):
  """
  User Profile to store trainer attributes like avatars and personal photos.
  """

  user = models.OneToOneField(
    User, on_delete=models.CASCADE, related_name="profile"
  )

  # Game Avatar (Trainer Sprite)
  trainer_sprite = models.CharField(max_length=255, default="trainer_red.png")

  # Personal Photo (Binary/Base64)
  foto_binaria = models.BinaryField(null=True, blank=True)
  # Photo Media
  foto = models.ImageField(upload_to='profiles/', null=True, blank=True)

  bio = models.TextField(max_length=500, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)

  @property
  def foto_base64(self):
    if self.foto_binaria:
      # Converts bytes to a base64 encoded string
      codificado = base64.b64encode(self.foto_binaria).decode("utf-8")
      return f"data:image/jpeg;base64,{codificado}"
    return None

  def __str__(self):
    return f"{self.user.username}'s Profile"


class UserCreature(models.Model):
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="creatures"
  )
  creature = models.ForeignKey(Creature, on_delete=models.CASCADE)
  level = models.IntegerField(default=1)
  current_hp = models.IntegerField()

  def clean(self):
    if self.level <= 0:
      raise ValueError("Level must be positive")

  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)

  def __str__(self):
    return f"{self.user.username}'s {self.creature.name} (Lvl {self.level})"


class Team(models.Model):
  user = models.OneToOneField(
    User, on_delete=models.CASCADE, related_name="team"
  )

  def is_full(self):
    return self.team_creatures.count() >= 3

  def __str__(self):
    return f"{self.user.username}'s Team"


class TeamCreature(models.Model):
  team = models.ForeignKey(
    Team, on_delete=models.CASCADE, related_name="team_creatures"
  )
  user_creature = models.ForeignKey(UserCreature, on_delete=models.CASCADE)

  def clean(self):
    if not self.pk and self.team.team_creatures.count() >= 3:
      raise ValueError("Max 3 creatures per team")

    if (
      not self.pk
      and self.team.team_creatures.filter(
        user_creature=self.user_creature
      ).exists()
    ):
      raise ValueError("Creature is already in the team")

  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)


class Ranking(models.Model):
  user = models.OneToOneField(User, on_delete=models.CASCADE)
  wins = models.IntegerField(default=0)
  losses = models.IntegerField(default=0)
  elo = models.IntegerField(default=1000)

  def __str__(self):
    return f"{self.user.username} (ELO: {self.elo})"
  
  def clean(self):
    # Security: Validations to prevent data corruption
    if self.wins < 0:
      raise ValueError("Wins cannot be negative")
    if self.losses < 0:
      raise ValueError("Losses cannot be negative")
    if self.elo < 0:
      raise ValueError("ELO cannot be negative")
    # Security: Validate reasonable ELO range (0-4000)
    if self.elo > 4000:
      raise ValueError("ELO exceeds maximum allowed value")
      
  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)
