/**
 * Provider registry.
 *
 * Maps `WORKFLOW_PROVIDER` env value to a concrete `WorkflowProvider`
 * implementation. Adding a new provider:
 *   1. Implement WorkflowProvider in providers/<name>.ts.
 *   2. Register it below.
 *   3. Document the env value.
 *
 * The registry is the only place that knows ALL available providers.
 * The orchestrator asks for one by name (or `default`) and stays
 * agnostic.
 */

import { env } from "@/lib/env";
import type { WorkflowProvider } from "@/lib/ai/types";
import { OpenAIWorkflowProvider } from "./openai";

export type ProviderName = "openai" | "claude" | "gemini";

const providers = new Map<ProviderName, WorkflowProvider>();

function getOrCreate(name: ProviderName): WorkflowProvider {
  let provider = providers.get(name);
  if (provider) return provider;

  switch (name) {
    case "openai":
      provider = new OpenAIWorkflowProvider();
      break;
    case "claude":
      throw new Error("Claude provider not implemented yet.");
    case "gemini":
      throw new Error("Gemini provider not implemented yet.");
  }

  providers.set(name, provider);
  return provider;
}

/**
 * Resolve the configured provider. Reads `WORKFLOW_PROVIDER` env, falls
 * back to "openai".
 */
export function getConfiguredProvider(): WorkflowProvider {
  const requested = (env.workflowProvider ?? "openai") as ProviderName;
  return getOrCreate(requested);
}

/** Lookup a specific provider by name (used by orchestrator fallback chain). */
export function getProvider(name: ProviderName): WorkflowProvider {
  return getOrCreate(name);
}
