/**
 * Workflow cost calculator.
 *
 * Two distinct costs:
 *
 * 1. GENERATION COST — credits charged when the AI generates a workflow.
 *    Depends on tier (standard vs ultra) and is independent of the
 *    workflow's complexity.
 *
 * 2. EXECUTION COST — credits charged each time the workflow runs.
 *    Sum of per-step + per-integration surcharges.
 *
 * Both costs are pure functions of their inputs. No I/O, no state.
 * They can be invoked from API routes for credit checks, from the
 * frontend (via API) for cost previews, and from execution adapters
 * for accurate ledger entries.
 */

import type { SupportedIntegration, WorkflowIR } from "../schema";

/* ─── Generation cost ────────────────────────────────────────────── */

export type GenerationTier = "standard" | "ultra";

const GENERATION_COSTS: Record<GenerationTier, number> = {
  standard: 5,
  ultra: 10,
};

export function calculateGenerationCost(tier: GenerationTier): number {
  return GENERATION_COSTS[tier];
}

/* ─── Execution cost ─────────────────────────────────────────────── */

const BASE_STEP_COST = 1;

const INTEGRATION_SURCHARGES: Partial<Record<SupportedIntegration, number>> = {
  whatsapp: 2,
  email: 1,
  hubspot: 1,
  salesforce: 1,
  webhook: 1,
  razorpay: 1,
  stripe: 1,
};

export type ExecutionCostBreakdown = {
  total: number;
  baseCost: number;
  integrationSurcharge: number;
  perStep: Array<{
    stepId: string;
    base: number;
    surcharge: number;
    integration: SupportedIntegration | null;
  }>;
};

export function calculateExecutionCost(workflow: WorkflowIR): ExecutionCostBreakdown {
  let baseCost = 0;
  let integrationSurcharge = 0;
  const perStep: ExecutionCostBreakdown["perStep"] = [];

  for (const step of workflow.steps) {
    const surcharge = step.integration
      ? INTEGRATION_SURCHARGES[step.integration] ?? 0
      : 0;
    baseCost += BASE_STEP_COST;
    integrationSurcharge += surcharge;
    perStep.push({
      stepId: step.id,
      base: BASE_STEP_COST,
      surcharge,
      integration: step.integration ?? null,
    });
  }

  return {
    total: baseCost + integrationSurcharge,
    baseCost,
    integrationSurcharge,
    perStep,
  };
}
