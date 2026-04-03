import os
import django

# Set environment and setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videogame_back.settings")
django.setup()

from inventory.models import Object

# List of 13 Competitive Objects with Rarity and VFX for the Final Sprint
COMPETITIVE_ITEMS = [
    # --- COMMON (Prob. 60%) ---
    {
        "name": "Potion",
        "description": "Restores 20 HP during or after combat.",
        "effect_type": "HEAL",
        "effect_value": 20.0,
        "rarity": "COMMON",
        "vfx_type": "HEAL"
    },
    {
        "name": "X-Attack",
        "description": "Temporarily increases damage by 15% in combat.",
        "effect_type": "BUFF_ATK",
        "effect_value": 0.15,
        "rarity": "COMMON",
        "vfx_type": "BUFF_ATK"
    },
    {
        "name": "X-Defense",
        "description": "Temporarily increases defense by 15% in combat.",
        "effect_type": "BUFF_DEF",
        "effect_value": 0.15,
        "rarity": "COMMON",
        "vfx_type": "BUFF_DEF"
    },
    {
        "name": "X-Speed",
        "description": "Gives you the initiative. Attack first for one turn.",
        "effect_type": "BUFF_SPEED",
        "effect_value": 1.0,
        "rarity": "COMMON",
        "vfx_type": "BUFF_SPEED"
    },
    {
        "name": "Oran Berry",
        "description": "Automatically restores 10 HP when health is low.",
        "effect_type": "AUTO_HEAL",
        "effect_value": 10.0,
        "rarity": "COMMON",
        "vfx_type": "HEAL"
    },
    
    # --- UNCOMMON (Prob. 30%) ---
    {
        "name": "Super Potion",
        "description": "Restores 50 HP during or after combat.",
        "effect_type": "HEAL",
        "effect_value": 50.0,
        "rarity": "UNCOMMON",
        "vfx_type": "HEAL"
    },
    {
        "name": "Protein",
        "description": "Permanently increases base Attack stat by 2 points.",
        "effect_type": "PERM_ATK",
        "effect_value": 2.0,
        "rarity": "UNCOMMON",
        "vfx_type": "BUFF_ATK"
    },
    {
        "name": "Iron",
        "description": "Permanently increases base Defense stat by 2 points.",
        "effect_type": "PERM_DEF",
        "effect_value": 2.0,
        "rarity": "UNCOMMON",
        "vfx_type": "BUFF_DEF"
    },
    {
        "name": "Carbos",
        "description": "Permanently increases base Speed stat by 2 points.",
        "effect_type": "PERM_SPEED",
        "effect_value": 2.0,
        "rarity": "UNCOMMON",
        "vfx_type": "BUFF_SPEED"
    },
    {
        "name": "Revive",
        "description": "Brings a fainted creature back to half health.",
        "effect_type": "REVIVE",
        "effect_value": 0.5,
        "rarity": "UNCOMMON",
        "vfx_type": "REVIVE"
    },

    # --- RARE (Prob. 10%) ---
    {
        "name": "Hyper Potion",
        "description": "Restores 200 HP. A professional healer's choice.",
        "effect_type": "HEAL",
        "effect_value": 200.0,
        "rarity": "RARE",
        "vfx_type": "HEAL"
    },
    {
        "name": "Choice Band",
        "description": "Boosts damage by 50% but locks you into one move.",
        "effect_type": "EQUIP_ATK",
        "effect_value": 1.5,
        "rarity": "RARE",
        "vfx_type": "EQUIP"
    },
    {
        "name": "Focus Band",
        "description": "Prevents fainting once per match, leaving 1 HP.",
        "effect_type": "EQUIP_SURVIVE",
        "effect_value": 1.0,
        "rarity": "RARE",
        "vfx_type": "EQUIP"
    }
]

def populate_items():
    print("Purging existing Object data...")
    Object.objects.all().delete()
    
    print("Starting process to populate 13 items with Rarity and VFX...")
    count = 0
    for item_data in COMPETITIVE_ITEMS:
        Object.objects.create(**item_data)
        count += 1
        print(f"[{count}] Added {item_data['name']} ({item_data['rarity']})")

# EJECUCIÃ“N DIRECTA (PARA EL SHELL)
populate_items()
print("\n¡Listo! Las pociones y objetos con RAREZA han sido registrados.")
