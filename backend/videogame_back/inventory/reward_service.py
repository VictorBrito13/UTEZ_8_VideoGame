import random

from django.db import transaction
from django.db.utils import DatabaseError, IntegrityError, OperationalError
from utils.log import logger

from .models import Inventory, InventoryItem, Object

# Rarity weights as defined in models (60%, 30%, 10%, 2%)
# We normalize them to sum 102 as per label, or just 100 base.
RARITY_WEIGHTS = {
  "COMMON": 60,
  "UNCOMMON": 30,
  "RARE": 10,
  "LEGENDARY": 2,
}


@transaction.atomic
def award_battle_rewards(user, count=3):
  """
  Awards 'count' random items to a user based on rarity weights.
  Returns a list of dictionaries with info about granted items.
  """
  try:
    inventory, _ = Inventory.objects.get_or_create(user=user)
    items_awarded = []

    objects_by_rarity = {
      rarity: list(Object.objects.filter(rarity=rarity))
      for rarity in RARITY_WEIGHTS.keys()
    }

    rarities = list(RARITY_WEIGHTS.keys())
    weights = list(RARITY_WEIGHTS.values())

    for _ in range(count):
      selected_rarity = random.choices(rarities, weights=weights, k=1)[0]

      possible_objects = objects_by_rarity[selected_rarity]

      if not possible_objects:
        possible_objects = objects_by_rarity["COMMON"]

      if not possible_objects:
        continue

      selected_object = random.choice(possible_objects)

      inv_item, _ = InventoryItem.objects.get_or_create(
        inventory=inventory, object=selected_object, defaults={"quantity": 0}
      )
      inv_item.quantity += 1
      inv_item.save()

      items_awarded.append(
        {
          "id": selected_object.id,
          "name": selected_object.name,
          "rarity": selected_object.rarity,
          "vfx_type": selected_object.vfx_type,
        }
      )

    return items_awarded
  except (OperationalError, IntegrityError, DatabaseError) as exc:
    logger.opt(exception=exc).error(
      "award_battle_rewards database error user_id={} count={}",
      getattr(user, "pk", None),
      count,
    )
    raise
