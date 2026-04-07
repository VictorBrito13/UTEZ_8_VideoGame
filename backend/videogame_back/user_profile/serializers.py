import base64
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, UserCreature, Team, TeamCreature, Ranking


class UserRegistrationSerializer(serializers.ModelSerializer):
  """
  Serializer used by your teammates for user registration.
  """

  password = serializers.CharField(write_only=True)
  trainer_sprite = serializers.CharField(write_only=True, required=False)

  class Meta:
    model = User
    fields = ["username", "email", "password", "trainer_sprite"]

  def create(self, validated_data):
    trainer_sprite = validated_data.pop("trainer_sprite", None)
    user = User.objects.create_user(
      username=validated_data["username"],
      email=validated_data.get("email", ""),
      password=validated_data["password"],
    )
    # Create profile with the selected combat avatar
    Profile.objects.create(user=user, trainer_sprite=trainer_sprite)
    # Create initial ranking
    Ranking.objects.create(user=user)
    # Create an empty team
    Team.objects.create(user=user)
    return user


class ProfileSerializer(serializers.ModelSerializer):
  """
  Serializer for User Profile.
  Handles Base64 photo string conversion to Binary storage.
  """

  foto_base64 = serializers.CharField(required=False, allow_null=True)
  username = serializers.ReadOnlyField(source="user.username")
  elo = serializers.IntegerField(source="user.ranking.elo", read_only=True)
  wins = serializers.IntegerField(source="user.ranking.wins", read_only=True)

  user_id = serializers.IntegerField(source="user.id", read_only=True)

  class Meta:
    model = Profile
    fields = [
      "user_id",
      "username",
      "elo",
      "wins",
      "trainer_sprite",
      "foto_base64",
      "bio",
      "created_at",
    ]

  def update(self, instance, validated_data):
    foto_data = validated_data.pop("foto_base64", None)
    if foto_data:
      if "base64," in foto_data:
        _, foto_data = foto_data.split("base64,")
      try:
        instance.foto_binaria = base64.b64decode(foto_data)
      except Exception:
        raise serializers.ValidationError(
          "Invalid Base64 format for profile picture."
        )
    return super().update(instance, validated_data)


class UserSerializer(serializers.ModelSerializer):
  profile = ProfileSerializer(read_only=True)
  is_team_full = serializers.BooleanField(source="team.is_full", read_only=True)

  class Meta:
    model = User
    fields = ["id", "username", "email", "profile", "is_team_full"]


class UserCreatureSerializer(serializers.ModelSerializer):
  creature_name = serializers.ReadOnlyField(source="creature.name")
  creature_id = serializers.ReadOnlyField(source="creature.id")
  creature_name = serializers.ReadOnlyField(source="creature.name")
  sprite = serializers.ReadOnlyField(source="creature.front_sprite")

  class Meta:
    model = UserCreature
    fields = [
      "id",
      "creature_id",
      "creature_name",
      "sprite",
      "level",
      "current_hp",
    ]


class TeamCreatureSerializer(serializers.ModelSerializer):
  user_creature = UserCreatureSerializer(read_only=True)

  class Meta:
    model = TeamCreature
    fields = ["id", "user_creature"]
