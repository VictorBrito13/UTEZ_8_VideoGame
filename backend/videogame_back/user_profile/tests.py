from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from creatures.models import Creature, Type
from rest_framework import status
from rest_framework.test import APIClient

from core.team_payload_cipher import TEAM_CIPHER_KEY
from user_profile.models import TeamCreature
import base64


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
  raw = str(ids).replace(" ", "").encode("utf-8")
  key = TEAM_CIPHER_KEY.encode("utf-8")
  encrypted = bytes(value ^ key[idx % len(key)] for idx, value in enumerate(raw))
  return base64.b64encode(encrypted).decode("ascii")


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
