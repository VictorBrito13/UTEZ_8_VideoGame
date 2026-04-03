from django.contrib.auth.models import User
from django.db import models
from django.core.exceptions import ValidationError

class Object(models.Model):
    """
    Items available for purchase or rewards.
    Enhanced with rarity and visual effects for the Roguelike system.
    """
    RARITY_CHOICES = [
        ('COMMON', 'Common (60%)'),
        ('UNCOMMON', 'Uncommon (30%)'),
        ('RARE', 'Rare (10%)'),
        ('LEGENDARY', 'Legendary (2%)'),
    ]

    VFX_CHOICES = [
        ('HEAL', 'Green Crosses'),
        ('BUFF_ATK', 'Red Sword Aura'),
        ('BUFF_DEF', 'Blue Shield Aura'),
        ('BUFF_SPEED', 'Yellow Wings'),
        ('REVIVE', 'Golden Glow'),
        ('EQUIP', 'Sparkle Static'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField()
    effect_type = models.CharField(max_length=50)
    effect_value = models.FloatField()
    
    # New fields for the Final Sprint
    rarity = models.CharField(max_length=20, choices=RARITY_CHOICES, default='COMMON')
    vfx_type = models.CharField(max_length=20, choices=VFX_CHOICES, default='HEAL')

    def __str__(self):
        return f"[{self.rarity}] {self.name}"


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
    quantity = models.IntegerField(default=1)

    def clean(self):
        if self.quantity < 0:
            raise ValueError("Quantity cannot be negative")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.inventory.user.username} - {self.object.name} x{self.quantity}"
  inventory = models.ForeignKey(
    Inventory, on_delete=models.CASCADE, related_name="items"
  )
  object = models.ForeignKey(Object, on_delete=models.CASCADE)
  quantity = models.IntegerField(default=0)

  def clean(self):
    if self.quantity < 0:
      raise ValidationError("Quantity cannot be negative")

  def save(self, *args, **kwargs):
    self.full_clean()
    super().save(*args, **kwargs)
