/**
 * Workflow sanitizer — orchestrates text + structure sanitization
 * across the full IR shape.
 *
 * Input:  raw `unknown` (typically OpenAI structured-output JSON).
 * Output: sanitized `unknown`, ready to feed into `workflowIRSchema.parse()`.
 *
 * Sanitization is defensive — it tries to coerce broken input into
 * something parseable rather than throwing. The Zod parser is the
 * authoritative gate; sanitization just removes obvious garbage so
 * Zod's error messages are about real semantic issues, not noise.
 */

import { WORKFLOW_SCHEMA_VERSION } from "../schema";
import {
  sanitizeDisplayText,
  sanitizeIdentifier,
  sanitizeTemplate,
} from "./text";
import {
  asArray,
  asObject,
  isPlainObject,
  safeDeepClone,
} from "./structure";

const TEXT_LIMITS = {
  workflowName: 120,
  workflowDescription: 480,
  stepName: 120,
  stepDescription: 480,
  fieldLabel: 80,
  fieldPlaceholder: 160,
  fieldHelpText: 280,
  fieldOption: 120,
  literalValue: 4000,
  templateValue: 4000,
  refPath: 240,
  prompt: 2000,
} as const;

const ID_LIMITS = {
  stepId: 60,
  fieldKey: 80,
  operation: 80,
  paramKey: 80,
} as const;

/* ─── Param ref sanitizer ────────────────────────────────────────── */

function sanitizeParamRef(raw: unknown): Record<string, unknown> | null {
  if (!isPlainObject(raw)) return null;
  const source = typeof raw.source === "string" ? raw.source : "";

  switch (source) {
    case "literal":
      return {
        source: "literal",
        value: sanitizeDisplayText(raw.value, TEXT_LIMITS.literalValue),
      };
    case "trigger":
      return {
        source: "trigger",
        ref: sanitizeIdentifierRef(raw.ref),
      };
    case "step":
      return {
        source: "step",
        ref: sanitizeIdentifierRef(raw.ref),
      };
    case "template":
      return {
        source: "template",
        value: sanitizeTemplate(raw.value, TEXT_LIMITS.templateValue),
      };
    case "secret":
      return {
        source: "secret",
        ref: sanitizeIdentifierRef(raw.ref),
      };
    default:
      return null;
  }
}

/** Sanitize a dotted-path ref string (e.g. "payload.user.email"). */
function sanitizeIdentifierRef(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  // Allow letters, digits, dot, underscore, brackets and digits inside brackets.
  const cleaned = raw.replace(/[^a-zA-Z0-9_.[\]]/g, "").slice(0, TEXT_LIMITS.refPath);
  return cleaned;
}

function sanitizeParams(raw: unknown): Record<string, unknown> {
  if (!isPlainObject(raw)) return {};
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (count++ >= 24) break;
    const cleanKey = sanitizeIdentifier(key, ID_LIMITS.paramKey, "param");
    const cleanRef = sanitizeParamRef(value);
    if (cleanRef) out[cleanKey] = cleanRef;
  }
  return out;
}

/* ─── Trigger sanitizer ──────────────────────────────────────────── */

function sanitizeTrigger(raw: unknown): Record<string, unknown> {
  const obj = asObject(raw);
  const kind = typeof obj.kind === "string" ? obj.kind : "manual";

  // Only allow known kinds. Unknown → manual.
  const allowedKinds = ["manual", "webhook", "form", "schedule", "event"];
  const safeKind = allowedKinds.includes(kind) ? kind : "manual";

  const out: Record<string, unknown> = { kind: safeKind };

  if (typeof obj.integration === "string") {
    out.integration = obj.integration;
  }

  // Pass config through deep clone — Zod will validate per-kind shape.
  out.config = safeDeepClone(obj.config) ?? {};

  return out;
}

/* ─── Step sanitizer ─────────────────────────────────────────────── */

function sanitizeStep(raw: unknown, index: number): Record<string, unknown> {
  const obj = asObject(raw);

  const id = sanitizeIdentifier(obj.id, ID_LIMITS.stepId, `step_${index + 1}`);

  const next = asArray(obj.next)
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => sanitizeIdentifier(entry, ID_LIMITS.stepId, "step"))
    .filter(Boolean)
    .slice(0, 8);

  const out: Record<string, unknown> = {
    id,
    name: sanitizeDisplayText(obj.name, TEXT_LIMITS.stepName),
    kind: typeof obj.kind === "string" ? obj.kind : "action",
    operation: sanitizeIdentifier(obj.operation, ID_LIMITS.operation, "noop"),
    params: sanitizeParams(obj.params),
    next,
    onError: typeof obj.onError === "string" ? obj.onError : "fail",
  };

  if (typeof obj.description === "string") {
    out.description = sanitizeDisplayText(obj.description, TEXT_LIMITS.stepDescription);
  }
  if (typeof obj.integration === "string") {
    out.integration = obj.integration;
  }
  return out;
}

/* ─── Setup field sanitizer ──────────────────────────────────────── */

function sanitizeSetupField(raw: unknown, index: number): Record<string, unknown> {
  const obj = asObject(raw);

  const out: Record<string, unknown> = {
    key: sanitizeIdentifier(obj.key, ID_LIMITS.fieldKey, `field_${index + 1}`),
    label: sanitizeDisplayText(obj.label, TEXT_LIMITS.fieldLabel),
    type: typeof obj.type === "string" ? obj.type : "text",
    placeholder: sanitizeDisplayText(obj.placeholder, TEXT_LIMITS.fieldPlaceholder) || "Enter value",
    helpText: sanitizeDisplayText(obj.helpText, TEXT_LIMITS.fieldHelpText) || "Required for this workflow.",
    required: typeof obj.required === "boolean" ? obj.required : true,
  };

  const options = asArray(obj.options);
  if (options.length > 0) {
    out.options = options
      .map((opt) => sanitizeDisplayText(opt, TEXT_LIMITS.fieldOption))
      .filter(Boolean)
      .slice(0, 20);
  }

  if (typeof obj.integration === "string") {
    out.integration = obj.integration;
  }

  return out;
}

/* ─── Top-level workflow sanitizer ───────────────────────────────── */

/**
 * Sanitize raw AI output into a Zod-parseable shape.
 *
 * Always succeeds (returns SOME object). The Zod schema decides
 * whether the sanitized result is acceptable — invalid sanitized
 * output throws WorkflowSchemaError downstream.
 */
export function sanitizeWorkflowIR(raw: unknown): Record<string, unknown> {
  const obj = asObject(safeDeepClone(raw));

  const stepsRaw = asArray(obj.steps);
  const steps = stepsRaw.map((step, index) => sanitizeStep(step, index));

  const setupFieldsRaw = asArray(obj.setupFields);
  const setupFields = setupFieldsRaw.map((field, index) =>
    sanitizeSetupField(field, index),
  );

  const integrations = asArray(obj.integrations)
    .filter((entry): entry is string => typeof entry === "string")
    .slice(0, 10);

  return {
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    name: sanitizeDisplayText(obj.name, TEXT_LIMITS.workflowName),
    description: sanitizeDisplayText(obj.description, TEXT_LIMITS.workflowDescription),
    trigger: sanitizeTrigger(obj.trigger),
    steps,
    integrations,
    setupFields,
    status: typeof obj.status === "string" ? obj.status : "draft",
  };
}
