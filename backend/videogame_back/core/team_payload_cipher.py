import base64
import json

TEAM_CIPHER_KEY = "UTEZ_TEAM_IDS_DEMO_KEY_2026"


def decrypt_creature_ids(encrypted_payload: str) -> list[int]:
  """Decrypt demo encrypted creature IDs payload from the frontend."""
  if not isinstance(encrypted_payload, str) or not encrypted_payload.strip():
    raise ValueError("Encrypted payload must be a non-empty string")

  try:
    encrypted_bytes = base64.b64decode(encrypted_payload)
  except Exception as exc:
    raise ValueError("Invalid base64 encrypted payload") from exc

  key_bytes = TEAM_CIPHER_KEY.encode("utf-8")
  decrypted_bytes = bytes(
    value ^ key_bytes[idx % len(key_bytes)]
    for idx, value in enumerate(encrypted_bytes)
  )

  try:
    decoded = decrypted_bytes.decode("utf-8")
    parsed = json.loads(decoded)
  except Exception as exc:
    raise ValueError("Encrypted payload could not be decoded") from exc

  if not isinstance(parsed, list):
    raise ValueError("Decrypted payload must be a list")

  if not all(isinstance(item, int) for item in parsed):
    raise ValueError("All creature IDs must be integers")

  return parsed
