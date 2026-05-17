/**
 * Execution context builder.
 *
 * Composes everything an adapter needs to execute one run:
 *   - Active deployment (gives DeploymentRef)
 *   - Active workflow version (gives IR)
 *   - User's resolved form_inputs (manual run only — webhooks
 *     bypass form_inputs)
 *   - Resolved credentials from vault
 *   - Trigger payload (from caller — webhook body / manual params /
 *     scheduled tick)
 *
 * Pure-ish — performs DB reads but NO side effects on run rows.
 * The orchestrator calls this once per run, then drives execute().
 */

import { getActiveDeployment } from "@/lib/execution/deployment";
import { getActiveVersion } from "@/lib/workflow-store";
import { resolveCredentialsForWorkflow } from "@/lib/credentials";
import {
  AutomationNotFoundError,
  WorkflowValidationError,
  type WorkflowIR,
} from "@/lib/workflow";
import type { Credentials, DeploymentRef } from "@/lib/adapters";
import { getAdapter, type AdapterName } from "@/lib/adapters";
import type { AutomationRecord } from "@/lib/automation";
import { getAutomationByIdForUser } from "@/lib/automation-store";

export type TriggerKindLabel = "manual" | "webhook" | "schedule" | "form" | "event";

export type ExecutionContext = {
  automation: AutomationRecord;
  workflow: WorkflowIR;
  versionId: string;
  deploymentId: string;
  deploymentRef: DeploymentRef;
  credentials: Credentials;
  /** Final payload passed to adapter.execute(). */
  payload: Record<string, unknown>;
  triggerKind: TriggerKindLabel;
  adapterName: AdapterName;
};

export type BuildContextInput = {
  automationId: string;
  userId: string;
  triggerKind: TriggerKindLabel;
  /** External payload (webhook body, manual run inputs, etc.). */
  rawPayload?: Record<string, unknown>;
  /** Override default adapter (rare). */
  adapter?: AdapterName;
};

export async function buildExecutionContext(
  input: BuildContextInput,
): Promise<ExecutionContext> {
  const automation = await getAutomationByIdForUser(input.userId, input.automationId);
  if (!automation) {
    throw new AutomationNotFoundError(
      `Automation ${input.automationId} not found.`,
      { automationId: input.automationId },
    );
  }

  const adapterName = input.adapter ?? "n8n";
  const adapter = getAdapter(adapterName);

  const deployment = await getActiveDeployment({
    automationId: input.automationId,
    adapter: adapterName,
  });
  if (!deployment || !deployment.externalRef) {
    throw new WorkflowValidationError(
      `No active deployment for automation ${input.automationId} on adapter "${adapterName}".`,
      { automationId: input.automationId, adapter: adapterName },
    );
  }

  const version = await getActiveVersion(input.automationId);
  if (!version) {
    throw new WorkflowValidationError(
      `No active workflow version for automation ${input.automationId}.`,
      { automationId: input.automationId },
    );
  }

  const credentials = await resolveCredentialsForWorkflow({
    userId: input.userId,
    workflow: version.workflow,
  });

  const payload: Record<string, unknown> = {
    ...(automation.formInputs ?? {}),
    ...(input.rawPayload ?? {}),
    __meta: {
      automationId: automation.id,
      versionId: version.id,
      triggerKind: input.triggerKind,
      triggeredAt: new Date().toISOString(),
    },
  };

  void adapter; // adapter resolved here to fail-fast; orchestrator calls execute()

  return {
    automation,
    workflow: version.workflow,
    versionId: version.id,
    deploymentId: deployment.id,
    deploymentRef: {
      adapter: deployment.adapter,
      externalId: String(deployment.externalRef.externalId ?? deployment.id),
      metadata: deployment.externalRef,
    },
    credentials,
    payload,
    triggerKind: input.triggerKind,
    adapterName,
  };
}
