/**
 * IR Step → n8n action node mapper.
 *
 * Lookup table: (integration, operation) → n8n node type + typeVersion.
 *
 * Adding a new operation:
 *   1. Add an entry below.
 *   2. Confirm the n8n node type matches your n8n version.
 *   3. Optionally add a parameter post-processor (rare).
 *
 * The mapping is intentionally minimal in Phase 2 — only the most
 * common ops are wired. Phase 4 expands coverage as integrations land.
 *
 * Built-in operations (transform/condition/delay/save with no
 * integration) map to a small set of n8n core nodes.
 */

import type { Step, StepKind } from "@/lib/workflow";
import { compileParamRefToN8n } from "./param-compiler";
import type { N8nNode, N8nNodeParameters } from "../client/types";

type N8nNodeMapping = {
  type: string;
  typeVersion: number;
  /**
   * Optional shape adjuster. Receives the compiled params bag and
   * returns the n8n parameters object (allows nesting / renaming).
   */
  paramsAdjust?: (params: N8nNodeParameters) => N8nNodeParameters;
};

const STEP_MAPPINGS: Record<string, N8nNodeMapping> = {
  // ─── Built-ins (integration: null) ────────────────────────────────
  "(builtin)::extract_fields": {
    type: "n8n-nodes-base.set",
    typeVersion: 3,
  },
  "(builtin)::normalize_phone": {
    type: "n8n-nodes-base.code",
    typeVersion: 2,
  },
  "(builtin)::normalize_email": {
    type: "n8n-nodes-base.code",
    typeVersion: 2,
  },
  "(builtin)::format_text": {
    type: "n8n-nodes-base.set",
    typeVersion: 3,
  },
  "(builtin)::set_variable": {
    type: "n8n-nodes-base.set",
    typeVersion: 3,
  },
  "(builtin)::parse_json": {
    type: "n8n-nodes-base.code",
    typeVersion: 2,
  },
  "(builtin)::branch_on_value": {
    type: "n8n-nodes-base.if",
    typeVersion: 2,
  },
  "(builtin)::branch_on_pattern": {
    type: "n8n-nodes-base.if",
    typeVersion: 2,
  },
  "(builtin)::branch_on_exists": {
    type: "n8n-nodes-base.if",
    typeVersion: 2,
  },
  "(builtin)::wait_seconds": {
    type: "n8n-nodes-base.wait",
    typeVersion: 1,
    paramsAdjust: (params) => ({
      unit: "seconds",
      amount: params.seconds ?? 5,
    }),
  },
  "(builtin)::wait_until": {
    type: "n8n-nodes-base.wait",
    typeVersion: 1,
    paramsAdjust: (params) => ({
      resume: "specificTime",
      dateTime: params.timestamp ?? "",
    }),
  },
  "(builtin)::log_event": {
    type: "n8n-nodes-base.set",
    typeVersion: 3,
  },

  // ─── slack ──────────────────────────────────────────────────────
  "slack::post_message": {
    type: "n8n-nodes-base.slack",
    typeVersion: 2,
    paramsAdjust: (params) => ({
      resource: "message",
      operation: "post",
      channel: params.channel,
      text: params.text,
    }),
  },
  "slack::post_thread": {
    type: "n8n-nodes-base.slack",
    typeVersion: 2,
    paramsAdjust: (params) => ({
      resource: "message",
      operation: "post",
      channel: params.channel,
      text: params.text,
      otherOptions: { thread_ts: params.thread_ts },
    }),
  },

  // ─── whatsapp ───────────────────────────────────────────────────
  "whatsapp::send_message": {
    type: "n8n-nodes-base.whatsApp",
    typeVersion: 1,
    paramsAdjust: (params) => ({
      operation: "send",
      to: params.to,
      message: params.body,
    }),
  },
  "whatsapp::send_template": {
    type: "n8n-nodes-base.whatsApp",
    typeVersion: 1,
    paramsAdjust: (params) => ({
      operation: "sendTemplate",
      to: params.to,
      templateName: params.template_name,
    }),
  },

  // ─── email ──────────────────────────────────────────────────────
  "email::send_email": {
    type: "n8n-nodes-base.emailSend",
    typeVersion: 2,
    paramsAdjust: (params) => ({
      toEmail: params.to,
      subject: params.subject,
      text: params.body,
    }),
  },
  "email::send_html_email": {
    type: "n8n-nodes-base.emailSend",
    typeVersion: 2,
    paramsAdjust: (params) => ({
      toEmail: params.to,
      subject: params.subject,
      html: params.html,
    }),
  },

  // ─── sheets ─────────────────────────────────────────────────────
  "sheets::append_row": {
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4,
    paramsAdjust: (params) => ({
      operation: "append",
      sheetName: params.sheet,
      values: params.values,
    }),
  },
  "sheets::read_range": {
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4,
    paramsAdjust: (params) => ({
      operation: "read",
      sheetName: params.sheet,
      range: params.range,
    }),
  },
  "sheets::update_row": {
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4,
    paramsAdjust: (params) => ({
      operation: "update",
      sheetName: params.sheet,
      row: params.row,
      values: params.values,
    }),
  },

  // ─── webhook (outbound) ─────────────────────────────────────────
  "webhook::send_request": {
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4,
    paramsAdjust: (params) => ({
      url: params.url,
      method: params.method,
      sendBody: true,
      body: params.body ?? {},
    }),
  },

  // ─── forms ──────────────────────────────────────────────────────
  "forms::capture_submission": {
    type: "n8n-nodes-base.set",
    typeVersion: 3,
  },

  // ─── hubspot ────────────────────────────────────────────────────
  "hubspot::create_contact": {
    type: "n8n-nodes-base.hubspot",
    typeVersion: 2,
    paramsAdjust: (params) => ({
      resource: "contact",
      operation: "create",
      email: params.email,
    }),
  },
  "hubspot::update_contact": {
    type: "n8n-nodes-base.hubspot",
    typeVersion: 2,
    paramsAdjust: (params) => ({
      resource: "contact",
      operation: "update",
      email: params.email,
    }),
  },
  "hubspot::create_deal": {
    type: "n8n-nodes-base.hubspot",
    typeVersion: 2,
    paramsAdjust: (params) => ({
      resource: "deal",
      operation: "create",
      name: params.name,
      amount: params.amount,
    }),
  },

  // ─── salesforce ─────────────────────────────────────────────────
  "salesforce::create_lead": {
    type: "n8n-nodes-base.salesforce",
    typeVersion: 1,
    paramsAdjust: (params) => ({
      resource: "lead",
      operation: "create",
      email: params.email,
      company: params.company,
    }),
  },
  "salesforce::update_lead": {
    type: "n8n-nodes-base.salesforce",
    typeVersion: 1,
    paramsAdjust: (params) => ({
      resource: "lead",
      operation: "update",
      leadId: params.lead_id,
    }),
  },

  // ─── razorpay ───────────────────────────────────────────────────
  "razorpay::create_order": {
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4,
    paramsAdjust: (params) => ({
      url: "https://api.razorpay.com/v1/orders",
      method: "POST",
      sendBody: true,
      body: { amount: params.amount, currency: params.currency },
    }),
  },
  "razorpay::capture_payment": {
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4,
    paramsAdjust: (params) => ({
      url: `=https://api.razorpay.com/v1/payments/${params.payment_id}/capture`,
      method: "POST",
      sendBody: true,
      body: { amount: params.amount },
    }),
  },

  // ─── stripe ─────────────────────────────────────────────────────
  "stripe::create_charge": {
    type: "n8n-nodes-base.stripe",
    typeVersion: 1,
    paramsAdjust: (params) => ({
      resource: "charge",
      operation: "create",
      amount: params.amount,
      currency: params.currency,
      source: params.source,
    }),
  },
  "stripe::create_customer": {
    type: "n8n-nodes-base.stripe",
    typeVersion: 1,
    paramsAdjust: (params) => ({
      resource: "customer",
      operation: "create",
      email: params.email,
    }),
  },

  // ─── google (umbrella) ──────────────────────────────────────────
  "google::drive_upload": {
    type: "n8n-nodes-base.googleDrive",
    typeVersion: 3,
    paramsAdjust: (params) => ({
      operation: "upload",
      folderId: params.folder_id,
      name: params.filename,
      content: params.content,
    }),
  },

  // ─── generic CRM ────────────────────────────────────────────────
  "crm::create_contact": {
    type: "n8n-nodes-base.set",
    typeVersion: 3,
  },
  "crm::update_contact": {
    type: "n8n-nodes-base.set",
    typeVersion: 3,
  },
};

const POSITION_X_START = 480;
const POSITION_Y_DEFAULT = 300;
const POSITION_X_STEP = 220;

export function mapStepToN8nNode(step: Step, index: number): N8nNode {
  const key = `${step.integration ?? "(builtin)"}::${step.operation}`;
  const mapping = STEP_MAPPINGS[key];

  // Compile every ParamRef to its n8n expression form.
  const compiledParams: N8nNodeParameters = {};
  for (const [paramKey, paramRef] of Object.entries(step.params)) {
    compiledParams[paramKey] = compileParamRefToN8n(paramRef);
  }

  if (!mapping) {
    // Unknown op — stub as a Set node with a description marker so it
    // shows up clearly in n8n. Pre-deploy validator should have caught
    // this, but fail-safe rather than crash.
    return {
      name: step.id,
      type: "n8n-nodes-base.set",
      typeVersion: 3,
      position: [POSITION_X_START + index * POSITION_X_STEP, POSITION_Y_DEFAULT],
      parameters: {
        ...compiledParams,
        __unsupported: `${key} (no n8n mapping)`,
      },
    };
  }

  const adjusted = mapping.paramsAdjust
    ? mapping.paramsAdjust(compiledParams)
    : compiledParams;

  return {
    name: step.id,
    type: mapping.type,
    typeVersion: mapping.typeVersion,
    position: [POSITION_X_START + index * POSITION_X_STEP, POSITION_Y_DEFAULT],
    parameters: adjusted,
  };
}

export function isStepKindSupportedByN8n(_kind: StepKind): boolean {
  return true; // All current kinds map to some n8n node.
}
