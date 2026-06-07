/**
 * Per-user sliding-window rate limiter for the chat API.
 *
 * Allows up to MAX_REQUESTS per WINDOW_MS per userId.
 * Uses an in-memory Map — appropriate for single-instance deployments.
 * For multi-instance, swap Map → Upstash/Redis.
 */

const MAX_REQUESTS = 10; // requests per window
const WINDOW_MS = 60_000; // 60 seconds

type WindowEntry = {
  count: number;
  windowStart: number;
};

const store = new Map<string, WindowEntry>();

/**
 * Check whether the user is within rate limits.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(userId: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // Start a fresh window
    store.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfterMs = WINDOW_MS - (now - entry.windowStart);
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  entry.count += 1;
  return { allowed: true };
}

/**
 * Purge stale entries — call periodically to prevent unbounded memory growth.
 * Called automatically every 5 minutes.
 */
function purgeStaleEntries() {
  const now = Date.now();
  for (const [userId, entry] of store) {
    if (now - entry.windowStart >= WINDOW_MS * 2) {
      store.delete(userId);
    }
  }
}

// Auto-purge on a 5-minute interval
if (typeof setInterval !== "undefined") {
  setInterval(purgeStaleEntries, 5 * 60 * 1000);
}
