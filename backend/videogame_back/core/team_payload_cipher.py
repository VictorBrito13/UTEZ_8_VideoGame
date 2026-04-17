from core.payload_crypto import decrypt_json


def decrypt_creature_ids(encrypted_payload: str) -> list[int]:
  """Decrypt AES-GCM JSON list of creature species IDs from the frontend."""
  if not isinstance(encrypted_payload, str) or not encrypted_payload.strip():
    raise ValueError("Encrypted payload must be a non-empty string")

  try:
    parsed = decrypt_json(encrypted_payload)
  except ValueError as exc:
    raise ValueError("Invalid encrypted creature_ids payload") from exc

  if not isinstance(parsed, list):
    raise ValueError("Decrypted payload must be a list")

  if not all(isinstance(item, int) for item in parsed):
    raise ValueError("All creature IDs must be integers")

  return parsed
