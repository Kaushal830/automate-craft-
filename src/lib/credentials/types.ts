/**
 * Credential vault domain types.
 *
 * A "credential" is a piece of secret material owned by a single user
 * for a single integration. Examples:
 *   - OAuth access + refresh token bundle for Slack
 *   - WhatsApp Business API token
 *   - Stripe restricted-key
 *   - Razorpay webhook signing secret
 *
 * Credentials are addressed by `(user_id, integration, name)`. The
 * `name` is a logical handle ("default", "ops_account", ...) so a user
 * can store multiple credentials for the same integration.
 *
 * The plaintext payload is application-defined (per integration). The
 * vault layer treats it as opaque JSON.
 */

import { z } from "zod";

/**
 * A logical credential descriptor — what the application code sees.
 * The plaintext payload is a JSON object whose shape is integration-
 * specific. The vault encrypts/decrypts but never inspects.
 */
export const credentialDescriptorSchema = z.object({
  /** Vault row UUID. */
  id: z.string().uuid(),
  /** Owning user. */
  userId: z.string().uuid(),
  /** Integration slug (e.g. "slack", "whatsapp"). */
  integration: z.string().trim().min(1).max(60),
  /** Logical handle ("default", "ops"). */
  name: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/),
  /** Encryption key version used for this row. */
  keyId: z.string().trim().min(1).max(40),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CredentialDescriptor = z.infer<typeof credentialDescriptorSchema>;

/**
 * Decrypted credential — plaintext + descriptor.
 * Lives in memory only; never serialized to disk or logs.
 */
export type DecryptedCredential = CredentialDescriptor & {
  payload: Record<string, unknown>;
};

/** Input for vault.put(). */
export type CredentialPutInput = {
  userId: string;
  integration: string;
  name: string;
  payload: Record<string, unknown>;
};

/** Input for vault.get() / vault.delete(). */
export type CredentialLookup = {
  userId: string;
  integration: string;
  name: string;
};
