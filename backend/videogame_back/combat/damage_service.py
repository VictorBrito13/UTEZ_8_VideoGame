from __future__ import annotations

from decimal import Decimal
from typing import Dict, Tuple

from django.contrib.auth.models import User
from utils.log import logger

from .damage_models import CreatureType, DamageCalculation, TypeEffectiveness


class DamageService:
  """Service for deterministic damage calculations"""

  @staticmethod
  def initialize_types_and_effectiveness():
    """Initialize 18 Pokemon types and effectiveness matrix"""
    # Create 18 Pokemon types
    types_data = [
      ("normal", "Normal"),
      ("fire", "Fire"),
      ("water", "Water"),
      ("grass", "Grass"),
      ("electric", "Electric"),
      ("ice", "Ice"),
      ("fighting", "Fighting"),
      ("poison", "Poison"),
      ("ground", "Ground"),
      ("flying", "Flying"),
      ("psychic", "Psychic"),
      ("bug", "Bug"),
      ("rock", "Rock"),
      ("ghost", "Ghost"),
      ("dragon", "Dragon"),
      ("dark", "Dark"),
      ("steel", "Steel"),
      ("fairy", "Fairy"),
    ]

    for name, display in types_data:
      CreatureType.objects.get_or_create(name=name)

    # Type effectiveness matrix - Pokemon standard rules
    # Format: (attacking_type, defending_type, multiplier)
    effectiveness_data = [
      # Normal type attacks
      ("normal", "rock", Decimal("0.5")),
      ("normal", "ghost", Decimal("0")),
      ("normal", "steel", Decimal("0.5")),
      
      # Fire type attacks
      ("fire", "fire", Decimal("0.5")),
      ("fire", "water", Decimal("0.5")),
      ("fire", "grass", Decimal("2.0")),
      ("fire", "ice", Decimal("2.0")),
      ("fire", "bug", Decimal("2.0")),
      ("fire", "steel", Decimal("2.0")),
      ("fire", "rock", Decimal("0.5")),
      ("fire", "dragon", Decimal("0.5")),
      
      # Water type attacks
      ("water", "fire", Decimal("2.0")),
      ("water", "water", Decimal("0.5")),
      ("water", "grass", Decimal("0.5")),
      ("water", "ground", Decimal("2.0")),
      ("water", "rock", Decimal("2.0")),
      ("water", "dragon", Decimal("0.5")),
      
      # Grass type attacks
      ("grass", "fire", Decimal("0.5")),
      ("grass", "water", Decimal("2.0")),
      ("grass", "grass", Decimal("0.5")),
      ("grass", "poison", Decimal("0.5")),
      ("grass", "ground", Decimal("2.0")),
      ("grass", "flying", Decimal("0.5")),
      ("grass", "bug", Decimal("0.5")),
      ("grass", "rock", Decimal("2.0")),
      ("grass", "dragon", Decimal("0.5")),
      
      # Electric type attacks
      ("electric", "water", Decimal("2.0")),
      ("electric", "grass", Decimal("0.5")),
      ("electric", "electric", Decimal("0.5")),
      ("electric", "flying", Decimal("2.0")),
      ("electric", "dragon", Decimal("0.5")),
      
      # Ice type attacks
      ("ice", "fire", Decimal("0.5")),
      ("ice", "water", Decimal("0.5")),
      ("ice", "grass", Decimal("2.0")),
      ("ice", "ice", Decimal("0.5")),
      ("ice", "flying", Decimal("2.0")),
      ("ice", "ground", Decimal("2.0")),
      ("ice", "dragon", Decimal("2.0")),
      
      # Fighting type attacks
      ("fighting", "normal", Decimal("2.0")),
      ("fighting", "flying", Decimal("0.5")),
      ("fighting", "poison", Decimal("0.5")),
      ("fighting", "rock", Decimal("2.0")),
      ("fighting", "bug", Decimal("0.5")),
      ("fighting", "ghost", Decimal("0")),
      ("fighting", "dark", Decimal("2.0")),
      ("fighting", "steel", Decimal("2.0")),
      ("fighting", "fairy", Decimal("0.5")),
      ("fighting", "psychic", Decimal("0.5")),
      
      # Poison type attacks
      ("poison", "grass", Decimal("2.0")),
      ("poison", "poison", Decimal("0.5")),
      ("poison", "ground", Decimal("0.5")),
      ("poison", "rock", Decimal("0.5")),
      ("poison", "ghost", Decimal("0.5")),
      ("poison", "steel", Decimal("0")),
      ("poison", "fairy", Decimal("2.0")),
      
      # Ground type attacks
      ("ground", "fire", Decimal("2.0")),
      ("ground", "grass", Decimal("0.5")),
      ("ground", "water", Decimal("0.5")),
      ("ground", "poison", Decimal("2.0")),
      ("ground", "rock", Decimal("2.0")),
      ("ground", "flying", Decimal("0")),
      ("ground", "bug", Decimal("0.5")),
      ("ground", "steel", Decimal("2.0")),
      ("ground", "electric", Decimal("2.0")),
      
      # Flying type attacks
      ("flying", "fighting", Decimal("2.0")),
      ("flying", "bug", Decimal("2.0")),
      ("flying", "grass", Decimal("2.0")),
      ("flying", "rock", Decimal("0.5")),
      ("flying", "steel", Decimal("0.5")),
      ("flying", "electric", Decimal("0.5")),
      
      # Psychic type attacks
      ("psychic", "fighting", Decimal("2.0")),
      ("psychic", "poison", Decimal("2.0")),
      ("psychic", "psychic", Decimal("0.5")),
      ("psychic", "dark", Decimal("0")),
      ("psychic", "steel", Decimal("0.5")),
      
      # Bug type attacks
      ("bug", "grass", Decimal("2.0")),
      ("bug", "psychic", Decimal("2.0")),
      ("bug", "dark", Decimal("2.0")),
      ("bug", "fire", Decimal("0.5")),
      ("bug", "fighting", Decimal("0.5")),
      ("bug", "flying", Decimal("0.5")),
      ("bug", "poison", Decimal("0.5")),
      ("bug", "ghost", Decimal("0.5")),
      ("bug", "steel", Decimal("0.5")),
      ("bug", "fairy", Decimal("0.5")),
      
      # Rock type attacks
      ("rock", "fire", Decimal("2.0")),
      ("rock", "ice", Decimal("2.0")),
      ("rock", "flying", Decimal("2.0")),
      ("rock", "bug", Decimal("2.0")),
      ("rock", "water", Decimal("0.5")),
      ("rock", "grass", Decimal("0.5")),
      ("rock", "fighting", Decimal("0.5")),
      ("rock", "ground", Decimal("0.5")),
      ("rock", "steel", Decimal("0.5")),
      
      # Ghost type attacks
      ("ghost", "ghost", Decimal("2.0")),
      ("ghost", "psychic", Decimal("2.0")),
      ("ghost", "normal", Decimal("0")),
      ("ghost", "dark", Decimal("0.5")),
      
      # Dragon type attacks
      ("dragon", "dragon", Decimal("2.0")),
      ("dragon", "steel", Decimal("0.5")),
      ("dragon", "fairy", Decimal("0")),
      
      # Dark type attacks
      ("dark", "ghost", Decimal("2.0")),
      ("dark", "dark", Decimal("2.0")),
      ("dark", "fighting", Decimal("0.5")),
      ("dark", "fairy", Decimal("0.5")),
      ("dark", "psychic", Decimal("2.0")),
      
      # Steel type attacks
      ("steel", "ice", Decimal("2.0")),
      ("steel", "rock", Decimal("2.0")),
      ("steel", "fairy", Decimal("2.0")),
      ("steel", "fire", Decimal("0.5")),
      ("steel", "grass", Decimal("0.5")),
      ("steel", "ice", Decimal("2.0")),
      ("steel", "normal", Decimal("2.0")),
      ("steel", "flying", Decimal("2.0")),
      ("steel", "psychic", Decimal("2.0")),
      ("steel", "bug", Decimal("2.0")),
      ("steel", "rock", Decimal("2.0")),
      ("steel", "dragon", Decimal("2.0")),
      ("steel", "steel", Decimal("0.5")),
      ("steel", "water", Decimal("0.5")),
      ("steel", "electric", Decimal("0.5")),
      ("steel", "grass", Decimal("0.5")),
      
      # Fairy type attacks
      ("fairy", "fighting", Decimal("2.0")),
      ("fairy", "bug", Decimal("2.0")),
      ("fairy", "dark", Decimal("2.0")),
      ("fairy", "fire", Decimal("0.5")),
      ("fairy", "poison", Decimal("0.5")),
      ("fairy", "steel", Decimal("0.5")),
      ("fairy", "dragon", Decimal("2.0")),
    ]

    # Add all same-type matchups as 1.0x (normal effectiveness)
    for type_name, _ in types_data:
      effectiveness_data.append((type_name, type_name, Decimal("1.0")))

    # Create effectiveness entries
    for attacking, defending, multiplier in effectiveness_data:
      try:
        attacking_type = CreatureType.objects.get(name=attacking)
        defending_type = CreatureType.objects.get(name=defending)
        TypeEffectiveness.objects.get_or_create(
          attacking_type=attacking_type,
          defending_type=defending_type,
          defaults={"multiplier": multiplier},
        )
      except CreatureType.DoesNotExist:
        logger.error(f"Type not found: {attacking} or {defending}")

    # Add immunity entries (where missing, default to 1.0x)
    # This ensures all combinations exist
    for attacking_name, _ in types_data:
      for defending_name, _ in types_data:
        try:
          attacking_type = CreatureType.objects.get(name=attacking_name)
          defending_type = CreatureType.objects.get(name=defending_name)
          TypeEffectiveness.objects.get_or_create(
            attacking_type=attacking_type,
            defending_type=defending_type,
            defaults={"multiplier": Decimal("1.0")},
          )
        except CreatureType.DoesNotExist:
          pass

    logger.info("Pokemon type system initialized with 18 types")

  @staticmethod
  def calculate_attack_damage(
    battle,
    attacker: User,
    defender: User,
    attacking_type_name: str,
    defending_type_name: str,
    ability_base_damage: int,
    attacker_attack: int,
    defender_defense: int,
    turn_number: int,
  ) -> Dict:
    """
    Calculate damage using enhanced formula:
    total_attack = ability_base_damage + attacker_attack
    defense_factor = max(1, total_attack - defender_defense)
    Damage_final = defense_factor * type_multiplier
    """
    try:
      # Get types
      attacking_type = CreatureType.objects.get(name=attacking_type_name)
      defending_type = CreatureType.objects.get(name=defending_type_name)

      # Calculate damage
      damage_calc = DamageCalculation.calculate_damage(
        battle=battle,
        attacker_id=attacker.id,
        defender_id=defender.id,
        attacking_type=attacking_type,
        defending_type=defending_type,
        ability_base_damage=ability_base_damage,
        attacker_attack=attacker_attack,
        defender_defense=defender_defense,
        turn_number=turn_number,
      )

      return {
        "success": True,
        "ability_base_damage": ability_base_damage,
        "attacker_attack": attacker_attack,
        "defender_defense": defender_defense,
        "base_damage": damage_calc.base_damage,
        "type_multiplier": str(damage_calc.type_multiplier),
        "final_damage": damage_calc.final_damage,
        "formula": (
          f"({ability_base_damage} + {attacker_attack}) - {defender_defense} = {damage_calc.base_damage}, "
          f"then {damage_calc.base_damage} * {damage_calc.type_multiplier} = {damage_calc.final_damage}"
        ),
        "attacking_type": attacking_type_name,
        "defending_type": defending_type_name,
      }

    except Exception as e:
      logger.error(f"Error calculating damage: {e}")
      return {"success": False, "error": str(e)}

  @staticmethod
  def validate_attack_payload(payload: dict) -> Tuple[bool, str]:
    """Validate attack payload"""
    required = ["target_player_id", "attacking_type", "base_damage"]

    for field in required:
      if field not in payload:
        return False, f"Missing field: {field}"

    try:
      base_damage = int(payload["base_damage"])
      if base_damage <= 0 or base_damage > 999:
        return False, "Base damage must be between 1 and 999"
    except ValueError:
      return False, "Base damage must be integer"

    # Validate attacking type exists
    if not CreatureType.objects.filter(name=payload["attacking_type"]).exists():
      return False, f"Invalid attacking type: {payload['attacking_type']}"

    return True, ""
