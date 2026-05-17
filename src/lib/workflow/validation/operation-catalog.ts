/**
 * Operation catalog — closed list of valid (integration, operation, kind)
 * combinations supported by the platform.
 *
 * Why a catalog and not free-text?
 *   - Adapters need a stable lookup table to map IR operations to
 *     engine-specific node types.
 *   - Validation can reject AI hallucinations like
 *     `(slack, send_invoice)` early.
 *   - Prompt builder uses this catalog to teach the AI what's valid.
 *
 * Adding a new operation:
 *   1. Add an entry below.
 *   2. Implement adapter mapping (Phase 2).
 *   3. Implement connector logic (Phase 4).
 */

import type { StepKind, SupportedIntegration } from "../schema";

export type OperationDefinition = {
  /** Logical operation verb (matches `step.operation` regex). */
  operation: string;
  /** Owning integration, or null for built-in (transform/condition/delay). */
  integration: SupportedIntegration | null;
  /** Allowed step kinds for this operation. */
  kinds: readonly StepKind[];
  /** Required parameter keys (validation enforces presence). */
  requiredParams: readonly string[];
  /** Human description for prompt builder. */
  description: string;
};

/**
 * Built-in operations — no integration binding. Available to every plan.
 */
const BUILTIN_OPERATIONS: readonly OperationDefinition[] = [
  // transform
  {
    operation: "extract_fields",
    integration: null,
    kinds: ["transform"],
    requiredParams: [],
    description: "Pluck a subset of fields from the trigger payload or a step output.",
  },
  {
    operation: "normalize_phone",
    integration: null,
    kinds: ["transform"],
    requiredParams: ["input"],
    description: "Normalize a phone number to E.164 format.",
  },
  {
    operation: "normalize_email",
    integration: null,
    kinds: ["transform"],
    requiredParams: ["input"],
    description: "Lowercase and validate an email address.",
  },
  {
    operation: "format_text",
    integration: null,
    kinds: ["transform"],
    requiredParams: ["template"],
    description: "Render a template string with field interpolation.",
  },
  {
    operation: "set_variable",
    integration: null,
    kinds: ["transform"],
    requiredParams: ["value"],
    description: "Bind a literal or computed value to a named variable.",
  },
  {
    operation: "parse_json",
    integration: null,
    kinds: ["transform"],
    requiredParams: ["input"],
    description: "Parse a JSON string into structured data.",
  },
  // condition
  {
    operation: "branch_on_value",
    integration: null,
    kinds: ["condition"],
    requiredParams: ["input", "expected"],
    description: "Branch based on equality with an expected value.",
  },
  {
    operation: "branch_on_pattern",
    integration: null,
    kinds: ["condition"],
    requiredParams: ["input", "pattern"],
    description: "Branch based on regex match against an input string.",
  },
  {
    operation: "branch_on_exists",
    integration: null,
    kinds: ["condition"],
    requiredParams: ["input"],
    description: "Branch on whether a field is present and non-empty.",
  },
  // delay
  {
    operation: "wait_seconds",
    integration: null,
    kinds: ["delay"],
    requiredParams: ["seconds"],
    description: "Pause the workflow for a fixed number of seconds.",
  },
  {
    operation: "wait_until",
    integration: null,
    kinds: ["delay"],
    requiredParams: ["timestamp"],
    description: "Pause until a specific ISO timestamp.",
  },
  // save
  {
    operation: "log_event",
    integration: null,
    kinds: ["save"],
    requiredParams: ["message"],
    description: "Persist an audit log entry on AutomateCraft.",
  },
];

/**
 * Integration-bound operations.
 *
 * Adding entries here is the ONLY way to introduce new (integration,
 * operation) pairs. Schema validation will reject anything not in this
 * catalog.
 */
const INTEGRATION_OPERATIONS: readonly OperationDefinition[] = [
  // slack
  {
    operation: "post_message",
    integration: "slack",
    kinds: ["notification", "action"],
    requiredParams: ["channel", "text"],
    description: "Post a message to a Slack channel.",
  },
  {
    operation: "post_thread",
    integration: "slack",
    kinds: ["notification"],
    requiredParams: ["channel", "thread_ts", "text"],
    description: "Reply in a Slack thread.",
  },
  // whatsapp
  {
    operation: "send_message",
    integration: "whatsapp",
    kinds: ["notification", "action"],
    requiredParams: ["to", "body"],
    description: "Send a WhatsApp text message.",
  },
  {
    operation: "send_template",
    integration: "whatsapp",
    kinds: ["notification"],
    requiredParams: ["to", "template_name"],
    description: "Send a WhatsApp template message.",
  },
  // email
  {
    operation: "send_email",
    integration: "email",
    kinds: ["notification", "action"],
    requiredParams: ["to", "subject", "body"],
    description: "Send a plain-text email.",
  },
  {
    operation: "send_html_email",
    integration: "email",
    kinds: ["notification"],
    requiredParams: ["to", "subject", "html"],
    description: "Send an HTML email.",
  },
  // sheets
  {
    operation: "append_row",
    integration: "sheets",
    kinds: ["save", "action"],
    requiredParams: ["sheet", "values"],
    description: "Append a row to a Google Sheet.",
  },
  {
    operation: "read_range",
    integration: "sheets",
    kinds: ["action"],
    requiredParams: ["sheet", "range"],
    description: "Read a range of cells from a Google Sheet.",
  },
  {
    operation: "update_row",
    integration: "sheets",
    kinds: ["action"],
    requiredParams: ["sheet", "row", "values"],
    description: "Update a specific row in a Google Sheet.",
  },
  // forms
  {
    operation: "capture_submission",
    integration: "forms",
    kinds: ["action"],
    requiredParams: [],
    description: "Capture and normalize an inbound form submission.",
  },
  // webhook
  {
    operation: "send_request",
    integration: "webhook",
    kinds: ["action", "notification"],
    requiredParams: ["url", "method"],
    description: "Send an outbound HTTP request.",
  },
  // hubspot
  {
    operation: "create_contact",
    integration: "hubspot",
    kinds: ["save", "action"],
    requiredParams: ["email"],
    description: "Create a HubSpot contact.",
  },
  {
    operation: "update_contact",
    integration: "hubspot",
    kinds: ["save", "action"],
    requiredParams: ["email"],
    description: "Update a HubSpot contact by email.",
  },
  {
    operation: "create_deal",
    integration: "hubspot",
    kinds: ["save", "action"],
    requiredParams: ["name", "amount"],
    description: "Create a HubSpot deal.",
  },
  // salesforce
  {
    operation: "create_lead",
    integration: "salesforce",
    kinds: ["save", "action"],
    requiredParams: ["email", "company"],
    description: "Create a Salesforce lead.",
  },
  {
    operation: "update_lead",
    integration: "salesforce",
    kinds: ["save", "action"],
    requiredParams: ["lead_id"],
    description: "Update a Salesforce lead.",
  },
  // razorpay
  {
    operation: "create_order",
    integration: "razorpay",
    kinds: ["action"],
    requiredParams: ["amount", "currency"],
    description: "Create a Razorpay order.",
  },
  {
    operation: "capture_payment",
    integration: "razorpay",
    kinds: ["action"],
    requiredParams: ["payment_id", "amount"],
    description: "Capture a Razorpay payment.",
  },
  // stripe
  {
    operation: "create_charge",
    integration: "stripe",
    kinds: ["action"],
    requiredParams: ["amount", "currency", "source"],
    description: "Create a Stripe charge.",
  },
  {
    operation: "create_customer",
    integration: "stripe",
    kinds: ["save", "action"],
    requiredParams: ["email"],
    description: "Create a Stripe customer.",
  },
  // generic crm (legacy, no specific provider)
  {
    operation: "create_contact",
    integration: "crm",
    kinds: ["save", "action"],
    requiredParams: ["name"],
    description: "Create a contact in the connected CRM.",
  },
  {
    operation: "update_contact",
    integration: "crm",
    kinds: ["save", "action"],
    requiredParams: ["id"],
    description: "Update a contact in the connected CRM.",
  },
  // google (umbrella for Drive-level ops)
  {
    operation: "drive_upload",
    integration: "google",
    kinds: ["save", "action"],
    requiredParams: ["folder_id", "filename", "content"],
    description: "Upload a file to a Google Drive folder.",
  },
];

const ALL_OPERATIONS: readonly OperationDefinition[] = [
  ...BUILTIN_OPERATIONS,
  ...INTEGRATION_OPERATIONS,
];

/**
 * Lookup a single operation definition. Returns null if not found.
 */
export function lookupOperation(
  integration: SupportedIntegration | null | undefined,
  operation: string,
): OperationDefinition | null {
  const integrationKey = integration ?? null;
  const match = ALL_OPERATIONS.find(
    (entry) => entry.integration === integrationKey && entry.operation === operation,
  );
  return match ?? null;
}

/**
 * All operations available for a given integration (or null for built-ins).
 */
export function operationsForIntegration(
  integration: SupportedIntegration | null,
): OperationDefinition[] {
  return ALL_OPERATIONS.filter((entry) => entry.integration === integration);
}

/** All operation definitions (for prompt builder). */
export function allOperations(): readonly OperationDefinition[] {
  return ALL_OPERATIONS;
}
