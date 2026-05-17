/**
 * Graph integrity validator.
 *
 * Verifies that the step graph is well-formed:
 *   - Step IDs are unique within the workflow.
 *   - Every `next[]` edge points to an existing step ID.
 *   - Every `ParamRef` of source="step" references an existing step
 *     that runs BEFORE the current one (topological order).
 *   - The graph contains no cycles.
 *   - Exactly one root step (no incoming edges) exists, OR all steps
 *     are reachable from a known set of roots.
 *
 * This is the gate that prevents broken workflows from reaching the
 * adapter layer.
 */

import { WorkflowGraphError } from "../errors";
import type { ParamRef, Step, WorkflowIR } from "../schema";

export type GraphIntegrityResult = {
  /** Topologically sorted step IDs. Useful for adapters. */
  topologicalOrder: string[];
};

export function validateGraphIntegrity(workflow: WorkflowIR): GraphIntegrityResult {
  const stepsById = new Map<string, Step>();

  // 1. Unique IDs
  for (const step of workflow.steps) {
    if (stepsById.has(step.id)) {
      throw new WorkflowGraphError(
        `Duplicate step ID "${step.id}".`,
        { duplicateId: step.id },
      );
    }
    stepsById.set(step.id, step);
  }

  // 2. All next[] edges reference existing steps
  for (const step of workflow.steps) {
    for (const targetId of step.next) {
      if (!stepsById.has(targetId)) {
        throw new WorkflowGraphError(
          `Step "${step.id}" has edge to unknown step "${targetId}".`,
          { stepId: step.id, missingTarget: targetId },
        );
      }
      if (targetId === step.id) {
        throw new WorkflowGraphError(
          `Step "${step.id}" has a self-loop.`,
          { stepId: step.id },
        );
      }
    }
  }

  // 3. ParamRef source="step" references must exist
  for (const step of workflow.steps) {
    for (const [paramKey, paramRef] of Object.entries(step.params)) {
      const referencedId = extractStepIdFromRef(paramRef);
      if (referencedId === null) continue;
      if (!stepsById.has(referencedId)) {
        throw new WorkflowGraphError(
          `Step "${step.id}" param "${paramKey}" references unknown step "${referencedId}".`,
          { stepId: step.id, paramKey, missingRef: referencedId },
        );
      }
      if (referencedId === step.id) {
        throw new WorkflowGraphError(
          `Step "${step.id}" param "${paramKey}" cannot reference itself.`,
          { stepId: step.id, paramKey },
        );
      }
    }
  }

  // 4. Topological sort + cycle detection (Kahn's algorithm)
  const order = topologicalSort(workflow.steps);

  // 5. Param refs must point to a step that runs BEFORE the referencing step
  const orderIndex = new Map(order.map((id, idx) => [id, idx]));
  for (const step of workflow.steps) {
    for (const [paramKey, paramRef] of Object.entries(step.params)) {
      const referencedId = extractStepIdFromRef(paramRef);
      if (referencedId === null) continue;
      const refIdx = orderIndex.get(referencedId);
      const ownIdx = orderIndex.get(step.id);
      if (refIdx === undefined || ownIdx === undefined) continue;
      if (refIdx >= ownIdx) {
        throw new WorkflowGraphError(
          `Step "${step.id}" param "${paramKey}" references "${referencedId}" which does not run before this step.`,
          { stepId: step.id, paramKey, ref: referencedId },
        );
      }
    }
  }

  return { topologicalOrder: order };
}

/* ─── Helpers ────────────────────────────────────────────────────── */

/**
 * Extract the step ID prefix from a `step` source ParamRef.
 * Returns null for non-step refs.
 */
function extractStepIdFromRef(ref: ParamRef): string | null {
  if (ref.source !== "step") return null;
  const dotIdx = ref.ref.indexOf(".");
  if (dotIdx === -1) return ref.ref;
  return ref.ref.slice(0, dotIdx);
}

/**
 * Kahn's algorithm. Throws WorkflowGraphError on cycles.
 */
function topologicalSort(steps: Step[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const step of steps) {
    if (!inDegree.has(step.id)) inDegree.set(step.id, 0);
    if (!adjacency.has(step.id)) adjacency.set(step.id, []);
    for (const target of step.next) {
      adjacency.get(step.id)!.push(target);
      inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    for (const target of adjacency.get(id) ?? []) {
      const newDegree = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, newDegree);
      if (newDegree === 0) queue.push(target);
    }
  }

  if (result.length !== steps.length) {
    throw new WorkflowGraphError(
      `Workflow contains a cycle in its step graph.`,
      { sortedCount: result.length, totalSteps: steps.length },
    );
  }

  return result;
}
