/**
 * Backoff computation primitives.
 *
 * Pure functions — no timer. Caller invokes `computeDelay(attempt, policy)`
 * then awaits its own sleep. This makes the engine testable
 * deterministically.
 */

import type { RetryPolicy } from "./types";

/**
 * Returns the delay (ms) to wait BEFORE attempting `attempt`.
 *   attempt = 1 → 0 (first try has no wait)
 *   attempt = 2..N → policy-defined ramp
 */
export function computeDelay(attempt: number, policy: RetryPolicy): number {
  if (attempt <= 1) return 0;
  const exponent = attempt - 2; // attempt 2 is first retry → base delay × 1
  let raw: number;
  switch (policy.strategy) {
    case "fixed":
      raw = policy.baseDelayMs;
      break;
    case "linear":
      raw = policy.baseDelayMs * (exponent + 1);
      break;
    case "exponential":
      raw = policy.baseDelayMs * Math.pow(2, exponent);
      break;
  }
  const capped = Math.min(raw, policy.maxDelayMs);
  if (policy.jitter <= 0) return capped;
  // Symmetric jitter in [(1 - j) * delay, (1 + j) * delay]
  const j = Math.max(0, Math.min(1, policy.jitter));
  const noise = (Math.random() * 2 - 1) * j * capped;
  return Math.max(0, Math.floor(capped + noise));
}

/**
 * Default classification: retry on network-style errors and 5xx
 * fetch responses; bail on 4xx (input errors) and unknown shapes.
 */
export function defaultIsRetryable(error: unknown, _attempt: number): boolean {
  if (error instanceof TypeError) return true; // node-fetch network failures
  const anyErr = error as { status?: number; code?: string; name?: string };
  if (anyErr?.name === "AbortError") return false;
  if (typeof anyErr?.status === "number") {
    if (anyErr.status >= 500 && anyErr.status < 600) return true;
    if (anyErr.status === 408 || anyErr.status === 429) return true;
    return false;
  }
  if (anyErr?.code === "ECONNRESET" || anyErr?.code === "ETIMEDOUT") return true;
  return false;
}
