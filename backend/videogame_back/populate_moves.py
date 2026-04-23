import os
import django
import time
import requests

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videogame_back.settings")
django.setup()

from creatures.models import Creature, Type, Ability, CreatureAbility

TYPE_VFX_MAPPING = {
    "fire": "FIRE_FX",
    "water": "WATER_FX",
    "grass": "GRASS_FX",
    "electric": "WATER_FX",
    "ice": "WATER_FX",
    "bug": "GRASS_FX",
    "psychic": "SPECIAL_HIT",
    "ghost": "SPECIAL_HIT",
    "dragon": "SPECIAL_HIT",
    "dark": "SPECIAL_HIT",
    "poison": "SPECIAL_HIT",
    "flying": "SPECIAL_HIT",
    "ground": "PHYSICAL_HIT",
    "rock": "PHYSICAL_HIT",
    "fighting": "PHYSICAL_HIT",
    "steel": "PHYSICAL_HIT",
    "normal": "PHYSICAL_HIT",
}

POKEAPI_BASE = "https://pokeapi.co/api/v2"


def normalize_name(name: str) -> str:
    return name.replace("-", " ").title()


def get_move_details(move_url: str) -> dict | None:
    try:
        response = requests.get(move_url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return {
            "name": normalize_name(data["name"]),
            "power": data["power"] or 40,
            "move_type": data["type"]["name"].lower(),
            "damage_class": data["damage_class"]["name"],
        }
    except Exception as exc:
        print(f"  [WARN] Failed to fetch move data from {move_url}: {exc}")
        return None


def pick_moves(pokemon_data: dict) -> list[dict]:
    moves = []
    for move_entry in pokemon_data.get("moves", []):
        move_info = move_entry.get("move")
        if not move_info:
            continue
        level_up_entries = [
            detail
            for detail in move_entry.get("version_group_details", [])
            if detail["version_group"]["name"] == "black-white"
            and detail["move_learn_method"]["name"] == "level-up"
        ]
        if not level_up_entries:
            continue

        learned_at = min(d["level_learned_at"] for d in level_up_entries)
        moves.append((learned_at, move_info))

    moves.sort(key=lambda item: item[0])
    selected = [move_info for _, move_info in moves[:8]]
    result = []
    for move_info in selected:
        details = get_move_details(move_info["url"])
        if details:
            result.append(details)
            if len(result) >= 4:
                break
        time.sleep(0.12)

    return result


def get_ability_for_move(move_data: dict) -> Ability:
    ability, created = Ability.objects.get_or_create(
        name=move_data["name"],
        defaults={
            "base_power": move_data["power"],
            "damage_multiplier": 1.0,
            "move_type": Type.objects.filter(name=move_data["move_type"]).first(),
            "effect": "",
            "effect_probability": 0.0,
            "vfx_type": TYPE_VFX_MAPPING.get(move_data["move_type"], "PHYSICAL_HIT"),
        },
    )

    if not created:
        updated = False
        if ability.base_power != move_data["power"]:
            ability.base_power = move_data["power"]
            updated = True
        if ability.move_type is None:
            move_type = Type.objects.filter(name=move_data["move_type"]).first()
            if move_type is not None:
                ability.move_type = move_type
                updated = True
        if updated:
            ability.save()

    return ability


def populate_moves_for_creature(creature: Creature) -> None:
    print(f"Populating moves for {creature}")
    existing_count = CreatureAbility.objects.filter(creature=creature).count()
    if existing_count >= 4:
        print("  Already has 4 or more moves. Skipping.")
        return

    if not creature.pokedex_id:
        print("  Creature has no Pokédex ID. Skipping.")
        return

    try:
        response = requests.get(f"{POKEAPI_BASE}/pokemon/{creature.pokedex_id}", timeout=10)
        response.raise_for_status()
        pokemon_data = response.json()
    except Exception as exc:
        print(f"  [ERROR] Failed to fetch Pokémon data for {creature.name}: {exc}")
        return

    moves = pick_moves(pokemon_data)
    if not moves:
        print("  No valid moves found from API. Skipping.")
        return

    for move_data in moves:
        ability = get_ability_for_move(move_data)
        if CreatureAbility.objects.filter(creature=creature, ability=ability).exists():
            print(f"  Move already linked: {ability.name}")
            continue
        CreatureAbility.objects.create(creature=creature, ability=ability)
        print(f"  Added move {ability.name}")


if __name__ == "__main__":
    creatures = Creature.objects.all().order_by("pokedex_id")
    print(f"Found {creatures.count()} creatures.")
    for creature in creatures:
        populate_moves_for_creature(creature)
        time.sleep(0.15)

    print("\nDone populating moves.")
