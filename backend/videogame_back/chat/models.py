from django.db import models
from django.contrib.auth.models import User
from combat.models import Battle

class ChatMessage(models.Model):
    battle = models.ForeignKey(Battle, on_delete=models.CASCADE)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)