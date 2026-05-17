/**
 * Adapter capabilities + compatibility checking.
 *
 * Every concrete `ExecutionAdapter` declares what subset of the IR it
 * can compile. The pre-deploy validator compares an IR against an
 * adapter's capabilities BEFORE invoking compile() — so capability
 * mismatches surface as typed errors with clear reasons, not as obscure
 * adapter compile failures.
 *
 * Adding a new capability bit:
 *   1. Add the field to AdapterCapabilities.
 *   2. Surface it in `checkAdapterCompatibility`.
 *   3. Each adapter declares its value.
 *
 * This module is dependency-free of any concrete adapter.
 */

import type { ParamRef, StepKind, TriggerKind, WorkflowIR } from "@/lib/workflow";

/** Closed list of ParamRef source kinds — kept in sync with `param.ts`. */
export type ParamSourceKind = ParamRef["source"];

/**
 * Capability declaration for an `ExecutionAdapter`.
 *
 * The pre-deploy validator reads this to decide if a given workflow IR
 * can be lowered to this adapter's representation.
 */
export type AdapterCapabilities = {
  /** Trigger kinds supported by the adapter. */
  supportedTriggerKinds: readonly TriggerKind[];

  /** Step kinds supported by the adapter. */
  supportedStepKinds: readonly StepKind[];

  /** ParamRef source kinds supported. */
  supportedParamSources: readonly ParamSourceKind[];

  /** Whether the adapter can compile DAG branches (next.length > 1). */
  supportsBranching: boolean;

  /**
   * Whether the adapter can run multiple branches concurrently.
   * If false, the orchestrator falls back to sequential execution
   * even when the IR fans out.
   */
  supportsParallel: boolean;

  /** Hard cap on total nodes (steps + trigger) the adapter will deploy. */
  maxNodes: number;

  /**
   * Optional deny-list of (integration, operation) pairs the adapter
   * does not implement, even though they exist in the operation
   * catalog. Empty = adapter implements everything in the catalog.
   */
  unsupportedOperations?: ReadonlyArray<{
    integration: string | null;
    operation: string;
  }>;
};

/* ─── Compatibility check ────────────────────────────────────────── */

export type CompatibilityResult =
  | { compatible: true }
  | { compatible: false; reasons: string[] };

/**
 * Verify that a workflow IR fits an adapter's declared capabilities.
 *
 * Pure function. Does NOT mutate the IR. Returns a list of human-readable
 * reasons if any constraints are violated.
 */
export function checkAdapterCompatibility(
  workflow: WorkflowIR,
  capabilities: AdapterCapabilities,
): CompatibilityResult {
  const reasons: string[] = [];

  // 1. Trigger kind
  if (!capabilities.supportedTriggerKinds.includes(workflow.trigger.kind)) {
    reasons.push(
      `Adapter does not support trigger kind "${workflow.trigger.kind}".`,
    );
  }

  // 2. Node count
  const totalNodes = workflow.steps.length + 1; // +1 for trigger
  if (totalNodes > capabilities.maxNodes) {
    reasons.push(
      `Workflow has ${totalNodes} nodes; adapter max is ${capabilities.maxNodes}.`,
    );
  }

  // 3. Branching support
  const hasBranching = workflow.steps.some((step) => step.next.length > 1);
  if (hasBranching && !capabilities.supportsBranching) {
    reasons.push(`Adapter does not support branching, but workflow has branches.`);
  }

  // 4. Per-step kind + param source checks
  const denyOpSet = new Set(
    (capabilities.unsupportedOperations ?? []).map(
      (entry) => `${entry.integration ?? "(builtin)"}::${entry.operation}`,
    ),
  );

  for (const step of workflow.steps) {
    if (!capabilities.supportedStepKinds.includes(step.kind)) {
      reasons.push(
        `Step "${step.id}" has kind "${step.kind}" which the adapter does not support.`,
      );
    }

    const opKey = `${step.integration ?? "(builtin)"}::${step.operation}`;
    if (denyOpSet.has(opKey)) {
      reasons.push(
        `Step "${step.id}" uses operation "${step.operation}" which is unsupported on this adapter.`,
      );
    }

    for (const [paramKey, paramRef] of Object.entries(step.params)) {
      if (!capabilities.supportedParamSources.includes(paramRef.source)) {
        reasons.push(
          `Step "${step.id}" param "${paramKey}" uses source "${paramRef.source}" which the adapter does not support.`,
        );
      }
    }
  }

  return reasons.length === 0
    ? { compatible: true }
    : { compatible: false, reasons };
}
