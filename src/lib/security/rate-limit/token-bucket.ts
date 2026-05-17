/**
 * Token-bucket rate limiter.
 *
 * Pure algorithm — no I/O. The orchestrating function loads bucket
 * state from a `RateLimitStore`, runs `consume()`, persists state.
 *
 * Bucket behavior:
 *   - capacity        — max tokens stored
 *   - refillPerSecond — tokens added per second (continuous)
 *   - cost            — tokens charged per request
 *
 * If `tokens >= cost`, deduct and allow. Otherwise reject and report
 * how many seconds until enough tokens exist.
 */

import type { BucketState } from "./store";

export type BucketPolicy = {
  capacity: number;
  refillPerSecond: number;
};

export type ConsumeResult =
  | { allowed: true; tokensRemaining: number }
  | { allowed: false; tokensRemaining: number; retryAfterSeconds: number };

/**
 * Apply elapsed-time refill, then attempt to deduct `cost`.
 */
export function consume(
  state: BucketState | null,
  policy: BucketPolicy,
  cost: number,
  now: number = Date.now(),
): { result: ConsumeResult; nextState: BucketState } {
  const previous = state ?? {
    tokens: policy.capacity,
    updatedAt: now,
  };

  const elapsedSeconds = Math.max(0, (now - previous.updatedAt) / 1000);
  const refilled = Math.min(
    policy.capacity,
    previous.tokens + elapsedSeconds * policy.refillPerSecond,
  );

  if (refilled >= cost) {
    const tokensRemaining = refilled - cost;
    return {
      result: { allowed: true, tokensRemaining },
      nextState: { tokens: tokensRemaining, updatedAt: now },
    };
  }

  const deficit = cost - refilled;
  const retryAfterSeconds = deficit / policy.refillPerSecond;
  return {
    result: {
      allowed: false,
      tokensRemaining: refilled,
      retryAfterSeconds,
    },
    nextState: { tokens: refilled, updatedAt: now },
  };
}
