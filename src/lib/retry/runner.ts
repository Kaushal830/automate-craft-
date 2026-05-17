/**
 * Retry runner — wraps an async thunk with a retry policy.
 *
 *   const result = await withRetry(() => n8nClient.createWorkflow(w), RETRY_POLICIES.standard);
 *
 * Two flavors:
 *   - `withRetry()`     — throws on final failure (ergonomic default)
 *   - `tryWithRetry()`  — returns RetryOutcome (useful when caller
 *                         wants attempt count or wants to branch
 *                         without try/catch)
 */

import { createLogger } from "@/lib/logger";
import { computeDelay, defaultIsRetryable } from "./backoff";
import type { RetryOutcome, RetryPolicy } from "./types";

const log = createLogger("retry/runner");

export async function withRetry<T>(
  thunk: () => Promise<T>,
  policy: RetryPolicy,
): Promise<T> {
  const outcome = await tryWithRetry(thunk, policy);
  if (outcome.ok) return outcome.value;
  throw outcome.error;
}

export async function tryWithRetry<T>(
  thunk: () => Promise<T>,
  policy: RetryPolicy,
): Promise<RetryOutcome<T>> {
  const isRetryable = policy.isRetryable ?? defaultIsRetryable;
  let lastError: unknown;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    const delay = computeDelay(attempt, policy);
    if (delay > 0) await sleep(delay);

    try {
      const value = await thunk();
      return { ok: true, value, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt === policy.maxAttempts || !isRetryable(error, attempt)) {
        log.debug("Retry exhausted or not retryable.", {
          attempts: attempt,
          retryable: isRetryable(error, attempt),
        });
        return { ok: false, error, attempts: attempt };
      }
      log.debug("Retrying after error.", {
        attempt,
        nextDelay: computeDelay(attempt + 1, policy),
      });
    }
  }

  return { ok: false, error: lastError, attempts: policy.maxAttempts };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
