/**
 * Composite workflow validator.
 *
 * Runs all validation passes in order:
 *   1. Schema parse (Zod) — performed by caller before invoking this.
 *   2. Plan limits        — fail-fast on overflow.
 *   3. Integration coherence — operation catalog lookup.
 *   4. Graph integrity     — IDs, edges, refs, cycles.
 *   5. Step ordering       — branching and terminal rules.
 *
 * Returns the validated workflow plus a list of warnings (issues that
 * are non-fatal, e.g. integration not declared but step uses it — we
 * could auto-patch).
 */

import type { WorkflowIR } from "../schema";
import {
  validateIntegrationCoherence,
  type CoherenceWarning,
} from "./integration-coherence";
import { validateGraphIntegrity } from "./graph-integrity";
import { validateStepOrdering } from "./step-ordering";
import { validatePlanLimits, type PlanTier } from "./plan-limits";

export type ValidationWarning = CoherenceWarning;

export type ValidationResult = {
  workflow: WorkflowIR;
  warnings: ValidationWarning[];
  topologicalOrder: string[];
};

export type ValidationOptions = {
  /** Plan tier of the requesting user. Defaults to "starter". */
  plan?: PlanTier;
};

export function validateWorkflow(
  workflow: WorkflowIR,
  options: ValidationOptions = {},
): ValidationResult {
  const plan = options.plan ?? "starter";

  // 1. Plan limits — fast and cheap, fail early on size overflow.
  validatePlanLimits(workflow, plan);

  // 2. Integration coherence — validates ops + collects warnings.
  const coherence = validateIntegrationCoherence(workflow);

  // 3. Graph integrity — produces topological order for downstream consumers.
  const graph = validateGraphIntegrity(workflow);

  // 4. Step ordering — branching/terminal rules.
  validateStepOrdering(workflow);

  return {
    workflow,
    warnings: coherence.warnings,
    topologicalOrder: graph.topologicalOrder,
  };
}
