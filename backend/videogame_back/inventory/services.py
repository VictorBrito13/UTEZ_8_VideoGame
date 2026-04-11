from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.utils import DatabaseError, IntegrityError, OperationalError
from user_profile.models import UserCreature
from utils.log import logger

from .models import InventoryItem


@transaction.atomic
def use_object(user, object_id, target_creature_id=None):
  try:
    item = InventoryItem.objects.select_for_update().get(
      inventory=user.inventory, object_id=object_id
    )

    if item.quantity <= 0:
      raise ValidationError("No items available")

    if target_creature_id:
      creature = UserCreature.objects.select_for_update().get(
        id=target_creature_id, user=user
      )

      apply_effect(item.object, creature)

    item.quantity -= 1
    item.save()

    return {"object": item.object.name, "remaining": item.quantity}
  except (OperationalError, IntegrityError, DatabaseError) as exc:
    logger.opt(exception=exc).error(
      "use_object database error user_id={} object_id={}",
      getattr(user, "pk", None),
      object_id,
    )
    raise


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
