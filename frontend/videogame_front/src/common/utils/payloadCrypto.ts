/**
 * AES-256-GCM JSON payloads (demo key shared with backend; use TLS in production).
 * Key: SHA-256(VITE_PAYLOAD_CRYPTO_KEY or default string), same as Django core.payload_crypto.
 */

const DEFAULT_KEY =
  import.meta.env.VITE_PAYLOAD_CRYPTO_KEY ??
  "UTEZ_PAYLOAD_DEMO_KEY_2026_DEV_ONLY";

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCodePoint(bytes[i]!);
  }
  const b64 = globalThis.btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAesGcmKey(): Promise<CryptoKey> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(DEFAULT_KEY),
  );
  return crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a JSON-serializable value; returns URL-safe base64 (no padding).
 */
export async function encryptJson(value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAesGcmKey();
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return uint8ArrayToBase64Url(combined);
}
