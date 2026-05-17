/**
 * Supported integrations for AutomateCraft workflows.
 *
 * This list is the single source of truth for which external services the
 * platform can target. Adding a new integration requires:
 *   1. Adding the slug here.
 *   2. Implementing connector logic (Phase 4).
 *   3. Mapping the integration in each ExecutionAdapter (Phase 2+).
 *
 * The internal IR is platform-neutral — integration slugs are abstract
 * identifiers. Adapters (n8n, future engines) translate them into their own
 * node/credential vocabulary.
 */

import { z } from "zod";

/**
 * Closed enum of integration slugs.
 *
 * Naming rules:
 *   - lowercase
 *   - single token where possible
 *   - matches the brand or product name people search for
 */
export const SUPPORTED_INTEGRATIONS = [
  "google",
  "whatsapp",
  "email",
  "slack",
  "hubspot",
  "salesforce",
  "razorpay",
  "stripe",
  "webhook",
  "forms",
  "sheets",
  "crm",
] as const;

export const integrationSchema = z.enum(SUPPORTED_INTEGRATIONS);

export type SupportedIntegration = z.infer<typeof integrationSchema>;

/**
 * Type-guard: is this string a recognized integration slug?
 */
export function isSupportedIntegration(value: unknown): value is SupportedIntegration {
  return (
    typeof value === "string" &&
    (SUPPORTED_INTEGRATIONS as readonly string[]).includes(value)
  );
}
