/**
 * Project legacy AutomationWorkflow → IR.
 *
 * Used when reading historical rows out of `automations.workflow`
 * (which still stores legacy shape until full migration in Phase 2).
 *
 * The mapping is best-effort:
 *   - Trigger string is heuristically parsed into a Trigger.
 *   - Steps without param info get empty `params` (legacy didn't have refs).
 *   - Step IDs are auto-assigned (`step_1`, `step_2`, ...).
 *   - Edges are linear (`step_1 → step_2 → ...`).
 *
 * Workflows authored before IR existed remain readable forever.
 */

import type { AutomationWorkflow } from "@/lib/automation";
import {
  WORKFLOW_SCHEMA_VERSION,
  type Step,
  type StepKind,
  type SupportedIntegration,
  type Trigger,
  type WorkflowIR,
} from "../schema";

const LEGACY_KIND_TO_IR_KIND: Record<string, StepKind> = {
  action: "action",
  transform: "transform",
  notification: "notification",
  condition: "condition",
  delay: "delay",
  save: "save",
};

function detectTriggerKind(trigger: string): Trigger {
  const lower = trigger.toLowerCase();
  if (lower.includes("webhook")) {
    return { kind: "webhook", config: {} };
  }
  if (lower.includes("form")) {
    return { kind: "form", config: { formIdField: "formId" } };
  }
  if (lower.includes("schedule") || lower.includes("cron")) {
    return {
      kind: "schedule",
      config: { cron: "0 9 * * *", timezone: "UTC" },
    };
  }
  if (lower.includes("event")) {
    // Without an integration we can't safely build an event trigger; fall back to manual.
    return { kind: "manual", config: {} };
  }
  return { kind: "manual", config: {} };
}

function projectLegacyStep(
  legacyStep: AutomationWorkflow["steps"][number],
  index: number,
  totalSteps: number,
): Step {
  const id = `step_${index + 1}`;
  const next: string[] = index < totalSteps - 1 ? [`step_${index + 2}`] : [];
  const kind = LEGACY_KIND_TO_IR_KIND[legacyStep.type] ?? "action";

  // Pull integration + operation from legacy details if previously serialized.
  const integration = legacyStep.details.integration as
    | SupportedIntegration
    | undefined;
  const operation = legacyStep.details.operation || inferOperationByKind(kind);

  // Strip recognized meta keys before turning the rest into literal params.
  const META_KEYS = new Set(["description", "integration", "operation"]);
  const params: Step["params"] = {};
  for (const [key, value] of Object.entries(legacyStep.details)) {
    if (META_KEYS.has(key)) continue;
    params[key] = { source: "literal", value: String(value) };
  }

  const out: Step = {
    id,
    name: legacyStep.name,
    kind,
    operation,
    params,
    next,
    onError: "fail",
  };

  if (integration) out.integration = integration;
  if (legacyStep.details.description) {
    out.description = legacyStep.details.description;
  }

  return out;
}

function inferOperationByKind(kind: StepKind): string {
  switch (kind) {
    case "transform":
      return "extract_fields";
    case "condition":
      return "branch_on_value";
    case "delay":
      return "wait_seconds";
    case "save":
      return "log_event";
    case "notification":
      return "send_message";
    case "action":
    default:
      return "noop";
  }
}

/**
 * Convert a legacy AutomationWorkflow to an IR. Result is structurally
 * valid but may need manual review (heuristic defaults).
 */
export function projectLegacyToIR(legacy: AutomationWorkflow): WorkflowIR {
  return {
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    name: legacy.name,
    description: legacy.description,
    trigger: detectTriggerKind(legacy.trigger),
    steps: legacy.steps.map((step, index) =>
      projectLegacyStep(step, index, legacy.steps.length),
    ),
    integrations: [...legacy.integrations] as SupportedIntegration[],
    setupFields: legacy.setupFields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      placeholder: field.placeholder,
      helpText: field.helpText,
      required: field.required,
      ...(field.options ? { options: field.options } : {}),
      ...(field.integration ? { integration: field.integration } : {}),
    })),
    status: "draft",
  };
}
