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
    """Initialize creature types and effectiveness matrix"""
    # Create basic types
    types_data = [
      ("fire", "Fire"),
      ("water", "Water"),
      ("earth", "Earth"),
      ("air", "Air"),
    ]

    for name, display in types_data:
      CreatureType.objects.get_or_create(name=name)

    # Create effectiveness matrix (factor_type values)
    # Fire strong vs Earth, weak vs Water
    TypeEffectiveness.objects.get_or_create(
      attacking_type=CreatureType.objects.get(name="fire"),
      defending_type=CreatureType.objects.get(name="earth"),
      defaults={"multiplier": Decimal("2.0")},
    )
    TypeEffectiveness.objects.get_or_create(
      attacking_type=CreatureType.objects.get(name="fire"),
      defending_type=CreatureType.objects.get(name="water"),
      defaults={"multiplier": Decimal("0.5")},
    )

    # Water strong vs Fire, weak vs Earth
    TypeEffectiveness.objects.get_or_create(
      attacking_type=CreatureType.objects.get(name="water"),
      defending_type=CreatureType.objects.get(name="fire"),
      defaults={"multiplier": Decimal("2.0")},
    )
    TypeEffectiveness.objects.get_or_create(
      attacking_type=CreatureType.objects.get(name="water"),
      defending_type=CreatureType.objects.get(name="earth"),
      defaults={"multiplier": Decimal("0.5")},
    )

    # Earth strong vs Water, weak vs Air
    TypeEffectiveness.objects.get_or_create(
      attacking_type=CreatureType.objects.get(name="earth"),
      defending_type=CreatureType.objects.get(name="water"),
      defaults={"multiplier": Decimal("2.0")},
    )
    TypeEffectiveness.objects.get_or_create(
      attacking_type=CreatureType.objects.get(name="earth"),
      defending_type=CreatureType.objects.get(name="air"),
      defaults={"multiplier": Decimal("0.5")},
    )

    # Air strong vs Earth, weak vs Fire
    TypeEffectiveness.objects.get_or_create(
      attacking_type=CreatureType.objects.get(name="air"),
      defending_type=CreatureType.objects.get(name="earth"),
      defaults={"multiplier": Decimal("2.0")},
    )
    TypeEffectiveness.objects.get_or_create(
      attacking_type=CreatureType.objects.get(name="air"),
      defending_type=CreatureType.objects.get(name="fire"),
      defaults={"multiplier": Decimal("0.5")},
    )

    # Same type = normal effectiveness
    for type_name in ["fire", "water", "earth", "air"]:
      TypeEffectiveness.objects.get_or_create(
        attacking_type=CreatureType.objects.get(name=type_name),
        defending_type=CreatureType.objects.get(name=type_name),
        defaults={"multiplier": Decimal("1.0")},
      )

    logger.info("Damage system initialized")

  @staticmethod
  def calculate_attack_damage(
    battle,
    attacker: User,
    defender: User,
    attacking_type_name: str,
    defending_type_name: str,
    base_damage: int,
    turn_number: int,
  ) -> Dict:
    """
    Calculate damage using deterministic formula:
    Damage_final = Damage_base +/- Damage_base*factor_type
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
        base_damage=base_damage,
        turn_number=turn_number,
      )

      return {
        "success": True,
        "base_damage": base_damage,
        "type_multiplier": str(damage_calc.type_multiplier),
        "final_damage": damage_calc.final_damage,
        "formula": (
          f"{base_damage} +/- {base_damage}*{damage_calc.type_multiplier} "
          f"= {damage_calc.final_damage}"
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
