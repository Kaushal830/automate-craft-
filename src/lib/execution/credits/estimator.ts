/**
 * Execution credit estimator.
 *
 * Pure-ish service that returns the full cost breakdown for running an
 * automation, sourced from the active workflow version. Used by the
 * pre-run cost preview endpoint and by the runtime orchestrator
 * before reserving credits.
 *
 * Cost math itself lives in `workflow/cost/calculator.ts`. This module
 * loads the IR and delegates.
 */

import { getActiveVersion } from "@/lib/workflow-store";
import {
  AutomationNotFoundError,
  calculateExecutionCost,
  type ExecutionCostBreakdown,
} from "@/lib/workflow";

export type EstimateInput = {
  automationId: string;
};

export type EstimateResult = {
  automationId: string;
  versionId: string;
  versionNumber: number;
  cost: ExecutionCostBreakdown;
};

export async function estimateRunCost(input: EstimateInput): Promise<EstimateResult> {
  const version = await getActiveVersion(input.automationId);
  if (!version) {
    throw new AutomationNotFoundError(
      `No active workflow version for automation ${input.automationId}.`,
      { automationId: input.automationId },
    );
  }
  return {
    automationId: input.automationId,
    versionId: version.id,
    versionNumber: version.versionNumber,
    cost: calculateExecutionCost(version.workflow),
  };
}
