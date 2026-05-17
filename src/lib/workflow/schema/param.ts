/**
 * ParamRef — typed parameter reference for workflow steps.
 *
 * A ParamRef describes WHERE a step's input value comes from, without
 * binding to any specific execution engine. Adapters compile ParamRefs
 * into their native expression language at deployment time.
 *
 * Example mappings (Phase 2 — n8n adapter):
 *   { source: "literal",  value: "hello" }         → "hello"
 *   { source: "trigger",  ref: "payload.amount" }  → ={{$json.payload.amount}}
 *   { source: "step",     ref: "step_1.output" }   → ={{$node["step_1"].json.output}}
 *   { source: "template", value: "Hi {{name}}" }   → "Hi {{ $json.name }}"
 *   { source: "secret",   ref: "slack_token" }     → ={{$credentials.slack.token}}
 *
 * The IR keeps reference resolution abstract. Adapters own the
 * impedance mismatch with their target executor.
 */

import { z } from "zod";

/**
 * Reasonable bounds for ref strings to defend against AI hallucinating
 * massive values. Path-like syntax: dotted segments + bracket indices.
 */
const REF_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*|\[\d+\])*$/;

const baseRefField = z
  .string()
  .trim()
  .min(1, "Reference cannot be empty.")
  .max(240, "Reference is too long.")
  .regex(
    REF_PATTERN,
    "Reference must use dotted-path syntax (e.g. payload.user.email).",
  );

const baseValueField = z
  .string()
  .max(4000, "Literal value is too long.");

/* ─── Discriminated union: one shape per source kind ─────────────── */

const literalRefSchema = z
  .object({
    source: z.literal("literal"),
    value: baseValueField,
  })
  .strict();

const triggerRefSchema = z
  .object({
    source: z.literal("trigger"),
    ref: baseRefField,
  })
  .strict();

const stepRefSchema = z
  .object({
    source: z.literal("step"),
    /**
     * ref MUST be of form "<stepId>.<path>". Cross-step graph integrity
     * is verified by validation/graph-integrity at a higher layer
     * (the schema cannot know which step IDs exist).
     */
    ref: baseRefField,
  })
  .strict();

const templateRefSchema = z
  .object({
    source: z.literal("template"),
    /**
     * Mustache-style template. May reference trigger payload and step
     * outputs via {{step_id.path}} or {{trigger.path}}.
     * Adapters compile the template into their expression language.
     */
    value: baseValueField,
  })
  .strict();

const secretRefSchema = z
  .object({
    source: z.literal("secret"),
    /**
     * Logical secret name. Resolved at execution time from the user's
     * encrypted credential vault. Never persisted in the IR.
     */
    ref: baseRefField,
  })
  .strict();

/**
 * The complete ParamRef discriminated union.
 *
 * Adding a new source kind:
 *   1. Define the new branch schema (must include `.source` literal).
 *   2. Add it to the union below.
 *   3. Implement compilation in every adapter.
 */
export const paramRefSchema = z.discriminatedUnion("source", [
  literalRefSchema,
  triggerRefSchema,
  stepRefSchema,
  templateRefSchema,
  secretRefSchema,
]);

export type ParamRef = z.infer<typeof paramRefSchema>;

/**
 * Step parameters: keyed bag of ParamRefs.
 *
 * Keys are the parameter names expected by the step's `operation`
 * (e.g. "channel", "text", "to", "body").
 */
export const stepParamsSchema = z
  .record(
    z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(
        /^[a-zA-Z_][a-zA-Z0-9_]*$/,
        "Param keys must be camelCase or snake_case identifiers.",
      ),
    paramRefSchema,
  )
  .default({});

export type StepParams = z.infer<typeof stepParamsSchema>;

/* ─── Convenience constructors (used by tests and projection layer) */

export function literal(value: string): ParamRef {
  return { source: "literal", value };
}

export function fromTrigger(ref: string): ParamRef {
  return { source: "trigger", ref };
}

export function fromStep(stepId: string, path: string): ParamRef {
  return { source: "step", ref: `${stepId}.${path}` };
}

export function template(value: string): ParamRef {
  return { source: "template", value };
}

export function secret(ref: string): ParamRef {
  return { source: "secret", ref };
}
