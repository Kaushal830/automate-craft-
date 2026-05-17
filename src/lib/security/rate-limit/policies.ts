/**
 * Per-route rate-limit policies.
 *
 * Capacities are deliberately loose for Phase 2 (memory-only store
 * means per-process drift). Tighten in Phase 3 once Redis is in place.
 *
 * Naming convention: dotted route slug — keeps the registry stable
 * even when API paths change.
 */

import type { BucketPolicy } from "./token-bucket";

export type PolicyName =
  | "generate-automation"
  | "save-automation"
  | "run-automation"
  | "deploy-automation"
  | "webhook-receive"
  | "connections-mutate";

export const POLICIES: Record<PolicyName, BucketPolicy> = {
  /** AI generation — expensive (LLM call). 10/min steady. */
  "generate-automation": { capacity: 10, refillPerSecond: 10 / 60 },
  /** Save flow — cheap. 30/min. */
  "save-automation": { capacity: 30, refillPerSecond: 30 / 60 },
  /** Manual run — credit + adapter call. 30/min. */
  "run-automation": { capacity: 30, refillPerSecond: 30 / 60 },
  /** Deploy — expensive (external API call). 5/min. */
  "deploy-automation": { capacity: 5, refillPerSecond: 5 / 60 },
  /** Webhook receive — lots of legitimate inbound. 300/min per webhook id. */
  "webhook-receive": { capacity: 300, refillPerSecond: 300 / 60 },
  /** Connection mutations — moderate. 20/min. */
  "connections-mutate": { capacity: 20, refillPerSecond: 20 / 60 },
};

export function getPolicy(name: PolicyName): BucketPolicy {
  return POLICIES[name];
}
