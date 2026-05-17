/**
 * Pre-deployment validator.
 *
 * Runs BEFORE adapter.compile() / adapter.deploy(). Composes the
 * checks that determine whether a workflow is safe to push to an
 * external executor:
 *
 *   1. Adapter capability check (kinds, triggers, branching, max nodes).
 *   2. Connection check (every workflow.integration must have an active connection).
 *   3. Credential check (every secret param ref must resolve in vault).
 *   4. Plan limit re-check (defense in depth — Phase 1 already enforces).
 *
 * Returns a structured result. The deployment service interprets it:
 *   - all OK → proceed to compile + deploy
 *   - critical issues → throw typed error → state := "failed"
 */

import {
  WorkflowValidationError,
  validatePlanLimits,
  type PlanTier,
  type SupportedIntegration,
  type WorkflowIR,
} from "@/lib/workflow";
import {
  checkAdapterCompatibility,
  type ExecutionAdapter,
} from "@/lib/adapters";
import {
  isActive as isConnectionActive,
  requiresCredential,
} from "@/lib/connections";
import { getCredential } from "@/lib/credentials";
import { createLogger } from "@/lib/logger";

const log = createLogger("execution/pre-deploy-validator");

export type PreDeployIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type PreDeployResult = {
  ok: boolean;
  issues: PreDeployIssue[];
};

export type PreDeployInput = {
  workflow: WorkflowIR;
  userId: string;
  plan: PlanTier;
  adapter: ExecutionAdapter;
};

export async function preDeployValidate(
  input: PreDeployInput,
): Promise<PreDeployResult> {
  const issues: PreDeployIssue[] = [];

  log.info("Pre-deploy validation started.", {
    userId: input.userId,
    adapter: input.adapter.name,
    stepCount: input.workflow.steps.length,
  });

  // 1. Plan limits (cheap, fail fast).
  try {
    validatePlanLimits(input.workflow, input.plan);
  } catch (error) {
    if (error instanceof WorkflowValidationError) {
      issues.push({
        severity: "error",
        code: error.code,
        message: error.message,
        details: error.details,
      });
    } else {
      throw error;
    }
  }

  // 2. Adapter capability.
  const compat = checkAdapterCompatibility(input.workflow, input.adapter.capabilities);
  if (!compat.compatible) {
    for (const reason of compat.reasons) {
      issues.push({
        severity: "error",
        code: "ADAPTER_INCOMPATIBLE",
        message: reason,
        details: { adapter: input.adapter.name },
      });
    }
  }

  // 3. Adapter readiness — env vars present?
  if (!input.adapter.isReady()) {
    issues.push({
      severity: "error",
      code: "ADAPTER_NOT_READY",
      message: `Adapter "${input.adapter.name}" is not configured. Missing env vars.`,
      details: { adapter: input.adapter.name },
    });
  }

  // 4. Connection availability — every integration referenced must be active.
  const integrations = collectIntegrations(input.workflow);
  for (const integration of integrations) {
    const status = await isConnectionActive(input.userId, integration);
    if (!status.active) {
      issues.push({
        severity: "error",
        code: "CONNECTION_INACTIVE",
        message: status.reason ?? `Connection inactive for "${integration}".`,
        details: { integration },
      });
    }
  }

  // 5. Explicit secret refs — vault entries must exist.
  const missingSecrets = await findMissingSecrets(input);
  for (const miss of missingSecrets) {
    issues.push({
      severity: "error",
      code: "CREDENTIAL_MISSING",
      message: `Step "${miss.stepId}" requires credential "${miss.name}" for "${miss.integration}" but none is stored.`,
      details: miss,
    });
  }

  // 6. Default credentials for integrations that require them — warning only.
  for (const integration of integrations) {
    if (!requiresCredential(integration)) continue;
    const credential = await getCredential({
      userId: input.userId,
      integration,
      name: "default",
    });
    if (!credential) {
      issues.push({
        severity: "warning",
        code: "DEFAULT_CREDENTIAL_MISSING",
        message: `No default credential stored for "${integration}". Adapter may fail at runtime.`,
        details: { integration },
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;

  log.info("Pre-deploy validation completed.", {
    ok: errorCount === 0,
    errorCount,
    warningCount: issues.length - errorCount,
  });

  return { ok: errorCount === 0, issues };
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function collectIntegrations(workflow: WorkflowIR): SupportedIntegration[] {
  const set = new Set<SupportedIntegration>(workflow.integrations);
  if (
    workflow.trigger.kind !== "manual" &&
    workflow.trigger.kind !== "schedule" &&
    "integration" in workflow.trigger &&
    workflow.trigger.integration
  ) {
    set.add(workflow.trigger.integration);
  }
  for (const step of workflow.steps) {
    if (step.integration) set.add(step.integration);
  }
  return Array.from(set);
}

async function findMissingSecrets(input: PreDeployInput): Promise<
  Array<{ stepId: string; integration: string; name: string }>
> {
  const missing: Array<{ stepId: string; integration: string; name: string }> = [];
  const seen = new Set<string>();

  for (const step of input.workflow.steps) {
    if (!step.integration) continue;
    for (const paramRef of Object.values(step.params)) {
      if (paramRef.source !== "secret") continue;
      const key = `${step.integration}::${paramRef.ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const found = await getCredential({
        userId: input.userId,
        integration: step.integration,
        name: paramRef.ref,
      });
      if (!found) {
        missing.push({
          stepId: step.id,
          integration: step.integration,
          name: paramRef.ref,
        });
      }
    }
  }
  return missing;
}
