from django.contrib.auth.models import User
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Battle(models.Model):
  class BattleStatus(models.TextChoices):
    WAITING = "waiting", "Waiting"
    PLAYING = "playing", "Playing"
    FINISHED = "finished", "Finished"

  player1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="p1")
  player2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="p2")
  status = models.CharField(
    max_length=20, choices=BattleStatus.choices, default=BattleStatus.WAITING
  )
  current_turn = models.ForeignKey(
    User,
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name="battle_turns",
    help_text="Player whose turn it is",
  )
  turn_number = models.PositiveIntegerField(
    default=1, validators=[MinValueValidator(1)]
  )
  winner = models.ForeignKey(
    User, null=True, blank=True, on_delete=models.SET_NULL
  )
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  def __str__(self):
    return f"Battle {self.id}: {self.player1.username} vs {self.player2.username} ({self.status})"

  def is_player_turn(self, user):
    """Check if it's the user's turn"""
    return self.current_turn == user

  def can_start_battle(self):
    """Check if battle can be started"""
    return self.status == self.BattleStatus.WAITING

  def is_finished(self):
    """Check if battle is finished"""
    return self.status == self.BattleStatus.FINISHED
