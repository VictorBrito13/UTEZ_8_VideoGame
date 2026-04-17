from django.test import TestCase

from core.payload_crypto import decrypt_json, encrypt_json


class PayloadCryptoTests(TestCase):
  def test_encrypt_decrypt_roundtrip_dict(self):
    payload = {"object_id": 1, "creature_id": None}
    enc = encrypt_json(payload)
    self.assertEqual(decrypt_json(enc), payload)

  def test_encrypt_decrypt_roundtrip_int(self):
    enc = encrypt_json(42)
    self.assertEqual(decrypt_json(enc), 42)
