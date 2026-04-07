from django.db import transaction
from django.core.exceptions import ValidationError

from .models import InventoryItem
from user_profile.models import UserCreature


@transaction.atomic
def use_object(user, object_id, target_creature_id=None):

  item = InventoryItem.objects.select_for_update().get(
    inventory=user.inventory, object_id=object_id
  )

  if item.quantity <= 0:
    raise ValidationError("No items available")

  # aplicar efecto
  if target_creature_id:
    creature = UserCreature.objects.select_for_update().get(
      id=target_creature_id, user=user
    )

    apply_effect(item.object, creature)

  # consumir objeto
  item.quantity -= 1
  item.save()

  return {"object": item.object.name, "remaining": item.quantity}


def apply_effect(obj, creature):

  if obj.effect_type == "heal":
    creature.current_health += obj.effect_value

  elif obj.effect_type == "damage":
    creature.current_health -= obj.effect_value

  elif obj.effect_type == "buff_attack":
    creature.creature.attack += obj.effect_value

  elif obj.effect_type == "buff_speed":
    creature.creature.speed += obj.effect_value

  if creature.current_health < 0:
    creature.current_health = 0

  creature.save()
