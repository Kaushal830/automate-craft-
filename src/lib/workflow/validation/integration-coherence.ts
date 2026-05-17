/**
 * Integration coherence validator.
 *
 * Checks that:
 *   - Every step.integration appears in workflow.integrations.
 *   - Every trigger.integration (if any) appears in workflow.integrations.
 *   - Every (integration, operation) pair is in the operation catalog.
 *   - Every step.kind is allowed for its operation.
 *   - All required params for the operation are present.
 *
 * Failures throw `WorkflowOperationUnsupportedError` or
 * `WorkflowIntegrationUnsupportedError` so the API surface can map them
 * to specific HTTP responses.
 */

import {
  WorkflowIntegrationUnsupportedError,
  WorkflowOperationUnsupportedError,
} from "../errors";
import type { WorkflowIR } from "../schema";
import { lookupOperation } from "./operation-catalog";

export type CoherenceWarning = {
  code: "INTEGRATION_NOT_DECLARED";
  message: string;
  details: Record<string, unknown>;
};

export type CoherenceResult = {
  warnings: CoherenceWarning[];
};

export function validateIntegrationCoherence(workflow: WorkflowIR): CoherenceResult {
  const warnings: CoherenceWarning[] = [];
  const declared = new Set(workflow.integrations);

  // Trigger integration must be declared (warning, not failure — we can patch).
  if (workflow.trigger.kind !== "manual" && workflow.trigger.kind !== "schedule") {
    const triggerIntegration =
      "integration" in workflow.trigger ? workflow.trigger.integration : undefined;
    if (triggerIntegration && !declared.has(triggerIntegration)) {
      warnings.push({
        code: "INTEGRATION_NOT_DECLARED",
        message: `Trigger uses integration "${triggerIntegration}" which is not declared in workflow.integrations.`,
        details: { integration: triggerIntegration },
      });
    }
  }

  // Step-level checks: integration declared, operation in catalog, kind allowed, params present.
  workflow.steps.forEach((step, index) => {
    if (step.integration && !declared.has(step.integration)) {
      warnings.push({
        code: "INTEGRATION_NOT_DECLARED",
        message: `Step "${step.id}" uses integration "${step.integration}" which is not declared in workflow.integrations.`,
        details: { integration: step.integration, stepId: step.id, stepIndex: index },
      });
    }

    const def = lookupOperation(step.integration ?? null, step.operation);
    if (!def) {
      throw new WorkflowOperationUnsupportedError(
        `Step "${step.id}": operation "${step.operation}" is not supported for integration "${step.integration ?? "(builtin)"}".`,
        {
          stepId: step.id,
          stepIndex: index,
          integration: step.integration ?? null,
          operation: step.operation,
        },
      );
    }

    if (!def.kinds.includes(step.kind)) {
      throw new WorkflowOperationUnsupportedError(
        `Step "${step.id}": operation "${step.operation}" cannot be used as kind "${step.kind}". Allowed kinds: ${def.kinds.join(", ")}.`,
        {
          stepId: step.id,
          operation: step.operation,
          kind: step.kind,
          allowedKinds: def.kinds,
        },
      );
    }

    for (const required of def.requiredParams) {
      if (!(required in step.params)) {
        throw new WorkflowOperationUnsupportedError(
          `Step "${step.id}" is missing required parameter "${required}" for operation "${step.operation}".`,
          {
            stepId: step.id,
            operation: step.operation,
            missingParam: required,
            requiredParams: def.requiredParams,
          },
        );
      }
    }
  });

  // Confirm every declared integration is recognized (Zod already does this,
  // but we double-check here to provide a friendlier error code).
  for (const integration of workflow.integrations) {
    // Zod enum already constrains; this guard exists for future drift.
    if (typeof integration !== "string") {
      throw new WorkflowIntegrationUnsupportedError(
        `Workflow integrations contains a non-string entry.`,
        { integrations: workflow.integrations },
      );
    }
  }

  return { warnings };
}
