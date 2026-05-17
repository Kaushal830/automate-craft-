/**
 * ParamRef → n8n expression compiler.
 *
 * Each ParamRef source kind has a specific n8n expression idiom:
 *
 *   literal   → raw string (no expression syntax)
 *   trigger   → "={{ $json.<ref> }}"
 *   step      → '={{ $node["<id>"].json.<path> }}'
 *   template  → mustache `{{ ... }}` rewritten to n8n `{{ ... }}` (compatible)
 *   secret    → "={{ $credentials.<credentialName>.<refPath> }}"
 *
 * The compiler is pure. It does NOT touch the vault and does NOT call
 * the n8n API. It just builds strings.
 */

import type { ParamRef } from "@/lib/workflow";

const STEP_REF_REGEX = /^([a-z][a-z0-9_]*)(?:\.(.+))?$/;

export function compileParamRefToN8n(ref: ParamRef): string | number | boolean {
  switch (ref.source) {
    case "literal":
      return ref.value;

    case "trigger":
      // trigger payload arrives at the first step as $json.
      return `={{$json.${ref.ref}}}`;

    case "step": {
      const match = STEP_REF_REGEX.exec(ref.ref);
      if (!match) {
        // Fallback — pass through raw to surface the bad ref in n8n logs.
        return `={{${ref.ref}}}`;
      }
      const [, stepId, path] = match;
      if (!path) return `={{$node["${stepId}"].json}}`;
      return `={{$node["${stepId}"].json.${path}}}`;
    }

    case "template":
      return rewriteMustacheToN8n(ref.value);

    case "secret":
      // n8n stores secrets in credentials, accessed at runtime.
      // We use a sentinel marker that the credential mapper rewrites
      // when the n8n credential ID is known (post-create).
      return `={{$credentials.${ref.ref}}}`;

    default: {
      const exhaustive: never = ref;
      void exhaustive;
      return "";
    }
  }
}

/**
 * Rewrite `{{ trigger.foo }}` and `{{ stepX.bar }}` into n8n expressions.
 * Plain `{{ name }}` (no dot) becomes `$json.name`.
 */
function rewriteMustacheToN8n(template: string): string {
  const out = template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expr) => {
    const trimmed = String(expr).trim();
    if (trimmed.startsWith("trigger.")) {
      return `{{ $json.${trimmed.slice("trigger.".length)} }}`;
    }
    if (trimmed.startsWith("secret.")) {
      return `{{ $credentials.${trimmed.slice("secret.".length)} }}`;
    }
    const stepMatch = STEP_REF_REGEX.exec(trimmed);
    if (stepMatch) {
      const [, stepId, path] = stepMatch;
      if (!path) return `{{ $node["${stepId}"].json }}`;
      return `{{ $node["${stepId}"].json.${path} }}`;
    }
    return `{{ $json.${trimmed} }}`;
  });
  return `=${out}`;
}
