from django.db import models
from django.contrib.auth.models import User


class Battle(models.Model):
  player1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="p1")
  player2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="p2")
  status = models.CharField(max_length=20)
  winner = models.ForeignKey(
    User, null=True, blank=True, on_delete=models.SET_NULL
  )
  created_at = models.DateTimeField(auto_now_add=True)
