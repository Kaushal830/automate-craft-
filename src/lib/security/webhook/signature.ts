/**
 * Per-integration webhook signature recipes.
 *
 * Different providers use different HMAC algorithms, header names, and
 * canonical body formats. The recipe object isolates this drift so the
 * verifier can stay generic.
 *
 * Recipe components:
 *   header           — name of the request header carrying the signature
 *   timestampHeader  — optional name of timestamp header (replay protection)
 *   algorithm        — hash function ("sha256" | "sha1")
 *   prefix           — optional algorithm prefix in header (e.g. "sha256=")
 *   canonicalBody    — function that builds the bytes to HMAC over
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type SignatureAlgorithm = "sha256" | "sha1";

export type SignatureRecipe = {
  header: string;
  timestampHeader?: string;
  algorithm: SignatureAlgorithm;
  prefix?: string;
  /**
   * Build the bytes to HMAC. Default: raw body. Some providers require
   * `${timestamp}.${rawBody}` (Stripe).
   */
  canonicalBody?: (rawBody: string, headers: Record<string, string>) => string;
};

/**
 * Registry of known providers + a generic default for AutomateCraft's
 * own n8n callback path.
 */
const RECIPES: Record<string, SignatureRecipe> = {
  // Default for n8n → AutomateCraft callbacks. Uses
  // `X-AutomateCraft-Signature: sha256=<hex>` over the raw body.
  default: {
    header: "x-automatecraft-signature",
    algorithm: "sha256",
    prefix: "sha256=",
  },
  stripe: {
    header: "stripe-signature",
    timestampHeader: "stripe-timestamp",
    algorithm: "sha256",
    canonicalBody: (rawBody, headers) => {
      const ts = headers["stripe-timestamp"] ?? headers["timestamp"] ?? "";
      return `${ts}.${rawBody}`;
    },
  },
  razorpay: {
    header: "x-razorpay-signature",
    algorithm: "sha256",
  },
  slack: {
    header: "x-slack-signature",
    timestampHeader: "x-slack-request-timestamp",
    algorithm: "sha256",
    prefix: "v0=",
    canonicalBody: (rawBody, headers) => {
      const ts = headers["x-slack-request-timestamp"] ?? "";
      return `v0:${ts}:${rawBody}`;
    },
  },
  hubspot: {
    header: "x-hubspot-signature-v3",
    algorithm: "sha256",
  },
};

export function getSignatureRecipe(integration: string): SignatureRecipe {
  return RECIPES[integration] ?? RECIPES.default;
}

/* ─── Verification primitive ─────────────────────────────────────── */

export type VerifyInput = {
  rawBody: string;
  headers: Record<string, string>;
  secret: string;
  recipe: SignatureRecipe;
  /**
   * Maximum allowed age (seconds) when the recipe carries a timestamp.
   * Defaults to 5 minutes.
   */
  maxAgeSeconds?: number;
};

export type VerifyResult =
  | { valid: true }
  | { valid: false; reason: string };

export function verifyWebhookSignature(input: VerifyInput): VerifyResult {
  const headerValue = input.headers[input.recipe.header.toLowerCase()];
  if (!headerValue) {
    return { valid: false, reason: `Missing ${input.recipe.header} header.` };
  }

  // Timestamp / replay protection.
  if (input.recipe.timestampHeader) {
    const tsHeader = input.headers[input.recipe.timestampHeader.toLowerCase()];
    if (!tsHeader) {
      return {
        valid: false,
        reason: `Missing ${input.recipe.timestampHeader} header.`,
      };
    }
    const ts = Number(tsHeader);
    if (!Number.isFinite(ts)) {
      return { valid: false, reason: "Timestamp header is not numeric." };
    }
    const ageSeconds = Math.abs(Date.now() / 1000 - ts);
    const maxAge = input.maxAgeSeconds ?? 300;
    if (ageSeconds > maxAge) {
      return { valid: false, reason: `Timestamp older than ${maxAge}s.` };
    }
  }

  // Build canonical bytes.
  const canonical = input.recipe.canonicalBody
    ? input.recipe.canonicalBody(input.rawBody, input.headers)
    : input.rawBody;

  // Compute HMAC.
  const computed = createHmac(input.recipe.algorithm, input.secret)
    .update(canonical, "utf8")
    .digest("hex");

  // Strip optional prefix.
  const expected = input.recipe.prefix
    ? `${input.recipe.prefix}${computed}`
    : computed;

  // Constant-time compare.
  const headerBuf = Buffer.from(headerValue);
  const expectedBuf = Buffer.from(expected);
  if (headerBuf.length !== expectedBuf.length) {
    return { valid: false, reason: "Signature length mismatch." };
  }
  if (!timingSafeEqual(headerBuf, expectedBuf)) {
    return { valid: false, reason: "Signature mismatch." };
  }

  return { valid: true };
}
