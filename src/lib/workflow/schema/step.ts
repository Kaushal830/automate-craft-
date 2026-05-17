/**
 * Step schema — single node in the workflow execution graph.
 *
 * A step is the atomic unit of work. The IR represents steps as nodes
 * in a directed graph (edges via `next[]`), not a flat array. This is
 * essential for future features:
 *   - Conditional branching (if/else)
 *   - Parallel execution (fan-out)
 *   - Loops (n8n: "Split In Batches" + back-edge)
 *
 * Adapters compile steps into their native node types. The IR step is
 * deliberately abstract — a step doesn't know HOW it will execute, only
 * WHAT it should accomplish (kind + operation + params).
 */

import { z } from "zod";
import { integrationSchema } from "./integration";
import { stepParamsSchema } from "./param";

/**
 * Stable step identifier. Used by `next[]` edges and by ParamRef
 * source="step" references. Uniqueness within a workflow is enforced
 * by validation/graph-integrity, not the schema.
 */
const stepIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Step IDs must start with a lowercase letter and contain only lowercase letters, digits, and underscores.",
  );

/**
 * Step kind = high-level execution category.
 *
 * Maps roughly to n8n node categories but is not n8n-specific:
 *   action       — perform external work (API call, DB write)
 *   transform    — pure data manipulation (no I/O)
 *   notification — outbound message (Slack, WhatsApp, email)
 *   condition    — branch on data (next[] becomes 2+ entries)
 *   delay        — wait (fixed duration or until time)
 *   save         — persist record (Sheets, DB, CRM)
 */
export const STEP_KINDS = [
  "action",
  "transform",
  "notification",
  "condition",
  "delay",
  "save",
] as const;

export const stepKindSchema = z.enum(STEP_KINDS);
export type StepKind = z.infer<typeof stepKindSchema>;

/**
 * Operation = verb under an integration (or built-in for transform/condition/delay).
 *
 * Examples:
 *   integration: "slack",     operation: "post_message"
 *   integration: "sheets",    operation: "append_row"
 *   integration: "whatsapp",  operation: "send_template"
 *   integration: undefined,   kind: "transform", operation: "extract_fields"
 *   integration: undefined,   kind: "delay",     operation: "wait_seconds"
 *
 * The closed catalog of valid (integration, operation) pairs is owned
 * by validation/integration-coherence, not the schema. The schema
 * accepts any well-formed identifier so new operations can ship without
 * a schema migration.
 */
const operationSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Operation must be lowercase snake_case.",
  );

/**
 * Error policy for a step.
 *
 * fail     — abort the run with the step's error
 * continue — log the error, mark step as failed, continue to next[]
 * retry    — retry per default policy (Phase 2: configurable)
 */
export const STEP_ERROR_POLICIES = ["fail", "continue", "retry"] as const;
export const stepErrorPolicySchema = z.enum(STEP_ERROR_POLICIES);
export type StepErrorPolicy = z.infer<typeof stepErrorPolicySchema>;

export const stepSchema = z
  .object({
    id: stepIdSchema,

    /** Human-readable label for UI display. AI-generated, sanitized. */
    name: z.string().trim().min(2).max(120),

    /** Optional human description shown on the blueprint UI. */
    description: z.string().trim().min(2).max(480).optional(),

    kind: stepKindSchema,

    /**
     * Integration this step targets. Optional for kinds that don't need
     * an external system (transform, condition, delay).
     */
    integration: integrationSchema.optional(),

    /** Verb performed under the integration. */
    operation: operationSchema,

    /** Input parameters keyed by parameter name. */
    params: stepParamsSchema,

    /**
     * Outgoing edges by step ID. Empty array = terminal step.
     * Multiple entries valid for kind="condition" (one per branch).
     * Cycle detection lives in validation/graph-integrity.
     */
    next: z.array(stepIdSchema).max(8).default([]),

    /** Error handling policy for this step. */
    onError: stepErrorPolicySchema.default("fail"),
  })
  .strict();

export type Step = z.infer<typeof stepSchema>;
