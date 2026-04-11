import random
from django.db import transaction
from .models import Object, Inventory, InventoryItem

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
  inventory, _ = Inventory.objects.get_or_create(user=user)
  items_awarded = []

  # Get all possible objects grouped by rarity to avoid repeated queries
  objects_by_rarity = {
    rarity: list(Object.objects.filter(rarity=rarity))
    for rarity in RARITY_WEIGHTS.keys()
  }

  rarities = list(RARITY_WEIGHTS.keys())
  weights = list(RARITY_WEIGHTS.values())

  for _ in range(count):
    # 1. Roll for rarity
    selected_rarity = random.choices(rarities, weights=weights, k=1)[0]

    # 2. Pick a random object of that rarity
    possible_objects = objects_by_rarity[selected_rarity]

    # Fallback if no objects exist for a certain rarity
    if not possible_objects:
      # Try to fall back to COMMON
      possible_objects = objects_by_rarity["COMMON"]

    if not possible_objects:
      continue  # Should not happen if DB is populated

    selected_object = random.choice(possible_objects)

    # 3. Add to inventory
    inv_item, created = InventoryItem.objects.get_or_create(
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
