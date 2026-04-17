"""
AES-256-GCM helpers for optional app-layer JSON payloads (demo / obfuscation).
Key is shared with the SPA; use TLS for real transport security.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_NONCE_LEN = 12
_TAG_LEN = 16


def _key_bytes() -> bytes:
  raw = os.environ.get(
    "PAYLOAD_CRYPTO_KEY",
    "UTEZ_PAYLOAD_DEMO_KEY_2026_DEV_ONLY",
  )
  return hashlib.sha256(raw.encode("utf-8")).digest()


def encrypt_json(value: Any) -> str:
  """Serialize value to JSON, encrypt with AES-GCM, return URL-safe base64."""
  plaintext = json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode(
    "utf-8"
  )
  nonce = os.urandom(_NONCE_LEN)
  aesgcm = AESGCM(_key_bytes())
  ciphertext = aesgcm.encrypt(nonce, plaintext, None)
  combined = nonce + ciphertext
  return base64.urlsafe_b64encode(combined).decode("ascii").rstrip("=")


def decrypt_json(ciphertext_b64: str) -> Any:
  """
  Decrypt URL-safe base64 payload produced by encrypt_json or the frontend.
  """
  if not isinstance(ciphertext_b64, str) or not ciphertext_b64.strip():
    raise ValueError("Ciphertext must be a non-empty string")

  padded = ciphertext_b64.strip()
  pad = (-len(padded)) % 4
  if pad:
    padded += "=" * pad

  try:
    combined = base64.urlsafe_b64decode(padded.encode("ascii"))
  except Exception as exc:
    raise ValueError("Invalid base64 ciphertext") from exc

  if len(combined) < _NONCE_LEN + _TAG_LEN:
    raise ValueError("Ciphertext too short")

  nonce = combined[:_NONCE_LEN]
  ct = combined[_NONCE_LEN:]
  aesgcm = AESGCM(_key_bytes())
  try:
    plaintext = aesgcm.decrypt(nonce, ct, None)
  except Exception as exc:
    raise ValueError("Decryption or authentication failed") from exc

  try:
    return json.loads(plaintext.decode("utf-8"))
  except Exception as exc:
    raise ValueError("Decrypted payload is not valid JSON") from exc
