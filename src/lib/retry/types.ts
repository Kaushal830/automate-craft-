/**
 * Retry domain types.
 *
 * The retry engine is intentionally generic: takes a thunk and a
 * policy, returns the thunk's result or the last error after
 * exhausting retries.
 *
 * Wiring points (Phase 4 + 5):
 *   - OAuth refresh — single retry on transient 5xx
 *   - n8n REST calls — exponential backoff on 5xx / network errors
 *   - Per-step n8n execution (Phase 5) — IR-declared retry policy
 *     compiles into n8n node's `retryOnFail` configuration
 */

export type BackoffStrategy = "linear" | "exponential" | "fixed";

export type RetryPolicy = {
  /** Total attempts including the first try. */
  maxAttempts: number;
  /** Base delay between attempts (ms). */
  baseDelayMs: number;
  /** Cap on the computed delay (ms). */
  maxDelayMs: number;
  strategy: BackoffStrategy;
  /**
   * Jitter ratio (0..1). 0 = deterministic; 0.5 = up to ±50% noise.
   * Reduces thundering herd when many callers retry simultaneously.
   */
  jitter: number;
  /**
   * Classifier: returns true if the error is worth retrying.
   * Default: treats network errors + 5xx as retryable; 4xx as fatal.
   */
  isRetryable?: (error: unknown, attempt: number) => boolean;
};

/**
 * Standard policies. Concrete callers can override fields per-call.
 */
export const RETRY_POLICIES = {
  /** Quick: 3 attempts, ~100ms ramp. Used for read-only calls. */
  quick: {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    strategy: "exponential" as const,
    jitter: 0.25,
  },
  /** Standard: 5 attempts. Used for n8n REST + OAuth refresh. */
  standard: {
    maxAttempts: 5,
    baseDelayMs: 200,
    maxDelayMs: 5000,
    strategy: "exponential" as const,
    jitter: 0.25,
  },
  /** Persistent: 8 attempts, longer ceiling. Background tasks only. */
  persistent: {
    maxAttempts: 8,
    baseDelayMs: 500,
    maxDelayMs: 30_000,
    strategy: "exponential" as const,
    jitter: 0.4,
  },
} as const satisfies Record<string, RetryPolicy>;

/** Final outcome of a retry-wrapped call. */
export type RetryOutcome<T> =
  | { ok: true; value: T; attempts: number }
  | { ok: false; error: unknown; attempts: number };
