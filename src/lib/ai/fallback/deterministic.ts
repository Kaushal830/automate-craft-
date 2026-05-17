/**
 * Deterministic fallback workflow builder.
 *
 * Used when no AI provider is configured (no API key in env, or every
 * provider in the chain is unavailable). Produces a structurally valid
 * WorkflowIR using keyword heuristics.
 *
 * This is a stop-gap, not a feature. It exists so the platform never
 * returns a 5xx purely because of a missing API key — instead the user
 * sees a generic-but-valid workflow scaffold they can edit.
 */

import {
  WORKFLOW_SCHEMA_VERSION,
  type SetupField,
  type Step,
  type SupportedIntegration,
  type Trigger,
  type WorkflowIR,
} from "@/lib/workflow";

type Heuristics = {
  hasGoogleForm: boolean;
  hasWhatsApp: boolean;
  hasEmail: boolean;
  hasSheet: boolean;
  hasCrm: boolean;
  hasForm: boolean;
  hasWebhook: boolean;
  hasSchedule: boolean;
  hasSlack: boolean;
};

function analyze(prompt: string): Heuristics {
  const lower = prompt.toLowerCase();
  return {
    hasGoogleForm: /google form/.test(lower),
    hasWhatsApp: /whatsapp/.test(lower),
    hasEmail: /\bemail\b/.test(lower),
    hasSheet: /google sheet|spreadsheet|sheet/.test(lower),
    hasCrm: /\bcrm\b|hubspot|salesforce/.test(lower),
    hasForm: /\bform\b/.test(lower),
    hasWebhook: /webhook/.test(lower),
    hasSchedule: /schedule|cron|every (day|hour|minute|week)/.test(lower),
    hasSlack: /slack/.test(lower),
  };
}

function deriveTrigger(h: Heuristics): Trigger {
  if (h.hasSchedule) {
    return { kind: "schedule", config: { cron: "0 9 * * *", timezone: "UTC" } };
  }
  if (h.hasWebhook) {
    return { kind: "webhook", config: {} };
  }
  if (h.hasGoogleForm || h.hasForm) {
    return {
      kind: "form",
      integration: h.hasGoogleForm ? "google" : "forms",
      config: { formIdField: "formId" },
    };
  }
  return { kind: "manual", config: {} };
}

function deriveIntegrations(h: Heuristics): SupportedIntegration[] {
  const set = new Set<SupportedIntegration>();
  if (h.hasGoogleForm) {
    set.add("google");
    set.add("forms");
  } else if (h.hasForm) set.add("forms");
  if (h.hasWhatsApp) set.add("whatsapp");
  if (h.hasEmail) set.add("email");
  if (h.hasSlack) set.add("slack");
  if (h.hasSheet) {
    set.add("google");
    set.add("sheets");
  }
  if (h.hasCrm) set.add("crm");
  if (h.hasWebhook) set.add("webhook");
  return Array.from(set);
}

function deriveSteps(h: Heuristics): Step[] {
  const steps: Step[] = [];
  let counter = 0;
  const nextId = () => `step_${++counter}`;

  // Always start with normalization
  const transformId = nextId();
  steps.push({
    id: transformId,
    name: "Normalize incoming payload",
    description: "Pluck and clean the trigger fields used by downstream actions.",
    kind: "transform",
    operation: "extract_fields",
    params: {},
    next: [],
    onError: "fail",
  });

  let prevId = transformId;

  if (h.hasCrm) {
    const id = nextId();
    steps.push({
      id,
      name: "Create or update CRM contact",
      description: "Sync the lead details into the connected CRM.",
      kind: "save",
      integration: "crm",
      operation: "create_contact",
      params: {
        name: { source: "trigger", ref: "payload.name" },
      },
      next: [],
      onError: "continue",
    });
    steps[steps.findIndex((s) => s.id === prevId)].next = [id];
    prevId = id;
  }

  if (h.hasWhatsApp) {
    const id = nextId();
    steps.push({
      id,
      name: "Send WhatsApp notification",
      description: "Send a WhatsApp message to the configured number.",
      kind: "notification",
      integration: "whatsapp",
      operation: "send_message",
      params: {
        to: { source: "literal", value: "+0000000000" },
        body: { source: "literal", value: "Workflow notification" },
      },
      next: [],
      onError: "continue",
    });
    steps[steps.findIndex((s) => s.id === prevId)].next = [id];
    prevId = id;
  }

  if (h.hasEmail) {
    const id = nextId();
    steps.push({
      id,
      name: "Send email follow-up",
      description: "Send the configured email to the captured recipient.",
      kind: "notification",
      integration: "email",
      operation: "send_email",
      params: {
        to: { source: "literal", value: "hello@example.com" },
        subject: { source: "literal", value: "Notification" },
        body: { source: "literal", value: "Workflow notification" },
      },
      next: [],
      onError: "continue",
    });
    steps[steps.findIndex((s) => s.id === prevId)].next = [id];
    prevId = id;
  }

  if (h.hasSlack) {
    const id = nextId();
    steps.push({
      id,
      name: "Post Slack notification",
      description: "Post a message to the configured Slack channel.",
      kind: "notification",
      integration: "slack",
      operation: "post_message",
      params: {
        channel: { source: "literal", value: "#general" },
        text: { source: "literal", value: "Workflow notification" },
      },
      next: [],
      onError: "continue",
    });
    steps[steps.findIndex((s) => s.id === prevId)].next = [id];
    prevId = id;
  }

  if (h.hasSheet) {
    const id = nextId();
    steps.push({
      id,
      name: "Append row to Google Sheet",
      description: "Write the normalized record to the destination sheet.",
      kind: "save",
      integration: "sheets",
      operation: "append_row",
      params: {
        sheet: { source: "literal", value: "Leads Tracker" },
        values: { source: "literal", value: "{}" },
      },
      next: [],
      onError: "fail",
    });
    steps[steps.findIndex((s) => s.id === prevId)].next = [id];
    prevId = id;
  }

  // Always end with an audit log
  const logId = nextId();
  steps.push({
    id: logId,
    name: "Log workflow completion",
    description: "Persist an audit log entry on AutomateCraft.",
    kind: "save",
    operation: "log_event",
    params: {
      message: { source: "literal", value: "Workflow completed" },
    },
    next: [],
    onError: "continue",
  });
  steps[steps.findIndex((s) => s.id === prevId)].next = [logId];

  return steps;
}

function deriveSetupFields(h: Heuristics): SetupField[] {
  const fields: SetupField[] = [];
  if (h.hasWhatsApp) {
    fields.push({
      key: "whatsapp_number",
      label: "WhatsApp number",
      type: "phone",
      placeholder: "+91 98765 43210",
      helpText: "The destination phone number for outbound WhatsApp messages.",
      required: true,
      integration: "whatsapp",
    });
  }
  if (h.hasEmail) {
    fields.push({
      key: "recipient_email",
      label: "Recipient email",
      type: "email",
      placeholder: "hello@company.com",
      helpText: "The email address to notify.",
      required: true,
      integration: "email",
    });
  }
  if (h.hasSlack) {
    fields.push({
      key: "slack_channel",
      label: "Slack channel",
      type: "text",
      placeholder: "#general",
      helpText: "Slack channel where notifications are posted.",
      required: true,
      integration: "slack",
    });
  }
  if (h.hasSheet) {
    fields.push({
      key: "sheet_id",
      label: "Google Sheet",
      type: "select",
      placeholder: "Choose a sheet",
      helpText: "Select the destination spreadsheet for this workflow.",
      required: true,
      integration: "sheets",
      options: ["Leads Tracker", "Support Queue", "Operations Board"],
    });
  }
  return fields;
}

/**
 * Build a deterministic IR workflow from a free-text prompt.
 */
export function buildDeterministicIR(prompt: string): WorkflowIR {
  const heuristics = analyze(prompt);
  return {
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    name: prompt.length > 72 ? `${prompt.slice(0, 69)}...` : prompt || "New workflow",
    description: "Auto-generated by the deterministic fallback builder.",
    trigger: deriveTrigger(heuristics),
    steps: deriveSteps(heuristics),
    integrations: deriveIntegrations(heuristics),
    setupFields: deriveSetupFields(heuristics),
    status: "draft",
  };
}
