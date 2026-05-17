/**
 * AES-256-GCM encryption for credential vault.
 *
 * Authenticated encryption with associated data (AEAD). Each call uses
 * a fresh random 12-byte IV. The wire format is:
 *
 *   [ key_id_byte_length:1 ]
 *   [ key_id_utf8           ]
 *   [ iv:12                 ]
 *   [ tag:16                ]
 *   [ ciphertext:N          ]
 *
 * The `key_id` is embedded so the decryption path can route to the
 * correct key during rotation. Today we only have one key (`v1`); the
 * router stub is present so future rotation is non-breaking.
 *
 * KEY MANAGEMENT
 *   - Production: `CREDENTIAL_VAULT_KEY` env required (32-byte base64).
 *     Missing → throw immediately at first encrypt/decrypt.
 *   - Development: deterministic dev key auto-generated if env missing,
 *     with a one-time warning. NOT secure; for local dev only.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env, hasCredentialVaultKey, isProduction } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("credentials/crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // bytes — AES-256

/* ─── Key resolution ─────────────────────────────────────────────── */

let cachedKey: { id: string; key: Buffer } | null = null;
let warnedDevKey = false;

/**
 * Deterministic dev key — derived from a fixed seed so dev databases
 * remain readable across restarts. NEVER used in production.
 */
const DEV_KEY_SEED = "automatecraft-dev-vault-deterministic-32B";

function deriveDevKey(): Buffer {
  // Pad/truncate the seed to 32 bytes deterministically.
  const buf = Buffer.alloc(KEY_LENGTH);
  Buffer.from(DEV_KEY_SEED, "utf8").copy(buf);
  return buf;
}

function resolveKey(): { id: string; key: Buffer } {
  if (cachedKey) return cachedKey;

  if (hasCredentialVaultKey()) {
    const raw = Buffer.from(env.credentialVaultKey!, "base64");
    if (raw.length !== KEY_LENGTH) {
      throw new Error(
        `CREDENTIAL_VAULT_KEY must be a base64-encoded 32-byte key (got ${raw.length} bytes).`,
      );
    }
    cachedKey = { id: env.credentialVaultKeyId, key: raw };
    return cachedKey;
  }

  if (isProduction()) {
    throw new Error(
      "CREDENTIAL_VAULT_KEY is required in production. Generate via: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }

  if (!warnedDevKey) {
    log.warn(
      "Using deterministic DEV vault key. Set CREDENTIAL_VAULT_KEY for any non-dev environment.",
    );
    warnedDevKey = true;
  }
  cachedKey = { id: "dev", key: deriveDevKey() };
  return cachedKey;
}

/* ─── Encrypt ────────────────────────────────────────────────────── */

/**
 * Encrypt a plaintext JSON object into an opaque buffer suitable for
 * storage in `credentials_vault.encrypted_blob`.
 */
export function encryptCredential(payload: Record<string, unknown>): {
  blob: Buffer;
  keyId: string;
} {
  const { id, key } = resolveKey();
  const iv = randomBytes(IV_LENGTH);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const keyIdBytes = Buffer.from(id, "utf8");
  const header = Buffer.from([keyIdBytes.length]);

  const blob = Buffer.concat([header, keyIdBytes, iv, tag, ciphertext]);

  return { blob, keyId: id };
}

/* ─── Decrypt ────────────────────────────────────────────────────── */

/**
 * Decrypt an opaque blob back into the original plaintext object.
 *
 * Throws if the blob is tampered (auth tag mismatch) or if the key
 * version embedded in the blob is unknown.
 */
export function decryptCredential(blob: Buffer): Record<string, unknown> {
  if (blob.length < 1 + IV_LENGTH + TAG_LENGTH) {
    throw new Error("Credential blob is too short.");
  }

  const keyIdLength = blob.readUInt8(0);
  const keyIdEnd = 1 + keyIdLength;
  const keyId = blob.slice(1, keyIdEnd).toString("utf8");

  const ivStart = keyIdEnd;
  const ivEnd = ivStart + IV_LENGTH;
  const tagEnd = ivEnd + TAG_LENGTH;

  const iv = blob.slice(ivStart, ivEnd);
  const tag = blob.slice(ivEnd, tagEnd);
  const ciphertext = blob.slice(tagEnd);

  // Resolve the key for the embedded key_id. Today we only check the
  // active key; in Phase 3 a rotation registry resolves historical keys.
  const { id: activeKeyId, key } = resolveKey();
  if (keyId !== activeKeyId) {
    throw new Error(
      `Credential blob uses key "${keyId}" but only "${activeKeyId}" is active. Rotation map not configured.`,
    );
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return JSON.parse(plaintext.toString("utf8"));
}

/* ─── Test helpers ───────────────────────────────────────────────── */

/** Reset the key cache. Useful when env changes mid-process (tests). */
export function _resetKeyCache(): void {
  cachedKey = null;
  warnedDevKey = false;
}
