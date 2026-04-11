import os
import django
import requests

# Set environment and setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videogame_back.settings")
django.setup()

from creatures.models import Creature, Type


def normalize_stats(stats_dict, target_bst=500):
  original_bst = sum(stats_dict.values())
  if original_bst == 0:
    return stats_dict

  multiplier = target_bst / original_bst
  normalized = {k: round(v * multiplier) for k, v in stats_dict.items()}

  # Adjust for rounding errors to ensure exact sum
  current_sum = sum(normalized.values())
  diff = target_bst - current_sum
  if diff != 0:
    highest_stat = max(normalized, key=normalized.get)
    normalized[highest_stat] += diff

  return normalized


def populate_base_creatures():
  print("Purging existing Creature data...")
  Creature.objects.all().delete()

  print("Pre-loading Pokemon Types...")
  all_types = [
    "Normal",
    "Fire",
    "Water",
    "Grass",
    "Electric",
    "Ice",
    "Fighting",
    "Poison",
    "Ground",
    "Flying",
    "Psychic",
    "Bug",
    "Rock",
    "Ghost",
    "Dragon",
    "Dark",
    "Steel",
    "Fairy",
  ]
  type_map = {}
  for t_name in all_types:
    t_obj, _ = Type.objects.get_or_create(name=t_name.lower())
    type_map[t_name.lower()] = t_obj

  print("\nStarting process to find 100 Base Pokemon (No Evolutions)...")
  count = 0
  current_id = 1

  while count < 100:
    try:
      # Check if this species is a "Base" form (no pre-evolution)
      species_resp = requests.get(
        f"https://pokeapi.co/api/v2/pokemon-species/{current_id}"
      )
      if species_resp.status_code != 200:
        current_id += 1
        continue

      species_data = species_resp.json()

      # If it evolves from another species, it's NOT a base form
      if species_data["evolves_from_species"] is not None:
        current_id += 1
        continue

      # Fetch Pokémon details
      pokemon_resp = requests.get(
        f"https://pokeapi.co/api/v2/pokemon/{current_id}"
      )
      data = pokemon_resp.json()

      # Extract and Normalize stats
      stats = {s["stat"]["name"]: s["base_stat"] for s in data["stats"]}
      mapped_stats = {
        "hp": stats["hp"],
        "attack": stats["attack"],
        "defense": stats["defense"],
        "special_attack": stats["special-attack"],
        "special_defense": stats["special-defense"],
        "speed": stats["speed"],
      }
      normalized = normalize_stats(mapped_stats)

      # Sprites (Gen 5 Animated)
      gen5_animated = data["sprites"]["versions"]["generation-v"][
        "black-white"
      ]["animated"]
      front = gen5_animated["front_default"] or data["sprites"]["front_default"]
      back = gen5_animated["back_default"] or data["sprites"]["back_default"]

      # Types
      t1_name = data["types"][0]["type"]["name"]
      t2_name = (
        data["types"][1]["type"]["name"] if len(data["types"]) > 1 else None
      )

      # Store in DB
      creature = Creature.objects.create(
        pokedex_id=current_id,
        name=data["name"].capitalize(),
        hp=normalized["hp"],
        attack=normalized["attack"],
        defense=normalized["defense"],
        special_attack=normalized["special_attack"],
        special_defense=normalized["special_defense"],
        speed=normalized["speed"],
        type_1=type_map[t1_name],
        type_2=type_map[t2_name] if t2_name else None,
        front_sprite=front,
        back_sprite=back,
      )
      count += 1
      print(f"[{count}] Added {creature.name} (Base ID: {current_id})")

    except Exception as e:
      print(f"Error processing ID {current_id}: {e}")

    current_id += 1


# EJECUCIÓN DIRECTA (PARA EL SHELL)
populate_base_creatures()
print("\nDONE! 100 Base Creatures (Pokemon) successfully registered.")
