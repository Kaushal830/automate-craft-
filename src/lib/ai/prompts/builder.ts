/**
 * PromptBuilder — composes the system prompt for a generation call.
 *
 * Composition order (top to bottom):
 *   1. Role + tier-specific rules (template).
 *   2. Schema specification (auto-generated from Zod + operation catalog).
 *
 * The builder is stateless. Construction is cheap; templates are static
 * strings. The schema spec is regenerated each call (cost: a few string
 * concatenations) to ensure prompts stay in sync with the catalog.
 */

import type { GenerationTier } from "@/lib/workflow";
import { buildSchemaSpec } from "./schema-spec";
import { standardTemplate } from "./templates/standard";
import { ultraStarterTemplate } from "./templates/ultra-starter";
import { ultraPlusTemplate } from "./templates/ultra-plus";

export type PromptBuildOptions = {
  tier: GenerationTier;
  hasSubscription: boolean;
};

export type BuiltPrompt = {
  systemPrompt: string;
  reasoningEffort: "low" | "medium" | "high";
};

function pickTemplate(opts: PromptBuildOptions): string {
  if (opts.tier === "standard") return standardTemplate;
  return opts.hasSubscription ? ultraPlusTemplate : ultraStarterTemplate;
}

function pickReasoningEffort(opts: PromptBuildOptions): BuiltPrompt["reasoningEffort"] {
  if (opts.tier === "standard") return "low";
  return opts.hasSubscription ? "high" : "medium";
}

/**
 * Build the system prompt + reasoning effort for an upcoming
 * generation call.
 */
export function buildPrompt(opts: PromptBuildOptions): BuiltPrompt {
  const template = pickTemplate(opts);
  const schemaSpec = buildSchemaSpec();

  const systemPrompt = `${template}\n\n${schemaSpec}`;

  return {
    systemPrompt,
    reasoningEffort: pickReasoningEffort(opts),
  };
}
