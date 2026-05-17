/**
 * Pluggable rate-limit store interface + in-memory implementation.
 *
 * The token-bucket algorithm is independent of the store. Swap
 * `MemoryRateLimitStore` for a Redis-backed impl by changing the
 * factory in `index.ts` — algorithm stays the same.
 *
 * Memory mode is per-process only. Multi-instance deployments will
 * need Redis (Phase 3) — until then, plan rate caps generously to
 * tolerate per-process drift.
 */

export type BucketState = {
  /** Tokens currently available (fractional ok). */
  tokens: number;
  /** Last refill time (epoch ms). */
  updatedAt: number;
};

export interface RateLimitStore {
  get(key: string): Promise<BucketState | null>;
  set(key: string, state: BucketState, ttlMs: number): Promise<void>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly map = new Map<string, { state: BucketState; expiresAt: number }>();

  async get(key: string): Promise<BucketState | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return entry.state;
  }

  async set(key: string, state: BucketState, ttlMs: number): Promise<void> {
    this.map.set(key, { state, expiresAt: Date.now() + ttlMs });
  }

  /** Test helper. */
  _reset(): void {
    this.map.clear();
  }
}
