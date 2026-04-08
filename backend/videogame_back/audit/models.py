from django.db import models
from django.contrib.auth.models import User
from core.middleware import get_current_user, get_current_ip


class AuditLog(models.Model):
  table_name = models.CharField(max_length=100)
  record_id = models.IntegerField()

  action = models.CharField(max_length=10)  # CREATE, UPDATE, DELETE

  field_name = models.CharField(max_length=100, null=True, blank=True)
  old_value = models.TextField(null=True, blank=True)
  new_value = models.TextField(null=True, blank=True)

  timestamp = models.DateTimeField(auto_now_add=True)

  user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
  host = models.CharField(max_length=100, null=True, blank=True)

  def save(self, *args, **kwargs):
    if not self.user:
      self.user = get_current_user()

    if not self.host:
      self.host = get_current_ip()

    super().save(*args, **kwargs)

  def __str__(self):
    return f"{self.table_name} - {self.action} - {self.timestamp}"
