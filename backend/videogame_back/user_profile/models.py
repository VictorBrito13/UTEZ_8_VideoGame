from django.db import models
from django.contrib.auth.models import User
from creatures.models import Creature


class UserCreature(models.Model):
  user = models.ForeignKey(
    User, on_delete=models.CASCADE, related_name="creatures"
  )
  creature = models.ForeignKey(Creature, on_delete=models.CASCADE)
  level = models.IntegerField(default=1)
  health = models.IntegerField()

  def clean(self):
    if self.level <= 0:
      raise ValueError("Level must be positive")

  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)


class Team(models.Model):
  user = models.OneToOneField(
    User, on_delete=models.CASCADE, related_name="team"
  )


class TeamCreature(models.Model):
  team = models.ForeignKey(
    Team, on_delete=models.CASCADE, related_name="team_creatures"
  )
  user_creature = models.ForeignKey(UserCreature, on_delete=models.CASCADE)

  def clean(self):
    if self.team.team_creatures.count() >= 3:
      raise ValueError("Max 3 creatures per team")

  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)


class Ranking(models.Model):
  user = models.OneToOneField(User, on_delete=models.CASCADE)
  wins = models.IntegerField(default=0)
  losses = models.IntegerField(default=0)
  elo = models.IntegerField(default=1000)
