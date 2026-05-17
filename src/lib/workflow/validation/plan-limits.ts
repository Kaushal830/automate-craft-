/**
 * Plan-tier limit validator.
 *
 * Enforces per-plan caps on workflow complexity. The schema's max-steps
 * cap is a hard ceiling; this layer applies the soft, business-driven
 * cap that matches the user's plan.
 *
 * Plan tiers:
 *   starter  — up to 6 steps, up to 3 integrations
 *   plus     — up to 8 steps, up to 6 integrations
 *   pro      — up to 16 steps, up to 10 integrations
 *
 * The orchestrator passes the user's plan tier in. If absent, defaults
 * to starter (most restrictive — fail-safe).
 */

import { WorkflowPlanLimitError } from "../errors";
import type { WorkflowIR } from "../schema";

export type PlanTier = "starter" | "plus" | "pro";

export type PlanLimits = {
  maxSteps: number;
  maxIntegrations: number;
  maxSetupFields: number;
};

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  starter: { maxSteps: 6, maxIntegrations: 3, maxSetupFields: 12 },
  plus: { maxSteps: 8, maxIntegrations: 6, maxSetupFields: 16 },
  pro: { maxSteps: 16, maxIntegrations: 10, maxSetupFields: 20 },
};

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function validatePlanLimits(workflow: WorkflowIR, plan: PlanTier): void {
  const limits = PLAN_LIMITS[plan];

  if (workflow.steps.length > limits.maxSteps) {
    throw new WorkflowPlanLimitError(
      `Workflow has ${workflow.steps.length} steps, but the "${plan}" plan allows up to ${limits.maxSteps}.`,
      {
        plan,
        actual: workflow.steps.length,
        limit: limits.maxSteps,
        constraint: "maxSteps",
      },
    );
  }

  if (workflow.integrations.length > limits.maxIntegrations) {
    throw new WorkflowPlanLimitError(
      `Workflow uses ${workflow.integrations.length} integrations, but the "${plan}" plan allows up to ${limits.maxIntegrations}.`,
      {
        plan,
        actual: workflow.integrations.length,
        limit: limits.maxIntegrations,
        constraint: "maxIntegrations",
      },
    );
  }

  if (workflow.setupFields.length > limits.maxSetupFields) {
    throw new WorkflowPlanLimitError(
      `Workflow has ${workflow.setupFields.length} setup fields, but the "${plan}" plan allows up to ${limits.maxSetupFields}.`,
      {
        plan,
        actual: workflow.setupFields.length,
        limit: limits.maxSetupFields,
        constraint: "maxSetupFields",
      },
    );
  }
}
