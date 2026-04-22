from rest_framework import serializers
from .models import Creature, Type, Ability, CreatureAbility, SpecialAbility


class TypeSerializer(serializers.ModelSerializer):
  class Meta:
    model = Type
    fields = ["id", "name"]


class AbilitySerializer(serializers.ModelSerializer):
  ability_type = TypeSerializer(read_only=True)

  class Meta:
    model = Ability
    fields = [
      "id",
      "name",
      "ability_type",
      "base_damage",
      "damage_multiplier",
      "effect",
      "effect_probability",
      "vfx_type",
    ]


class SpecialAbilitySerializer(serializers.ModelSerializer):
  class Meta:
    model = SpecialAbility
    fields = ["id", "name", "effect_type", "trigger_probability", "description"]


class CreatureAbilitySerializer(serializers.ModelSerializer):
  """Serializer for creature move slots"""
  ability = AbilitySerializer(read_only=True)
  
  class Meta:
    model = CreatureAbility
    fields = ["id", "slot", "ability"]


class CreatureSerializer(serializers.ModelSerializer):
  """
  Serializer for the 100 base Pokemon with their stats and animated sprites.
  """

  type_1_name = serializers.ReadOnlyField(source="type_1.name")
  type_2_name = serializers.ReadOnlyField(source="type_2.name")
  special_ability = SpecialAbilitySerializer(read_only=True)
  abilities = serializers.SerializerMethodField()

  class Meta:
    model = Creature
    fields = [
      "id",
      "pokedex_id",
      "name",
      "type_1_name",
      "type_2_name",
      "hp",
      "attack",
      "defense",
      "special_attack",
      "special_defense",
      "speed",
      "front_sprite",
      "back_sprite",
      "special_ability",
      "abilities",
    ]

  def get_abilities(self, obj):
    """Return abilities ordered by slot (1-4)"""
    creature_abilities = CreatureAbility.objects.filter(creature=obj).order_by("slot")
    return CreatureAbilitySerializer(
      creature_abilities, many=True
    ).data
