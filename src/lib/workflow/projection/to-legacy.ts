/**
 * Project IR → legacy AutomationWorkflow.
 *
 * The legacy schema (`src/lib/automation.ts`) is what the existing
 * frontend reads. We keep it stable while building the IR. Every
 * generation flow returns `{ workflow: legacy, ir: WorkflowIR }` so
 * the frontend keeps working.
 *
 * Mapping rules:
 *   trigger.kind/integration/config  → trigger string ("New form submission")
 *   step (typed)                     → legacy step (kind + name + details record)
 *   ParamRef params                  → flattened "details" string map
 *   setupFields                      → preserved with same keys
 *   integrations                     → preserved
 *
 * The mapping is intentionally lossy on the way out (legacy can't
 * express graph edges or typed params). The IR remains the canonical
 * record.
 */

import type {
  AutomationSetupField,
  AutomationWorkflow,
  RequiredFieldKey,
  SupportedIntegration as LegacySupportedIntegration,
} from "@/lib/automation";
import type { ParamRef, Step, Trigger, WorkflowIR } from "../schema";

const LEGACY_REQUIRED_FIELDS: readonly RequiredFieldKey[] = [
  "phoneNumber",
  "message",
  "formId",
  "emailAddress",
  "subject",
  "sheetId",
  "webhookUrl",
  "leadSource",
  "customerName",
  "companyName",
];

const LEGACY_INTEGRATIONS: readonly LegacySupportedIntegration[] = [
  "google",
  "whatsapp",
  "email",
  "slack",
  "hubspot",
  "salesforce",
  "razorpay",
  "webhook",
  "forms",
  "sheets",
  "crm",
];

const LEGACY_FIELD_TYPES = [
  "text",
  "textarea",
  "select",
  "phone",
  "email",
] as const;

/**
 * Compose a human-readable trigger summary string from a structured
 * Trigger. This is intentionally generic — adapter-specific phrasing
 * is not the projection layer's concern.
 */
export function projectTriggerToLegacy(trigger: Trigger): string {
  switch (trigger.kind) {
    case "manual":
      return "Manual run";
    case "webhook": {
      const event = trigger.config.event ? ` (${trigger.config.event})` : "";
      const integration = trigger.integration ? ` from ${trigger.integration}` : "";
      return `Incoming webhook${integration}${event}`;
    }
    case "form": {
      const integration = trigger.integration ? ` (${trigger.integration})` : "";
      return `New form submission${integration}`;
    }
    case "schedule": {
      const cron = trigger.config.cron;
      return `Scheduled (${cron} ${trigger.config.timezone})`;
    }
    case "event":
      return `${trigger.integration} event: ${trigger.config.eventName}`;
    default: {
      const exhaustive: never = trigger;
      void exhaustive;
      return "Incoming event";
    }
  }
}

function paramRefToLegacyString(ref: ParamRef): string {
  switch (ref.source) {
    case "literal":
      return ref.value;
    case "trigger":
      return `{{trigger.${ref.ref}}}`;
    case "step":
      return `{{${ref.ref}}}`;
    case "template":
      return ref.value;
    case "secret":
      return `{{secret.${ref.ref}}}`;
    default: {
      const exhaustive: never = ref;
      void exhaustive;
      return "";
    }
  }
}

function projectStepToLegacy(step: Step): AutomationWorkflow["steps"][number] {
  const details: Record<string, string> = {};
  if (step.description) {
    details.description = step.description;
  }
  details.operation = step.operation;
  if (step.integration) {
    details.integration = step.integration;
  }
  for (const [key, ref] of Object.entries(step.params)) {
    details[key] = paramRefToLegacyString(ref);
  }
  return {
    type: step.kind,
    name: step.name,
    details,
  };
}

function isLegacyIntegration(value: string): value is LegacySupportedIntegration {
  return (LEGACY_INTEGRATIONS as readonly string[]).includes(value);
}

function isLegacyFieldType(value: string): value is (typeof LEGACY_FIELD_TYPES)[number] {
  return (LEGACY_FIELD_TYPES as readonly string[]).includes(value);
}

function projectSetupFieldToLegacy(
  field: WorkflowIR["setupFields"][number],
): AutomationSetupField {
  const out: AutomationSetupField = {
    key: field.key,
    label: field.label,
    type: isLegacyFieldType(field.type) ? field.type : "text",
    placeholder: field.placeholder,
    helpText: field.helpText,
    required: field.required,
  };
  if (field.options && field.options.length > 0) {
    out.options = field.options;
  }
  if (field.integration && isLegacyIntegration(field.integration)) {
    out.integration = field.integration;
  }
  return out;
}

function deriveLegacyRequiredFields(
  workflow: WorkflowIR,
): RequiredFieldKey[] {
  const set = new Set<RequiredFieldKey>();
  for (const field of workflow.setupFields) {
    const guess = guessLegacyKey(field.key, field.type);
    if (guess) set.add(guess);
  }
  return Array.from(set);
}

function guessLegacyKey(
  fieldKey: string,
  fieldType: WorkflowIR["setupFields"][number]["type"],
): RequiredFieldKey | null {
  const lower = fieldKey.toLowerCase();
  if (lower.includes("phone") || fieldType === "phone") return "phoneNumber";
  if (lower.includes("message") || lower.includes("greeting")) return "message";
  if (lower.includes("form") && lower.includes("id")) return "formId";
  if (lower.includes("email") || fieldType === "email") return "emailAddress";
  if (lower.includes("subject")) return "subject";
  if (lower.includes("sheet")) return "sheetId";
  if (lower.includes("webhook") && lower.includes("url")) return "webhookUrl";
  if (lower.includes("source")) return "leadSource";
  if (lower.includes("customer") && lower.includes("name")) return "customerName";
  if (lower.includes("company")) return "companyName";
  void LEGACY_REQUIRED_FIELDS; // silence unused warning when none matched
  return null;
}

/**
 * Project an IR workflow into the legacy AutomationWorkflow shape
 * consumed by the existing frontend.
 */
export function projectWorkflowToLegacy(workflow: WorkflowIR): AutomationWorkflow {
  return {
    name: workflow.name,
    description: workflow.description,
    trigger: projectTriggerToLegacy(workflow.trigger),
    steps: workflow.steps.map(projectStepToLegacy),
    integrations: workflow.integrations.filter(isLegacyIntegration),
    requiredFields: deriveLegacyRequiredFields(workflow),
    setupFields: workflow.setupFields.map(projectSetupFieldToLegacy),
  };
}
