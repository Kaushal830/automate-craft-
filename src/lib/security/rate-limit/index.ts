/**
 * Rate-limit facade.
 *
 * Exposes one async function: `enforceRateLimit({ name, identifier })`.
 * - Loads bucket state from the configured store.
 * - Runs token-bucket `consume()`.
 * - Persists new state.
 * - Throws `RateLimitError` if denied.
 *
 * The store factory checks env (`RATE_LIMIT_DRIVER`); today only
 * "memory" exists, but the seam is in place.
 */

import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { MemoryRateLimitStore, type RateLimitStore } from "./store";
import { consume, type ConsumeResult } from "./token-bucket";
import { getPolicy, POLICIES, type PolicyName } from "./policies";

const log = createLogger("security/rate-limit");

/* ─── Store factory (singleton per process) ──────────────────────── */

let store: RateLimitStore | null = null;

function getStore(): RateLimitStore {
  if (store) return store;
  switch (env.rateLimitDriver) {
    case "memory":
      store = new MemoryRateLimitStore();
      break;
    case "redis":
      throw new Error(
        "Redis rate-limit store not implemented. Add Phase 3 implementation.",
      );
    default:
      log.warn(
        `Unknown RATE_LIMIT_DRIVER "${env.rateLimitDriver}". Falling back to memory.`,
      );
      store = new MemoryRateLimitStore();
  }
  return store;
}

/* ─── Public error ───────────────────────────────────────────────── */

export class RateLimitError extends Error {
  readonly httpStatus = 429;
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
    public readonly policyName: PolicyName,
  ) {
    super(message);
    this.name = "RateLimitError";
  }

  toApiPayload() {
    return {
      error: this.message,
      code: "RATE_LIMITED",
      retryAfterSeconds: this.retryAfterSeconds,
      policy: this.policyName,
    };
  }
}

/* ─── Enforce ────────────────────────────────────────────────────── */

export type EnforceInput = {
  /** Policy name from POLICIES. */
  name: PolicyName;
  /** Bucket key (e.g. user_id, webhook_id, IP). */
  identifier: string;
  /** Cost of this request in tokens. Default 1. */
  cost?: number;
};

export async function enforceRateLimit(input: EnforceInput): Promise<ConsumeResult> {
  const policy = getPolicy(input.name);
  const cost = input.cost ?? 1;
  const key = `rl:${input.name}:${input.identifier}`;

  const s = getStore();
  const existing = await s.get(key);
  const now = Date.now();
  const { result, nextState } = consume(existing, policy, cost, now);

  // Persist with TTL = capacity / refill seconds (after which bucket
  // would be full again anyway). Cap at 1 hour.
  const ttlSeconds = Math.min(3600, policy.capacity / policy.refillPerSecond);
  await s.set(key, nextState, ttlSeconds * 1000);

  if (!result.allowed) {
    log.info("Rate limited.", {
      name: input.name,
      identifier: input.identifier,
      retryAfterSeconds: result.retryAfterSeconds,
    });
    throw new RateLimitError(
      `Rate limit exceeded. Retry in ${Math.ceil(result.retryAfterSeconds)}s.`,
      result.retryAfterSeconds,
      input.name,
    );
  }

  return result;
}

/* ─── Re-exports ─────────────────────────────────────────────────── */

export { POLICIES, getPolicy } from "./policies";
export type { PolicyName } from "./policies";
export type { BucketPolicy } from "./token-bucket";
export type { RateLimitStore } from "./store";
