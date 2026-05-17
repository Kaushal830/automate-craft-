/**
 * Schema specification for AI prompts.
 *
 * This module produces a human-readable description of the IR shape
 * that we inject into every system prompt. Keeping this in code
 * (instead of the system prompts themselves) means:
 *   - Adding an integration or operation immediately updates the prompt.
 *   - Multiple prompt templates can share one canonical schema spec.
 *   - We can A/B test different spec phrasings independently of
 *     prompt rules.
 */

import {
  SUPPORTED_INTEGRATIONS,
  STEP_KINDS,
  STEP_ERROR_POLICIES,
  TRIGGER_KINDS,
  FIELD_TYPES,
} from "@/lib/workflow";
import { allOperations } from "@/lib/workflow";

export function buildSchemaSpec(): string {
  const operationsSection = buildOperationsSection();

  return `WORKFLOW SCHEMA (you MUST output JSON matching this exactly):

{
  "schemaVersion": 1,
  "name": "string (3-120 chars)",
  "description": "string (3-480 chars)",
  "trigger": Trigger,
  "steps": Step[] (1-24 entries),
  "integrations": Integration[] (max 10),
  "setupFields": SetupField[] (max 20),
  "status": "draft" | "active" | "paused"
}

Trigger (discriminated union on "kind"):
  { "kind": "manual",   "config": {} }
  { "kind": "webhook",  "integration"?: Integration, "config": { "event"?: string } }
  { "kind": "form",     "integration"?: Integration, "config": { "formIdField": string } }
  { "kind": "schedule", "config": { "cron": string, "timezone": string } }
  { "kind": "event",    "integration": Integration, "config": { "eventName": string } }

Allowed trigger kinds: ${TRIGGER_KINDS.join(", ")}.

Step:
  {
    "id": "snake_case_unique",
    "name": "Human-readable label",
    "description"?: "string (optional)",
    "kind": ${STEP_KINDS.map((k) => `"${k}"`).join(" | ")},
    "integration"?: Integration,
    "operation": "snake_case_verb",
    "params": Record<string, ParamRef>,
    "next": [stepId...],   // outgoing edges; empty = terminal
    "onError": ${STEP_ERROR_POLICIES.map((p) => `"${p}"`).join(" | ")}
  }

ParamRef (discriminated union on "source"):
  { "source": "literal",  "value": "literal string" }
  { "source": "trigger",  "ref": "payload.path.to.field" }
  { "source": "step",     "ref": "<earlier_step_id>.path" }
  { "source": "template", "value": "Hi {{trigger.name}}, your order {{step_1.id}}" }
  { "source": "secret",   "ref": "credential_key" }

SetupField:
  {
    "key": "snake_case",
    "label": "Friendly label",
    "type": ${FIELD_TYPES.map((t) => `"${t}"`).join(" | ")},
    "placeholder": "string",
    "helpText": "Why this field is needed",
    "required": true | false,
    "options"?: ["option1", "option2", ...],   // type="select" only
    "integration"?: Integration
  }

Allowed integrations: ${SUPPORTED_INTEGRATIONS.join(", ")}.

ALLOWED OPERATIONS BY INTEGRATION:

${operationsSection}

GRAPH RULES:
- Step IDs are unique within the workflow.
- Every entry in next[] must reference an existing step ID.
- params with source="step" must reference an earlier step (no forward refs, no cycles).
- A step of kind "condition" must have at least 2 outgoing edges.
- Steps of any other kind have at most 1 outgoing edge.
- The workflow must contain at least one terminal step (next: []).

INTEGRATION COHERENCE:
- Every integration used by a step or trigger MUST appear in the top-level integrations[].
- Every (integration, operation) pair MUST be in the allowed operations list.
- Required parameters for the operation MUST be present in step.params.

NEVER produce:
- Free-form workflows that don't match this schema.
- Step kinds, operations, or integrations not listed above.
- HTML, scripts, or markdown formatting in any string field.
- Trailing commentary after the JSON.

Output ONLY the JSON object.`;
}

function buildOperationsSection(): string {
  const groups = new Map<string, string[]>();
  for (const op of allOperations()) {
    const key = op.integration ?? "(builtin)";
    const allowedKinds = op.kinds.join("/");
    const required =
      op.requiredParams.length > 0
        ? ` — required params: ${op.requiredParams.join(", ")}`
        : "";
    const line = `  - operation: "${op.operation}" (kind: ${allowedKinds})${required} — ${op.description}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(line);
  }

  const sections: string[] = [];
  for (const [integration, lines] of groups) {
    sections.push(`Integration: ${integration}\n${lines.join("\n")}`);
  }
  return sections.join("\n\n");
}
