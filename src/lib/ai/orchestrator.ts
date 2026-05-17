/**
 * Workflow generation orchestrator.
 *
 * Single entry point for producing a fully validated WorkflowIR from a
 * user prompt. Composes:
 *
 *   prompt → provider.generate()
 *          → sanitize raw output
 *          → workflowIRSchema.parse() (hard schema gate)
 *          → validateWorkflow() (semantic validation)
 *          → return WorkflowGenerationOutcome
 *
 * Falls back to the deterministic builder if no provider is configured.
 * Provider failures bubble up as typed errors (see workflow/errors).
 */

import { z } from "zod";
import {
  WORKFLOW_SCHEMA_VERSION,
  WorkflowSchemaError,
  isWorkflowError,
  sanitizeWorkflowIR,
  validateWorkflow,
  workflowIRSchema,
  type GenerationTier,
  type PlanTier,
  type WorkflowIR,
} from "@/lib/workflow";
import { createLogger } from "@/lib/logger";
import { getConfiguredProvider } from "@/lib/ai/providers";
import { buildDeterministicIR } from "@/lib/ai/fallback";
import type {
  GenerationContext,
  WorkflowGenerationOutcome,
} from "@/lib/ai/types";

const log = createLogger("ai/orchestrator");

export type OrchestratorOptions = {
  prompt: string;
  ultraThinking?: boolean;
  hasSubscription?: boolean;
  /**
   * Plan tier for the requesting user. Determines validation
   * limits. Defaults to "starter".
   */
  plan?: PlanTier;
};

/**
 * Generate a workflow IR from a user prompt.
 *
 * Always returns a fully validated `WorkflowIR`. On any unrecoverable
 * provider failure, throws a typed `WorkflowError`.
 */
export async function generateWorkflow(
  options: OrchestratorOptions,
): Promise<WorkflowGenerationOutcome> {
  const tier: GenerationTier = options.ultraThinking ? "ultra" : "standard";
  const ctx: GenerationContext = {
    prompt: options.prompt,
    tier,
    hasSubscription: options.hasSubscription ?? false,
  };
  const plan: PlanTier = options.plan ?? "starter";

  // ── 1. Pick provider ──────────────────────────────────────────
  const provider = getConfiguredProvider();

  // If the provider isn't ready, fall back to the deterministic builder.
  if (!provider.isReady()) {
    log.info("No AI provider configured. Falling back to deterministic builder.");
    return runDeterministicFallback(ctx, plan);
  }

  // ── 2. Run provider ───────────────────────────────────────────
  let providerResult;
  try {
    providerResult = await provider.generate(ctx);
  } catch (error) {
    // Typed provider errors bubble up. Other errors are wrapped.
    if (isWorkflowError(error)) throw error;
    log.error("Provider call threw an unexpected error.", error);
    throw error;
  }

  // ── 3. Sanitize raw output ────────────────────────────────────
  const sanitized = sanitizeWorkflowIR(providerResult.rawWorkflow);

  // ── 4. Schema parse (hard gate) ───────────────────────────────
  const parsed = parseIR(sanitized, "Provider output");

  // ── 5. Semantic validation ────────────────────────────────────
  const validation = validateWorkflow(parsed, { plan });

  // ── 6. Compose outcome ────────────────────────────────────────
  return {
    workflow: validation.workflow,
    source: providerResult.source,
    tier,
    cost: tier === "ultra" ? 10 : 5,
    metadata: {
      ...providerResult.metadata,
      topologicalOrder: validation.topologicalOrder,
    },
    warnings: validation.warnings.map((w) => ({
      code: w.code,
      message: w.message,
    })),
  };
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function parseIR(input: unknown, contextLabel: string): WorkflowIR {
  try {
    return workflowIRSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw WorkflowSchemaError.fromZodError(error, contextLabel);
    }
    throw error;
  }
}

function runDeterministicFallback(
  ctx: GenerationContext,
  plan: PlanTier,
): WorkflowGenerationOutcome {
  const ir = buildDeterministicIR(ctx.prompt);
  // Run the same validation pipeline so the fallback can never produce
  // an invalid workflow on any code path.
  const validation = validateWorkflow(ir, { plan });

  return {
    workflow: validation.workflow,
    source: "fallback",
    tier: ctx.tier,
    cost: ctx.tier === "ultra" ? 10 : 5,
    metadata: {
      builder: "deterministic",
      schemaVersion: WORKFLOW_SCHEMA_VERSION,
      topologicalOrder: validation.topologicalOrder,
    },
    warnings: validation.warnings.map((w) => ({
      code: w.code,
      message: w.message,
    })),
  };
}
