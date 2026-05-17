/**
 * High-level webhook verification.
 *
 * Composes:
 *   - signature recipe lookup per integration
 *   - secret resolution from the credential vault (or env for n8n callbacks)
 *   - HMAC verification + replay protection
 *
 * The route handler calls `verifyIncomingWebhook()` once per request.
 * On failure the handler returns 401 — never invokes the runtime.
 */

import { getCredential } from "@/lib/credentials";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import {
  getSignatureRecipe,
  verifyWebhookSignature,
  type VerifyResult,
} from "./signature";

const log = createLogger("security/webhook/verifier");

export type VerifyIncomingInput = {
  rawBody: string;
  headers: Record<string, string>;
  /** Integration the webhook came from. Determines the recipe. */
  integration?: string;
  /** Optional explicit secret name in vault. */
  vaultUserId?: string;
  vaultIntegration?: string;
  vaultSecretName?: string;
  /** Optional explicit secret string (n8n callback env). */
  secret?: string;
};

/**
 * Verify a webhook against the configured recipe + resolved secret.
 *
 * Priority for secret resolution:
 *   1. `input.secret` (explicit override).
 *   2. `N8N_WEBHOOK_SECRET` env when integration is "n8n-callback".
 *   3. Vault credential (vaultUserId, vaultIntegration, vaultSecretName).
 *
 * If no secret is configured, the verifier rejects (fail-secure).
 */
export async function verifyIncomingWebhook(
  input: VerifyIncomingInput,
): Promise<VerifyResult> {
  const recipe = getSignatureRecipe(input.integration ?? "default");

  let secret = input.secret;

  if (!secret && input.integration === "n8n-callback") {
    secret = env.n8nWebhookSecret;
  }

  if (!secret && input.vaultUserId && input.vaultIntegration && input.vaultSecretName) {
    const cred = await getCredential({
      userId: input.vaultUserId,
      integration: input.vaultIntegration,
      name: input.vaultSecretName,
    });
    if (cred?.payload?.secret && typeof cred.payload.secret === "string") {
      secret = cred.payload.secret;
    }
  }

  if (!secret) {
    log.warn("No webhook secret configured; rejecting.", {
      integration: input.integration,
    });
    return { valid: false, reason: "No webhook secret configured." };
  }

  return verifyWebhookSignature({
    rawBody: input.rawBody,
    headers: input.headers,
    secret,
    recipe,
  });
}

/**
 * Convenience: lowercase header keys (Next.js headers are already
 * lowercase but normalize defensively for inbound HTTP).
 */
export function normalizeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}
