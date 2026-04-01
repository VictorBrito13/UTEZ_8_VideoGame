from rest_framework import serializers
from .models import Creature, Type, Ability, CreatureAbility


class TypeSerializer(serializers.ModelSerializer):
  class Meta:
    model = Type
    fields = ["id", "name"]


class AbilitySerializer(serializers.ModelSerializer):
  class Meta:
    model = Ability
    fields = ["id", "name", "damage_multiplier", "effect", "effect_probability"]


class CreatureSerializer(serializers.ModelSerializer):
  """
  Serializer for the 100 base Pokemon with their stats and animated sprites.
  """

  type_1_name = serializers.ReadOnlyField(source="type_1.name")
  type_2_name = serializers.ReadOnlyField(source="type_2.name")
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
      "abilities",
    ]

  def get_abilities(self, obj):
    creature_abilities = CreatureAbility.objects.filter(creature=obj)
    return AbilitySerializer(
      [ca.ability for ca in creature_abilities], many=True
    ).data
