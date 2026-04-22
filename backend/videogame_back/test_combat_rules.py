#!/usr/bin/env python
"""
Test script for new Pokémon-style combat rules.
Run with: python manage.py shell < test_combat_rules.py
"""

import os
import django
import pytest

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videogame_back.settings")
django.setup()

from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from creatures.models import Ability, Creature, CreatureAbility, SpecialAbility, Type
from combat.damage_service import DamageService


@pytest.mark.django_db
def test_creature_ability_slot_limit():
  fire_type, _ = Type.objects.get_or_create(name="fire")
  creature = Creature.objects.create(
    name="Testmon",
    description="Test creature",
    type_1=fire_type,
    hp=100,
    attack=20,
    defense=15,
    speed=10,
    front_sprite="",
    back_sprite="",
  )

  for slot in range(1, 5):
    ability = Ability.objects.create(
      name=f"Flame Strike {slot}",
      ability_type=fire_type,
      base_damage=15,
      damage_multiplier=1.0,
      effect="",
      effect_probability=0.0,
      vfx_type="fireball",
    )
    CreatureAbility.objects.create(
      creature=creature,
      ability=ability,
      slot=slot,
    )

  extra_ability = Ability.objects.create(
    name="Overheat Bonus",
    ability_type=fire_type,
    base_damage=10,
    damage_multiplier=1.0,
    effect="",
    effect_probability=0.0,
    vfx_type="fireball",
  )

  extra_slot = CreatureAbility(
    creature=creature,
    ability=extra_ability,
    slot=4,
  )

  with pytest.raises(ValidationError):
    extra_slot.full_clean()


@pytest.mark.django_db
def test_ability_validation_fields():
  water_type, _ = Type.objects.get_or_create(name="water")

  with pytest.raises(ValidationError):
    ability = Ability(
      name="Bad Move",
      ability_type=water_type,
      base_damage=0,
      damage_multiplier=1.0,
      effect="",
      effect_probability=0.0,
      vfx_type="splash",
    )
    ability.full_clean()

  with pytest.raises(ValidationError):
    ability = Ability(
      name="Weird Move",
      ability_type=water_type,
      base_damage=10,
      damage_multiplier=1.0,
      effect="",
      effect_probability=1.5,
      vfx_type="splash",
    )
    ability.full_clean()


@pytest.mark.django_db
def test_special_ability_default_probability():
  special = SpecialAbility.objects.create(
    name="Test Paralyze",
    effect_type="PARALYZE",
    description="Paralyzes the enemy.",
  )

  assert special.trigger_probability == 0.3
  assert special.effect_type == "PARALYZE"


@pytest.mark.django_db
def test_damage_service_type_initialization():
  DamageService.initialize_types_and_effectiveness()

  expected_types = [
    "normal",
    "fire",
    "water",
    "grass",
    "electric",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
  ]

  existing_types = list(Type.objects.filter(name__in=expected_types).values_list("name", flat=True))
  assert set(existing_types) == set(expected_types)
