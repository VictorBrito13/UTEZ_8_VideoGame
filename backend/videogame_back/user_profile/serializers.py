import base64
import re
from chat.utils import BAD_WORDS

from django.contrib.auth.models import User
from rest_framework import serializers

from core.payload_crypto import decrypt_json

from .models import Profile, Ranking, Team, TeamCreature, UserCreature

VALID_TRAINER_SPRITES = [
    "trainer_red.png",
    "https://play.pokemonshowdown.com/sprites/trainers/red.png",
    "https://play.pokemonshowdown.com/sprites/trainers/blue.png",
    "https://play.pokemonshowdown.com/sprites/trainers/dawn.png",
    "https://play.pokemonshowdown.com/sprites/trainers/ethan.png",
    "https://play.pokemonshowdown.com/sprites/trainers/lyra.png",
    "https://play.pokemonshowdown.com/sprites/trainers/brendan.png",
    "https://play.pokemonshowdown.com/sprites/trainers/may.png",
    "https://play.pokemonshowdown.com/sprites/trainers/silver.png",
]

BASE64_PREFIX = "base64,"


class UserRegistrationSerializer(serializers.ModelSerializer):
  """
  Serializer used by your teammates for user registration.
  """

  password = serializers.CharField(write_only=True)
  trainer_sprite = serializers.CharField(write_only=True, required=False)
  email = serializers.EmailField(required=False, allow_blank=True)
  email_encrypted = serializers.CharField(write_only=True, required=False)

  class Meta:
    model = User
    fields = [
      "username",
      "email",
      "email_encrypted",
      "password",
      "trainer_sprite",
    ]

  def validate_username(self, value: str) -> str:
    if not re.match(r"^[a-zA-Z0-9_-]+$", value):
      raise serializers.ValidationError(
        "Username can only contain alphanumeric characters, underscores, and hyphens."
      )
    lower_val = value.lower()
    for word in BAD_WORDS:
      if word in lower_val:
        raise serializers.ValidationError(
          "Username contains inappropriate language."
        )
    return value

  def validate_email(self, value: str) -> str:
    normalized = (value or "").strip().lower()
    if not normalized:
      raise serializers.ValidationError("Email is required.")
    if User.objects.filter(email__iexact=normalized).exists():
      raise serializers.ValidationError(
        "A user with this email already exists.",
      )
    return normalized

  def validate(self, attrs):
    initial = getattr(self, "initial_data", None) or {}
    if initial.get("email_encrypted"):
      try:
        plain = decrypt_json(initial["email_encrypted"])
      except ValueError as exc:
        raise serializers.ValidationError(
          {"email_encrypted": "Invalid encrypted email payload."}
        ) from exc
      if not isinstance(plain, str):
        raise serializers.ValidationError(
          {"email_encrypted": "Invalid encrypted email payload."}
        )
      attrs["email"] = self.validate_email(plain.strip().lower())
    elif not (attrs.get("email") or "").strip():
      raise serializers.ValidationError(
        {"email": "Email is required."},
      )
    return attrs

  def validate_trainer_sprite(self, value: str) -> str:
    if value and value not in VALID_TRAINER_SPRITES:
      raise serializers.ValidationError("Avatar seleccionado inválido o no autorizado.")
    return value

  def create(self, validated_data):
    validated_data.pop("email_encrypted", None)
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
  bio_encrypted = serializers.CharField(write_only=True, required=False)
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
      "bio_encrypted",
      "created_at",
    ]

  def validate_trainer_sprite(self, value):
    if value and value not in VALID_TRAINER_SPRITES:
      raise serializers.ValidationError("Avatar seleccionado inválido o no autorizado.")
    return value

  def validate_foto_base64(self, value):
    if not value:
      return value

    if len(value) > 5 * 1024 * 1024 * 1.33:
      raise serializers.ValidationError("La imagen excede el límite de 5MB.")

    foto_data = value
    if BASE64_PREFIX in foto_data:
      _, foto_data = foto_data.split(BASE64_PREFIX)
        
    try:
      decoded_data = base64.b64decode(foto_data)
    except Exception:
      raise serializers.ValidationError("Formato Base64 inválido.")
        
    valid_signatures = {
      b"\xff\xd8\xff": "image/jpeg",
      b"\x89PNG\r\n\x1a\n": "image/png",
      b"RIFF": "image/webp",
    }
    
    is_valid = False
    for sig in valid_signatures:
      if decoded_data.startswith(sig):
        if sig == b"RIFF" and decoded_data[8:12] != b"WEBP":
          continue
        is_valid = True
        break
            
    if not is_valid:
      raise serializers.ValidationError("El archivo no es una imagen válida (solo JPG, PNG, WEBP permitidos).")
        
    return value

  def validate(self, attrs):
    initial = getattr(self, "initial_data", None) or {}
    if initial.get("bio_encrypted"):
      try:
        plain = decrypt_json(initial["bio_encrypted"])
      except ValueError as exc:
        raise serializers.ValidationError(
          {"bio_encrypted": "Invalid encrypted bio payload."}
        ) from exc
      if not isinstance(plain, str):
        raise serializers.ValidationError(
          {"bio_encrypted": "Invalid encrypted bio payload."}
        )
      attrs["bio"] = plain
    return attrs

  def update(self, instance, validated_data):
    validated_data.pop("bio_encrypted", None)
    foto_data = validated_data.pop("foto_base64", None)

    if foto_data:
      if BASE64_PREFIX in foto_data:
        _, foto_data = foto_data.split(BASE64_PREFIX)
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
  sprite = serializers.ReadOnlyField(source="creature.front_sprite")
  pokedex_id = serializers.ReadOnlyField(source="creature.pokedex_id")
  front_sprite = serializers.ReadOnlyField(source="creature.front_sprite")
  back_sprite = serializers.ReadOnlyField(source="creature.back_sprite")

  # Base Stats from Creature model (RF-06)
  hp = serializers.ReadOnlyField(source="creature.hp")
  attack = serializers.ReadOnlyField(source="creature.attack")
  defense = serializers.ReadOnlyField(source="creature.defense")
  speed = serializers.ReadOnlyField(source="creature.speed")
  type_1 = serializers.ReadOnlyField(source="creature.type_1.name")
  type_1_name = serializers.ReadOnlyField(source="creature.type_1.name")
  type_2 = serializers.ReadOnlyField(source="creature.type_2.name")

  class Meta:
    model = UserCreature
    fields = [
      "id",
      "creature_id",
      "pokedex_id",
      "creature_name",
      "sprite",
      "front_sprite",
      "back_sprite",
      "level",
      "hp",
      "attack",
      "defense",
      "speed",
      "type_1",
      "type_1_name",
      "type_2",
      "current_hp",
    ]


class TeamCreatureSerializer(serializers.ModelSerializer):
  user_creature = UserCreatureSerializer(read_only=True)

  class Meta:
    model = TeamCreature
    fields = ["id", "user_creature"]
