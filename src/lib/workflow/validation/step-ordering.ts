/**
 * Step ordering validator.
 *
 * Enforces business rules about step composition:
 *   - condition kind requires at least 2 outgoing edges (true/false branches).
 *   - delay/save/notification cannot have multiple outgoing edges
 *     (no implicit branching from non-condition steps).
 *   - Workflow must contain at least one terminal step.
 */

import { WorkflowValidationError } from "../errors";
import type { WorkflowIR } from "../schema";

export function validateStepOrdering(workflow: WorkflowIR): void {
  let terminalCount = 0;

  for (const step of workflow.steps) {
    if (step.next.length === 0) terminalCount++;

    if (step.kind === "condition" && step.next.length < 2) {
      throw new WorkflowValidationError(
        `Step "${step.id}" is a condition but has fewer than 2 outgoing edges.`,
        { stepId: step.id, kind: step.kind, nextCount: step.next.length },
      );
    }

    if (step.kind !== "condition" && step.next.length > 1) {
      throw new WorkflowValidationError(
        `Step "${step.id}" of kind "${step.kind}" has multiple outgoing edges. Only "condition" steps may branch.`,
        { stepId: step.id, kind: step.kind, nextCount: step.next.length },
      );
    }
  }

  if (terminalCount === 0) {
    throw new WorkflowValidationError(
      `Workflow has no terminal step (every step has at least one outgoing edge).`,
      { stepCount: workflow.steps.length },
    );
  }
}
