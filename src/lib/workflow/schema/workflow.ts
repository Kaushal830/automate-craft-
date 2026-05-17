/**
 * Workflow IR (Intermediate Representation) — top-level schema.
 *
 * This is the canonical, platform-neutral form of an automation. Every
 * generation, validation, storage, and execution path operates on this
 * shape. The IR has zero knowledge of any specific execution engine
 * (n8n, Temporal, custom). Adapters consume it to produce engine-
 * specific deployments.
 *
 * SCHEMA VERSIONING
 *   schemaVersion is locked at 1 for Phase 1.
 *   Future breaking changes use versioned migrations:
 *     - bump schemaVersion to 2
 *     - add migration `migrate-v1-to-v2.ts`
 *     - all loaders dispatch on schemaVersion
 *   This guarantees stored workflows remain readable forever.
 */

import { z } from "zod";
import { integrationSchema } from "./integration";
import { stepSchema } from "./step";
import { triggerSchema } from "./trigger";
import { setupFieldsSchema } from "./field";

/** Locked at 1 for Phase 1. Bump only via migration. */
export const WORKFLOW_SCHEMA_VERSION = 1 as const;

export const workflowStatusSchema = z.enum(["draft", "active", "paused"]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

/**
 * Hard upper bound on steps per workflow. Plan-tier limits (Starter 6,
 * Plus 8) are enforced by validation/plan-limits, not the schema. The
 * schema cap exists to prevent pathological AI output.
 */
const MAX_STEPS = 24;

export const workflowIRSchema = z
  .object({
    /**
     * IR schema version. Must equal WORKFLOW_SCHEMA_VERSION.
     * Stored on disk so future loaders can migrate older versions.
     */
    schemaVersion: z.literal(WORKFLOW_SCHEMA_VERSION),

    name: z.string().trim().min(3).max(120),
    description: z.string().trim().min(3).max(480),

    trigger: triggerSchema,

    steps: z.array(stepSchema).min(1).max(MAX_STEPS),

    /**
     * Manifest of integrations referenced by this workflow. Must be a
     * superset of integrations actually used by steps + trigger.
     * Coherence is enforced by validation/integration-coherence.
     */
    integrations: z
      .array(integrationSchema)
      .max(10)
      .default([]),

    setupFields: setupFieldsSchema,

    status: workflowStatusSchema.default("draft"),
  })
  .strict();

export type WorkflowIR = z.infer<typeof workflowIRSchema>;
