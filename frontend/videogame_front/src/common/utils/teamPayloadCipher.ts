const TEAM_CIPHER_KEY = "UTEZ_TEAM_IDS_DEMO_KEY_2026";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return globalThis.btoa(binary);
}

/**
 * Demo-only reversible cipher for `creature_ids` transport.
 * Use TLS + audited crypto for production systems.
 */
export function encryptCreatureIds(creatureIds: number[]): string {
  const plainText = JSON.stringify(creatureIds);
  const plainBytes = new TextEncoder().encode(plainText);
  const keyBytes = new TextEncoder().encode(TEAM_CIPHER_KEY);

  const encrypted = plainBytes.map(
    (value, idx) => value ^ keyBytes[idx % keyBytes.length],
  );

  return toBase64(encrypted);
}
