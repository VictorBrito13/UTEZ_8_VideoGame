import { encryptJson } from "./payloadCrypto";

/**
 * Demo transport encryption for team species IDs (AES-GCM JSON list).
 */
export async function encryptCreatureIds(
  creatureIds: number[],
): Promise<string> {
  return encryptJson(creatureIds);
}
