from django.db import models
from django.contrib.auth.models import User


class Object(models.Model):
  name = models.CharField(max_length=100)
  description = models.TextField()
  effect_type = models.CharField(max_length=50)
  effect_value = models.FloatField()

  def __str__(self):
    return self.name


class Inventory(models.Model):
  user = models.OneToOneField(
    User, on_delete=models.CASCADE, related_name="inventory"
  )

  def __str__(self):
    return f"Inventory of {self.user.username}"


class InventoryItem(models.Model):
  inventory = models.ForeignKey(
    Inventory, on_delete=models.CASCADE, related_name="items"
  )
  object = models.ForeignKey(Object, on_delete=models.CASCADE)
  quantity = models.IntegerField()

  def clean(self):
    if self.quantity < 0:
      raise ValueError("Quantity cannot be negative")

  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)
