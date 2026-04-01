from combat.models import Battle
from django.contrib.auth.models import User
from django.db import models


class ChatMessage(models.Model):
  battle = models.ForeignKey(Battle, on_delete=models.CASCADE)
  sender = models.ForeignKey(User, on_delete=models.CASCADE)
  message = models.TextField()
  created_at = models.DateTimeField(auto_now_add=True)
