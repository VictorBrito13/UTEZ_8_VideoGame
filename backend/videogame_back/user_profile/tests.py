import base64

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from creatures.models import Creature, Type
from rest_framework import status
from rest_framework.test import APIClient

from core.payload_crypto import encrypt_json
from user_profile.models import Profile, TeamCreature


class RegisterEmailEncryptedTests(TestCase):
  def setUp(self):
    self.client = APIClient()
    self.url = reverse("register")

  def test_register_accepts_encrypted_email(self):
    email = "encrypted_mail@example.com"
    enc = encrypt_json(email)
    response = self.client.post(
      self.url,
      {
        "username": "enc_mail_user",
        "password": "secret123",
        "email_encrypted": enc,
        "trainer_sprite": "trainer_red.png",
      },
      format="json",
    )
    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    user = User.objects.get(username="enc_mail_user")
    self.assertEqual(user.email.lower(), email.lower())


class RegisterEmailUniquenessTests(TestCase):
  def setUp(self):
    self.client = APIClient()
    self.url = reverse("register")

  def test_register_rejects_duplicate_email(self):
    User.objects.create_user(
      username="existing",
      email="same@example.com",
      password="secret123",
    )
    response = self.client.post(
      self.url,
      {
        "username": "newuser",
        "email": "same@example.com",
        "password": "otherpass456",
      },
      format="json",
    )
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertIn("email", response.data["error"])

  def test_register_rejects_duplicate_email_case_insensitive(self):
    User.objects.create_user(
      username="existing",
      email="Same@Example.com",
      password="secret123",
    )
    response = self.client.post(
      self.url,
      {
        "username": "newuser",
        "email": "same@example.com",
        "password": "otherpass456",
      },
      format="json",
    )
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertIn("email", response.data["error"])


def _encrypt_creature_ids_for_test(ids: list[int]) -> str:
  return encrypt_json(ids)


class TeamSetEncryptedPayloadTests(TestCase):
  def setUp(self):
    self.client = APIClient()
    self.user = User.objects.create_user(
      username="trainer",
      email="trainer@example.com",
      password="secret123",
    )
    self.client.force_authenticate(user=self.user)
    self.url = "/api/team/set_team/"

    fire = Type.objects.create(name="FIRE")
    self.creature_1 = Creature.objects.create(
      name="Charizard",
      pokedex_id=6,
      type_1=fire,
      hp=78,
      attack=84,
      defense=78,
      special_attack=109,
      special_defense=85,
      speed=100,
      front_sprite="https://example.com/front_6.png",
      back_sprite="https://example.com/back_6.png",
    )
    self.creature_2 = Creature.objects.create(
      name="Arcanine",
      pokedex_id=59,
      type_1=fire,
      hp=90,
      attack=110,
      defense=80,
      special_attack=100,
      special_defense=80,
      speed=95,
      front_sprite="https://example.com/front_59.png",
      back_sprite="https://example.com/back_59.png",
    )

  def test_set_team_accepts_encrypted_creature_ids(self):
    encrypted_ids = _encrypt_creature_ids_for_test(
      [self.creature_1.id, self.creature_2.id]
    )

    response = self.client.post(
      self.url,
      {"creature_ids_encrypted": encrypted_ids},
      format="json",
    )

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(response.data["status"], "success")
    self.assertEqual(
      TeamCreature.objects.filter(team__user=self.user).count(),
      2,
    )

  def test_set_team_rejects_invalid_encrypted_payload(self):
    response = self.client.post(
      self.url,
      {"creature_ids_encrypted": "not-base64"},
      format="json",
    )

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertEqual(
      response.data["message"],
      "Invalid encrypted creature_ids payload",
    )

  def test_set_team_rejects_non_list_creature_ids(self):
    response = self.client.post(
      self.url,
      {"creature_ids": "not_a_list"},
      format="json",
    )

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertEqual(
      response.data["message"],
      "Invalid data format",
    )

  def test_set_team_rejects_more_than_3_creatures(self):
    response = self.client.post(
      self.url,
      {"creature_ids": [
        self.creature_1.id,
        self.creature_2.id,
        self.creature_1.id,
        self.creature_2.id,
      ]},
      format="json",
    )

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertEqual(
      response.data["message"],
      "Team cannot exceed 3 creatures",
    )

  def test_set_team_rejects_missing_species(self):
    response = self.client.post(
      self.url,
      {"creature_ids": [999999]},
      format="json",
    )

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    self.assertEqual(response.data["message"], "One or more species not found")


class ProfileAndRegistrationValidationTests(TestCase):
  def setUp(self):
    self.client = APIClient()
    self.register_url = reverse("register")
    self.user = User.objects.create_user(
      username="profile_user",
      email="profile@example.com",
      password="secret123",
    )
    self.client.force_authenticate(user=self.user)
    self.update_profile_url = "/api/profile/update_profile/"

  def test_register_rejects_whitespace_email(self):
    response = self.client.post(
      self.register_url,
      {
        "username": "new_user_email",
        "email": "   ",
        "password": "secret123",
      },
      format="json",
    )

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertIn("email", response.data["error"])

  def test_register_rejects_invalid_trainer_sprite(self):
    response = self.client.post(
      self.register_url,
      {
        "username": "new_user_sprite",
        "email": "sprite@example.com",
        "password": "secret123",
        "trainer_sprite": "not_allowed.png",
      },
      format="json",
    )

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertIn("trainer_sprite", response.data["error"])

  def test_update_profile_rejects_invalid_base64(self):
    response = self.client.patch(
      self.update_profile_url,
      {"foto_base64": "base64,%%%"},
      format="json",
    )

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertIn("foto_base64", response.data)

  def test_update_profile_rejects_non_image_payload(self):
    raw = base64.b64encode(b"hello_world").decode("ascii")

    response = self.client.patch(
      self.update_profile_url,
      {"foto_base64": f"base64,{raw}"},
      format="json",
    )

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertIn("foto_base64", response.data)

  def test_update_profile_accepts_encrypted_bio(self):
    bio_text = "Trainer bio from encrypted payload."
    enc = encrypt_json(bio_text)
    response = self.client.patch(
      self.update_profile_url,
      {"bio_encrypted": enc},
      format="json",
    )
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    profile = Profile.objects.get(user=self.user)
    self.assertEqual(profile.bio, bio_text)
