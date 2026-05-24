/**
 * AES-256-GCM symmetric encryption for server-side secret storage.
 *
 * ASSUMPTIONS:
 * 1. GSC_ENCRYPTION_KEY is a 64-character hex string (32 bytes) set in env.
 * 2. This module is only ever called server-side (Node.js crypto is not available in edge runtime).
 * 3. Each encrypt() call generates a fresh random IV — never reuse IVs with GCM.
 *
 * FAILURE MODES:
 * - Missing/malformed key → throws immediately at call time (fail fast, no silent fallback).
 * - Tampered ciphertext → authTag mismatch throws during decrypt (authenticated encryption).
 * - Corrupted stored format → throws; caller should treat as "reconnect required".
 *
 * Storage format: `iv:authTag:ciphertext` — all hex-encoded, colon-separated.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES   = 12; // 96-bit IV — recommended for GCM
const TAG_BYTES  = 16; // 128-bit auth tag — GCM maximum

function getKey(): Buffer {
  const raw = process.env.GSC_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      "GSC_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(raw, "hex");
}

export function isEncryptionConfigured(): boolean {
  const raw = process.env.GSC_ENCRYPTION_KEY ?? "";
  return /^[0-9a-fA-F]{64}$/.test(raw);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(IV_BYTES);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decrypt(stored: string): string {
  const key  = getKey();
  const parts = stored.split(":");

  if (parts.length !== 3) {
    throw new Error("Decrypt failed: stored value has unexpected format.");
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv         = Buffer.from(ivHex, "hex");
  const tag        = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  if (iv.length !== IV_BYTES) {
    throw new Error("Decrypt failed: IV length mismatch.");
  }
  if (tag.length !== TAG_BYTES) {
    throw new Error("Decrypt failed: auth tag length mismatch — data may be corrupted.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
