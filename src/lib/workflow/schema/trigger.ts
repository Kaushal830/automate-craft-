/**
 * Trigger schema — defines how a workflow starts.
 *
 * The IR uses a discriminated union over `kind` so each trigger type
 * has a strictly typed config. Adding a trigger kind requires:
 *   1. Defining its schema below.
 *   2. Adding it to the union.
 *   3. Implementing trigger compilation in every ExecutionAdapter.
 *
 * The trigger is platform-neutral. Adapters map our trigger kinds to
 * their own trigger nodes (e.g. n8n: "Webhook" node, "Schedule" node,
 * "Form Trigger" node).
 */

import { z } from "zod";
import { integrationSchema } from "./integration";

/* ─── Manual: user clicks "Run" in the dashboard ─────────────────── */

const manualTriggerSchema = z
  .object({
    kind: z.literal("manual"),
    /** Manual triggers are not bound to an integration. */
    integration: z.undefined().optional(),
    /** No config: manual runs use form_inputs from the automation row. */
    config: z.object({}).strict().default({}),
  })
  .strict();

/* ─── Webhook: external system POSTs to our webhook endpoint ─────── */

const webhookTriggerSchema = z
  .object({
    kind: z.literal("webhook"),
    /** Optional: which integration this webhook represents (e.g. "stripe"). */
    integration: integrationSchema.optional(),
    config: z
      .object({
        /** Subscribed event name, if the integration supports filtering. */
        event: z.string().trim().min(1).max(120).optional(),
        /** Optional secret env var name for HMAC verification (Phase 2). */
        verifySecretRef: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .regex(/^[A-Z][A-Z0-9_]*$/)
          .optional(),
      })
      .strict()
      .default({}),
  })
  .strict();

/* ─── Form: a form submission triggers the workflow ──────────────── */

const formTriggerSchema = z
  .object({
    kind: z.literal("form"),
    integration: integrationSchema.optional(),
    config: z
      .object({
        /**
         * Logical form identifier. The actual form mapping is resolved at
         * runtime via the user's connected forms integration.
         */
        formIdField: z.string().trim().min(1).max(120).default("formId"),
      })
      .strict()
      .default({ formIdField: "formId" }),
  })
  .strict();

/* ─── Schedule: cron-like recurring runs (Phase 2 execution) ─────── */

const scheduleTriggerSchema = z
  .object({
    kind: z.literal("schedule"),
    integration: z.undefined().optional(),
    config: z
      .object({
        /**
         * IANA-style cron expression. Validation of the expression itself
         * is performed by validation/graph-integrity, not the schema.
         */
        cron: z.string().trim().min(1).max(120),
        /** IANA timezone, e.g. "Asia/Kolkata". */
        timezone: z
          .string()
          .trim()
          .min(1)
          .max(60)
          .default("UTC"),
      })
      .strict(),
  })
  .strict();

/* ─── Event: integration-emitted business event ──────────────────── */

const eventTriggerSchema = z
  .object({
    kind: z.literal("event"),
    integration: integrationSchema,
    config: z
      .object({
        /** Logical event name, e.g. "deal.closed", "payment.failed". */
        eventName: z.string().trim().min(1).max(120),
      })
      .strict(),
  })
  .strict();

/* ─── Top-level trigger discriminated union ──────────────────────── */

export const triggerSchema = z.discriminatedUnion("kind", [
  manualTriggerSchema,
  webhookTriggerSchema,
  formTriggerSchema,
  scheduleTriggerSchema,
  eventTriggerSchema,
]);

export type Trigger = z.infer<typeof triggerSchema>;

/**
 * Closed list of trigger kinds. Used by prompt-builder, validation,
 * and adapters when iterating supported kinds.
 */
export const TRIGGER_KINDS = [
  "manual",
  "webhook",
  "form",
  "schedule",
  "event",
] as const;

export type TriggerKind = (typeof TRIGGER_KINDS)[number];
