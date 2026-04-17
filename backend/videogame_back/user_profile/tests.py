from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


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
