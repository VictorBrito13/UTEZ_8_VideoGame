from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class InventoryUseObjectEncryptedTests(TestCase):
  def setUp(self):
    self.client = APIClient()
    self.user = User.objects.create_user(
      username="invuser",
      email="inv@example.com",
      password="secret123",
    )
    self.client.force_authenticate(user=self.user)

  def test_use_object_rejects_invalid_encrypted_payload(self):
    response = self.client.post(
      "/api/inventory/use-object/",
      {"use_payload_encrypted": "not-valid-ciphertext"},
      format="json",
    )
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertIn("error", response.data)
