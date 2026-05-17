/**
 * N8nAdapter — concrete implementation.
 *
 * Implements the `ExecutionAdapter` contract over n8n's REST API.
 * Compilation is delegated to the pure `compileWorkflowToN8n` function;
 * lifecycle methods talk to n8n via `n8nClient`.
 *
 * Stays carefully decoupled from the rest of the platform: imports
 * only from `@/lib/workflow` (IR types) and its own sub-modules.
 */

import type { WorkflowIR } from "@/lib/workflow";
import type {
  Credentials,
  DeploymentRef,
  ExecutionAdapter,
  ExecutionPlan,
  RunRef,
  RunStatus,
  StepStatus,
} from "../types";
import type { AdapterCapabilities } from "../capabilities";
import { hasN8nConfigured } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { compileWorkflowToN8n } from "./compiler/compile";
import { n8nClient } from "./client/http-client";
import type { N8nWorkflow, N8nExecutionStatus } from "./client/types";

const log = createLogger("adapters/n8n/adapter");

const N8N_CAPABILITIES: AdapterCapabilities = {
  supportedTriggerKinds: ["manual", "webhook", "form", "schedule", "event"],
  supportedStepKinds: [
    "action",
    "transform",
    "notification",
    "condition",
    "delay",
    "save",
  ],
  supportedParamSources: ["literal", "trigger", "step", "template", "secret"],
  supportsBranching: true,
  supportsParallel: true,
  maxNodes: 64,
};

type N8nExecutionPlan = ExecutionPlan & {
  graph: N8nWorkflow;
};

export class N8nAdapter implements ExecutionAdapter {
  readonly name = "n8n";
  readonly capabilities = N8N_CAPABILITIES;

  isReady(): boolean {
    return hasN8nConfigured();
  }

  /* ─── compile (pure) ─────────────────────────────────────────── */

  compile(workflow: WorkflowIR): ExecutionPlan {
    log.info("Compiling workflow.", {
      stepCount: workflow.steps.length,
      triggerKind: workflow.trigger.kind,
    });

    const graph = compileWorkflowToN8n(workflow);

    const plan: N8nExecutionPlan = {
      adapter: this.name,
      graph,
      metadata: {
        irName: workflow.name,
        irSchemaVersion: workflow.schemaVersion,
        nodeCount: graph.nodes.length,
        triggerKind: workflow.trigger.kind,
      },
    };
    return plan;
  }

  /* ─── deploy ─────────────────────────────────────────────────── */

  async deploy(plan: ExecutionPlan, credentials: Credentials): Promise<DeploymentRef> {
    if (plan.adapter !== this.name) {
      throw new Error(
        `n8n adapter received plan for adapter "${plan.adapter}".`,
      );
    }

    // Phase 4: credentials are pre-registered with n8n via the
    // syncCredentialToN8n service. Connection rows carry the n8n
    // credential ID in metadata; the workflow compiler attaches them
    // to individual nodes. The `credentials` map passed in here is
    // retained for audit and future per-deploy overrides.
    log.info("Deploying compiled workflow to n8n.", {
      credentialCount: Object.keys(credentials).length,
    });

    const n8nWorkflow = (plan as N8nExecutionPlan).graph;
    const created = await n8nClient.createWorkflow(n8nWorkflow);

    // Activate so triggers register.
    try {
      await n8nClient.activateWorkflow(created.id);
    } catch (error) {
      log.warn("Activate failed; deployment created but inactive.", error);
    }

    return {
      adapter: this.name,
      externalId: created.id,
      metadata: {
        n8nName: created.name,
        n8nActive: created.active,
      },
    };
  }

  /* ─── pause / resume ─────────────────────────────────────────── */

  async pause(deploymentRef: DeploymentRef): Promise<void> {
    log.info("Pausing n8n workflow.", { externalId: deploymentRef.externalId });
    await n8nClient.deactivateWorkflow(deploymentRef.externalId);
  }

  async resume(deploymentRef: DeploymentRef): Promise<void> {
    log.info("Resuming n8n workflow.", { externalId: deploymentRef.externalId });
    await n8nClient.activateWorkflow(deploymentRef.externalId);
  }

  /* ─── execute ────────────────────────────────────────────────── */

  async execute(deploymentRef: DeploymentRef, payload: unknown): Promise<RunRef> {
    log.info("Executing n8n workflow.", { externalId: deploymentRef.externalId });
    const response = await n8nClient.triggerExecution(
      deploymentRef.externalId,
      payload,
    );
    return {
      deploymentRef,
      runId: response.executionId,
    };
  }

  /* ─── pollStatus ─────────────────────────────────────────────── */

  async pollStatus(runRef: RunRef): Promise<RunStatus> {
    const status = await n8nClient.getExecution(runRef.runId);
    return mapN8nExecutionStatus(status);
  }

  /* ─── destroy ────────────────────────────────────────────────── */

  async destroy(deploymentRef: DeploymentRef): Promise<void> {
    log.info("Destroying n8n workflow.", { externalId: deploymentRef.externalId });
    await n8nClient.deleteWorkflow(deploymentRef.externalId);
  }
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function mapN8nExecutionStatus(status: N8nExecutionStatus): RunStatus {
  const state = mapState(status);
  const steps: RunStatus["steps"] = [];

  const runData = status.data?.resultData?.runData ?? {};
  for (const [stepName, executions] of Object.entries(runData)) {
    const last = executions[executions.length - 1];
    const stepStatus: StepStatus = last?.error ? "error" : "success";
    steps.push({
      id: stepName,
      status: stepStatus,
      output: last?.data?.main?.[0]?.[0],
      error: last?.error?.message,
    });
  }

  return {
    state,
    startedAt: null,
    finishedAt: status.stoppedAt ?? null,
    steps,
  };
}

function mapState(status: N8nExecutionStatus): RunStatus["state"] {
  if (!status.finished) {
    return status.status === "new" ? "queued" : "running";
  }
  if (status.status === "success") return "success";
  return "error";
}
