/**
 * Deployment service.
 *
 * Orchestrates the full deploy lifecycle for a single (automation,
 * adapter) pair:
 *
 *   1. Resolve active workflow_version → IR.
 *   2. Pre-deploy validate (capabilities, connections, credentials).
 *   3. Compile via adapter.compile() → ExecutionPlan.
 *   4. Resolve credentials from vault → adapter.deploy().
 *   5. Persist deployment row, transition state.
 *
 * Pause/resume/destroy delegate to the adapter and update the row.
 *
 * The service NEVER imports a concrete adapter — only the registry
 * gives it one. n8n / Temporal / future adapters are pluggable.
 */

import { getActiveVersion } from "@/lib/workflow-store";
import {
  AutomationNotFoundError,
  VersionNotFoundError,
  WorkflowValidationError,
  isWorkflowError,
} from "@/lib/workflow";
import { getDefaultAdapter, getAdapter, type AdapterName } from "@/lib/adapters";
import { resolveCredentialsForWorkflow } from "@/lib/credentials";
import { createLogger } from "@/lib/logger";
import { preDeployValidate } from "./pre-deploy-validator";
import {
  createDeployment,
  getActiveDeployment,
  getDeploymentById,
  transitionDeploymentState,
} from "./repo";
import type { Deployment } from "./types";
import type { PlanTier } from "@/lib/workflow";

const log = createLogger("execution/deployment/service");

export type DeployInput = {
  automationId: string;
  userId: string;
  plan: PlanTier;
  /** Override default adapter. Defaults to env-selected. */
  adapter?: AdapterName;
};

export type DeployOutcome = {
  deployment: Deployment;
  warnings: Array<{ code: string; message: string }>;
};

/**
 * Deploy the active version of an automation via the configured adapter.
 *
 * Idempotency: if an active deployment already exists for the
 * (automation, adapter) pair, this throws — caller must explicitly
 * call `redeploy()` (Phase 3) to replace.
 */
export async function deployAutomation(input: DeployInput): Promise<DeployOutcome> {
  log.info("Starting deployment.", {
    automationId: input.automationId,
    userId: input.userId,
  });

  const adapter = input.adapter ? getAdapter(input.adapter) : getDefaultAdapter();

  const existing = await getActiveDeployment({
    automationId: input.automationId,
    adapter: adapter.name,
  });
  if (existing) {
    throw new WorkflowValidationError(
      `Automation already has an active "${adapter.name}" deployment. Pause or destroy it first.`,
      { automationId: input.automationId, deploymentId: existing.id },
    );
  }

  // Resolve active IR version.
  const version = await getActiveVersion(input.automationId);
  if (!version) {
    throw new AutomationNotFoundError(
      `No active workflow version found for automation ${input.automationId}.`,
      { automationId: input.automationId },
    );
  }

  // Create the deployment row in "draft" up front so callers can poll progress.
  const deployment = await createDeployment({
    automationId: input.automationId,
    userId: input.userId,
    versionId: version.id,
    adapter: adapter.name,
    state: "draft",
  });

  try {
    // 1. Pre-deploy validation.
    const validation = await preDeployValidate({
      workflow: version.workflow,
      userId: input.userId,
      plan: input.plan,
      adapter,
    });

    if (!validation.ok) {
      const summary = validation.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join(" ");
      await transitionDeploymentState({
        deploymentId: deployment.id,
        fromStates: ["draft"],
        toState: "failed",
        lastError: summary,
      });
      throw new WorkflowValidationError(
        `Pre-deploy validation failed: ${summary}`,
        { issues: validation.issues },
      );
    }

    await transitionDeploymentState({
      deploymentId: deployment.id,
      fromStates: ["draft"],
      toState: "validated",
    });

    // 2. Compile.
    const plan = adapter.compile(version.workflow);

    // 3. Resolve credentials.
    const credentials = await resolveCredentialsForWorkflow({
      userId: input.userId,
      workflow: version.workflow,
    });

    await transitionDeploymentState({
      deploymentId: deployment.id,
      fromStates: ["validated"],
      toState: "deployable",
    });

    // 4. Deploy via adapter.
    const externalRef = await adapter.deploy(plan, credentials);

    await transitionDeploymentState({
      deploymentId: deployment.id,
      fromStates: ["deployable"],
      toState: "deployed",
      externalRef: { ...externalRef },
    });
    await transitionDeploymentState({
      deploymentId: deployment.id,
      fromStates: ["deployed"],
      toState: "active",
    });

    const finalRow = await getDeploymentById(deployment.id);
    log.info("Deployment succeeded.", { deploymentId: deployment.id });

    return {
      deployment: finalRow ?? deployment,
      warnings: validation.issues
        .filter((i) => i.severity === "warning")
        .map((i) => ({ code: i.code, message: i.message })),
    };
  } catch (error) {
    log.error("Deployment failed.", error);
    const message = error instanceof Error ? error.message : "Unknown deploy error.";
    await transitionDeploymentState({
      deploymentId: deployment.id,
      fromStates: ["draft", "validated", "deployable", "deployed"],
      toState: "failed",
      lastError: message,
    }).catch(() => undefined);
    if (isWorkflowError(error)) throw error;
    throw error instanceof Error ? error : new Error(message);
  }
}

/* ─── Pause / resume / destroy ───────────────────────────────────── */

export async function pauseDeployment(deploymentId: string): Promise<void> {
  const dep = await getDeploymentById(deploymentId);
  if (!dep) throw new VersionNotFoundError("Deployment not found.", { deploymentId });

  const adapter = getAdapter(dep.adapter as AdapterName);
  if (dep.externalRef) {
    await adapter.pause({
      adapter: dep.adapter,
      externalId: String(dep.externalRef.externalId ?? dep.id),
      metadata: dep.externalRef,
    });
  }

  await transitionDeploymentState({
    deploymentId,
    fromStates: ["active"],
    toState: "paused",
  });
}

export async function resumeDeployment(deploymentId: string): Promise<void> {
  const dep = await getDeploymentById(deploymentId);
  if (!dep) throw new VersionNotFoundError("Deployment not found.", { deploymentId });

  const adapter = getAdapter(dep.adapter as AdapterName);
  if (dep.externalRef) {
    await adapter.resume({
      adapter: dep.adapter,
      externalId: String(dep.externalRef.externalId ?? dep.id),
      metadata: dep.externalRef,
    });
  }

  await transitionDeploymentState({
    deploymentId,
    fromStates: ["paused"],
    toState: "active",
  });
}

export async function destroyDeployment(deploymentId: string): Promise<void> {
  const dep = await getDeploymentById(deploymentId);
  if (!dep) return;

  const adapter = getAdapter(dep.adapter as AdapterName);
  if (dep.externalRef) {
    await adapter
      .destroy({
        adapter: dep.adapter,
        externalId: String(dep.externalRef.externalId ?? dep.id),
        metadata: dep.externalRef,
      })
      .catch((error) => {
        log.warn("Adapter destroy failed; marking row failed.", error);
      });
  }

  await transitionDeploymentState({
    deploymentId,
    fromStates: ["active", "paused", "deployed", "failed"],
    toState: "failed",
    lastError: "Destroyed by user.",
  });
}
