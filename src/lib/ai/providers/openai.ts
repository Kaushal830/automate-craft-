/**
 * OpenAI provider implementation.
 *
 * Uses OpenAI's Responses API with structured output (`zodTextFormat`)
 * to constrain the model to our IR schema. The model is configured via
 * env (`OPENAI_MODEL`, default `gpt-4o`).
 *
 * Failure modes are normalized into typed errors from
 * `@/lib/workflow/errors`:
 *   - 401/403           → ProviderNotConfiguredError
 *   - 429                → ProviderRateLimitedError
 *   - timeouts           → ProviderTimeoutError
 *   - everything else    → ProviderFailedError
 */

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  ProviderFailedError,
  ProviderNotConfiguredError,
  ProviderRateLimitedError,
  ProviderTimeoutError,
  workflowIRSchema,
} from "@/lib/workflow";
import { env, hasOpenAIKey } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { buildPrompt } from "@/lib/ai/prompts";
import type {
  GenerationContext,
  ProviderGenerationResult,
  WorkflowProvider,
} from "@/lib/ai/types";

const log = createLogger("ai/providers/openai");

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return client;
}

export class OpenAIWorkflowProvider implements WorkflowProvider {
  readonly name = "openai" as const;

  isReady(): boolean {
    return hasOpenAIKey();
  }

  async generate(ctx: GenerationContext): Promise<ProviderGenerationResult> {
    if (!this.isReady()) {
      throw new ProviderNotConfiguredError(
        "OpenAI provider is not configured. Set OPENAI_API_KEY.",
        { providerName: this.name },
      );
    }

    const { systemPrompt, reasoningEffort } = buildPrompt({
      tier: ctx.tier,
      hasSubscription: ctx.hasSubscription,
    });

    log.info("Calling OpenAI provider.", {
      tier: ctx.tier,
      reasoningEffort,
      model: env.openaiModel,
    });

    try {
      const response = await getClient().responses.parse({
        model: env.openaiModel,
        reasoning: { effort: reasoningEffort },
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: ctx.prompt },
        ],
        text: {
          format: zodTextFormat(workflowIRSchema, "automation_workflow_ir"),
        },
      });

      const rawWorkflow = response.output_parsed ?? null;

      return {
        rawWorkflow,
        source: "openai",
        metadata: {
          model: env.openaiModel,
          reasoningEffort,
          tier: ctx.tier,
        },
      };
    } catch (error) {
      throw normalizeOpenAIError(error);
    }
  }
}

function normalizeOpenAIError(error: unknown): Error {
  // OpenAI SDK errors expose `status`. Treat known statuses; otherwise wrap as ProviderFailedError.
  const errAny = error as { status?: number; message?: string; name?: string; code?: string };

  if (errAny?.name === "AbortError" || errAny?.code === "ETIMEDOUT") {
    return new ProviderTimeoutError(
      "OpenAI request timed out.",
      { underlying: errAny?.message ?? "" },
      error,
    );
  }
  if (errAny?.status === 429) {
    return new ProviderRateLimitedError(
      "OpenAI rate limit reached. Try again shortly.",
      { underlying: errAny?.message ?? "" },
      error,
    );
  }
  if (errAny?.status === 401 || errAny?.status === 403) {
    return new ProviderNotConfiguredError(
      "OpenAI rejected the API key. Check OPENAI_API_KEY.",
      { underlying: errAny?.message ?? "" },
      error,
    );
  }
  return new ProviderFailedError(
    errAny?.message || "OpenAI provider failed.",
    { underlying: errAny?.message ?? "", status: errAny?.status ?? null },
    error,
  );
}
