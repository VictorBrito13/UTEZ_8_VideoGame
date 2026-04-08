import os
import django
import requests

# Set environment and setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videogame_back.settings")
django.setup()

from inventory.models import Object

# List of 13 Competitive Objects with Rarity and VFX for the Final Sprint
COMPETITIVE_ITEMS = [
  # --- COMMON (Prob. 60%) ---
  {
    "name": "Potion",
    "slug": "potion",
    "description": "Restores 20 HP during or after combat.",
    "effect_type": "HEAL",
    "effect_value": 20.0,
    "rarity": "COMMON",
    "vfx_type": "HEAL",
  },
  {
    "name": "X-Attack",
    "slug": "x-attack",
    "description": "Temporarily increases damage by 15% in combat.",
    "effect_type": "BUFF_ATK",
    "effect_value": 0.15,
    "rarity": "COMMON",
    "vfx_type": "BUFF_ATK",
  },
  {
    "name": "X-Defense",
    "slug": "x-defense",
    "description": "Temporarily increases defense by 15% in combat.",
    "effect_type": "BUFF_DEF",
    "effect_value": 0.15,
    "rarity": "COMMON",
    "vfx_type": "BUFF_DEF",
  },
  {
    "name": "X-Speed",
    "slug": "x-speed",
    "description": "Gives you the initiative. Attack first for one turn.",
    "effect_type": "BUFF_SPEED",
    "effect_value": 1.0,
    "rarity": "COMMON",
    "vfx_type": "BUFF_SPEED",
  },
  {
    "name": "Oran Berry",
    "slug": "oran-berry",
    "description": "Automatically restores 10 HP when health is low.",
    "effect_type": "AUTO_HEAL",
    "effect_value": 10.0,
    "rarity": "COMMON",
    "vfx_type": "HEAL",
  },
  # --- UNCOMMON (Prob. 30%) ---
  {
    "name": "Super Potion",
    "slug": "super-potion",
    "description": "Restores 50 HP during or after combat.",
    "effect_type": "HEAL",
    "effect_value": 50.0,
    "rarity": "UNCOMMON",
    "vfx_type": "HEAL",
  },
  {
    "name": "Protein",
    "slug": "protein",
    "description": "Permanently increases base Attack stat by 2 points.",
    "effect_type": "PERM_ATK",
    "effect_value": 2.0,
    "rarity": "UNCOMMON",
    "vfx_type": "BUFF_ATK",
  },
  {
    "name": "Iron",
    "slug": "iron",
    "description": "Permanently increases base Defense stat by 2 points.",
    "effect_type": "PERM_DEF",
    "effect_value": 2.0,
    "rarity": "UNCOMMON",
    "vfx_type": "BUFF_DEF",
  },
  {
    "name": "Carbos",
    "slug": "carbos",
    "description": "Permanently increases base Speed stat by 2 points.",
    "effect_type": "PERM_SPEED",
    "effect_value": 2.0,
    "rarity": "UNCOMMON",
    "vfx_type": "BUFF_SPEED",
  },
  {
    "name": "Revive",
    "slug": "revive",
    "description": "Brings a fainted creature back to half health.",
    "effect_type": "REVIVE",
    "effect_value": 0.5,
    "rarity": "UNCOMMON",
    "vfx_type": "REVIVE",
  },
  # --- RARE (Prob. 10%) ---
  {
    "name": "Hyper Potion",
    "slug": "hyper-potion",
    "description": "Restores 200 HP. A professional healer's choice.",
    "effect_type": "HEAL",
    "effect_value": 200.0,
    "rarity": "RARE",
    "vfx_type": "HEAL",
  },
  {
    "name": "Choice Band",
    "slug": "choice-band",
    "description": "Boosts damage by 50% but locks you into one move.",
    "effect_type": "EQUIP_ATK",
    "effect_value": 1.5,
    "rarity": "RARE",
    "vfx_type": "EQUIP",
  },
  {
    "name": "Focus Band",
    "slug": "focus-band",
    "description": "Prevents fainting once per match, leaving 1 HP.",
    "effect_type": "EQUIP_SURVIVE",
    "effect_value": 1.0,
    "rarity": "RARE",
    "vfx_type": "EQUIP",
  },
]


def populate_items():
  print("Purging existing Object data...")
  Object.objects.all().delete()

  print("Starting process to populate 13 items with Rarity, VFX, and Sprites...")
  count = 0
  for item_data in COMPETITIVE_ITEMS:
    slug = item_data.pop("slug")
    sprite_url = None

    try:
      print(f"Fetching sprite for {item_data['name']}...")
      resp = requests.get(f"https://pokeapi.co/api/v2/item/{slug}")
      if resp.status_code == 200:
        data = resp.json()
        sprite_url = data["sprites"]["default"]
    except Exception as e:
      print(f"Error fetching sprite for {slug}: {e}")

    Object.objects.create(sprite=sprite_url, **item_data)
    count += 1
    print(f"[{count}] Added {item_data['name']} ({item_data['rarity']}) - Sprite: {sprite_url}")


# EJECUCION DIRECTA
if __name__ == "__main__":
  populate_items()
  print("\nDONE! Potions and items with Rarity and Sprites successfully registered.")
