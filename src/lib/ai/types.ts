/**
 * AI provider abstraction.
 *
 * The `WorkflowProvider` interface decouples the workflow generation
 * orchestrator from any specific LLM vendor. Adding a new provider
 * (Claude, Gemini, local model) is a single class implementation.
 *
 * Providers are pure: they take a prompt + options and return a
 * structured workflow. They DO NOT sanitize, DO NOT validate, DO NOT
 * deduct credits. The orchestrator owns those concerns.
 */

import type { GenerationTier } from "@/lib/workflow";
import type { VersionSource, WorkflowIR } from "@/lib/workflow";

/* ─── Generation context ─────────────────────────────────────────── */

/**
 * Context passed to a provider for a single generation call.
 */
export type GenerationContext = {
  /** Raw user prompt (already validated for length). */
  prompt: string;
  /** Tier — affects reasoning effort and prompt template selection. */
  tier: GenerationTier;
  /** Whether the user has an active paid subscription. */
  hasSubscription: boolean;
};

/* ─── Generation result ──────────────────────────────────────────── */

/**
 * Result of a successful generation.
 *
 * `workflow` is the RAW provider output — not yet sanitized or
 * validated. The orchestrator runs sanitization + validation before
 * returning anything to callers.
 */
export type ProviderGenerationResult = {
  /** Unsanitized, unvalidated provider output. */
  rawWorkflow: unknown;
  /** Provider-specific metadata (model, reasoning effort, token counts). */
  metadata: Record<string, unknown>;
  /** Source identifier for the version row. */
  source: VersionSource;
};

/* ─── Provider interface ─────────────────────────────────────────── */

export interface WorkflowProvider {
  /** Stable identifier — matches `VersionSource`. */
  readonly name: VersionSource;

  /**
   * Whether this provider is configured and ready to call.
   * If false, the orchestrator falls back to the next provider in
   * the chain (or the deterministic fallback).
   */
  isReady(): boolean;

  /**
   * Generate a workflow from a prompt. Throws `ProviderError` family
   * on failure. Output is structured (`unknown` typed for safety) but
   * not yet sanitized or validated.
   */
  generate(ctx: GenerationContext): Promise<ProviderGenerationResult>;
}

/* ─── Final orchestrator output ──────────────────────────────────── */

/**
 * Output of `generateWorkflow()` (the orchestrator). Composes a fully
 * sanitized + validated WorkflowIR with metadata for the version row.
 */
export type WorkflowGenerationOutcome = {
  workflow: WorkflowIR;
  source: VersionSource;
  tier: GenerationTier;
  cost: number;
  metadata: Record<string, unknown>;
  warnings: Array<{ code: string; message: string }>;
};
