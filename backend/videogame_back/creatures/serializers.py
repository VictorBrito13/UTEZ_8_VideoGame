from rest_framework import serializers
from .models import Creature, Type, Ability, CreatureAbility


class TypeSerializer(serializers.ModelSerializer):
  class Meta:
    model = Type
    fields = ["id", "name"]


class AbilitySerializer(serializers.ModelSerializer):
  move_type_name = serializers.ReadOnlyField(source="move_type.name")

  class Meta:
    model = Ability
    fields = [
      "id",
      "name",
      "base_power",
      "move_type_name",
      "damage_multiplier",
      "effect",
      "effect_probability",
      "vfx_type",
    ]


class CreatureSerializer(serializers.ModelSerializer):
  """
  Serializer for the 100 base Pokemon with their stats and animated sprites.
  """

  type_1_name = serializers.ReadOnlyField(source="type_1.name")
  type_2_name = serializers.ReadOnlyField(source="type_2.name")
  abilities = serializers.SerializerMethodField()

  special_ability_name = serializers.ReadOnlyField()
  special_ability_effect = serializers.ReadOnlyField()
  special_ability_probability = serializers.ReadOnlyField()
  moves = serializers.SerializerMethodField()

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
      "abilities",
      "moves",
      "special_ability_name",
      "special_ability_effect",
      "special_ability_probability",
    ]

  def get_abilities(self, obj):
    creature_abilities = CreatureAbility.objects.filter(creature=obj)
    return AbilitySerializer(
      [ca.ability for ca in creature_abilities], many=True
    ).data

  def get_moves(self, obj):
    creature_abilities = CreatureAbility.objects.filter(
      creature=obj
    ).select_related("ability__move_type")
    return AbilitySerializer(
      [ca.ability for ca in creature_abilities], many=True
    ).data
