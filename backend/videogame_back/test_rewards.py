import os
import django
import pytest

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videogame_back.settings")
django.setup()

from django.contrib.auth.models import User
from inventory.models import Object, InventoryItem, Inventory
from inventory.reward_service import award_battle_rewards


@pytest.mark.django_db
def test_rewards():
  # 1. Ensure we have some objects in the DB
  if Object.objects.count() == 0:
    print("Creating mock objects...")
    Object.objects.create(
      name="Potion",
      description="Heals",
      effect_type="heal",
      effect_value=20,
      rarity="COMMON",
    )
    Object.objects.create(
      name="Super Potion",
      description="Heals more",
      effect_type="heal",
      effect_value=50,
      rarity="UNCOMMON",
    )
    Object.objects.create(
      name="Rare Candy",
      description="Level up",
      effect_type="buff_level",
      effect_value=1,
      rarity="RARE",
    )
    Object.objects.create(
      name="Master Ball",
      description="Catch any",
      effect_type="catch",
      effect_value=100,
      rarity="LEGENDARY",
    )

  # 2. Get or create a test user
  user, _ = User.objects.get_or_create(username="testplayer_reward")

  # 3. Clear previous inventory for test clarity
  InventoryItem.objects.filter(inventory__user=user).delete()

  print(f"Awarding rewards to {user.username}...")
  rewards = award_battle_rewards(user, count=3)

  print("\nItems awarded:")
  for i, r in enumerate(rewards, 1):
    print(f"{i}. {r['name']} ({r['rarity']})")

  # 4. Verify inventory
  inventory = Inventory.objects.get(user=user)
  items = InventoryItem.objects.filter(inventory=inventory)

  print("\nFinal Inventory Count:")
  total_qty = 0
  for item in items:
    print(f"- {item.object.name}: x{item.quantity}")
    total_qty += item.quantity

  if total_qty == 3:
    print("\nSUCCESS: 3 items awarded correctly.")
  else:
    print(f"\nFAILURE: Expected 3 items, got {total_qty}.")


if __name__ == "__main__":
  test_rewards()
