/**
 * POST /api/generate-automation
 *
 * Generates a workflow IR from a user prompt. Does NOT persist anything
 * to the database — persistence is deferred to /api/save-automation
 * after the user reviews/edits the generated output.
 *
 * Response shape (Phase 1):
 *   {
 *     workflow:         AutomationWorkflow,    // legacy projection (frontend reads this)
 *     ir:               WorkflowIR,            // canonical IR (new shape)
 *     fieldDefinitions: AutomationSetupField[],// derived from legacy projection
 *     source:           VersionSource,         // "openai" | "fallback" | ...
 *     tier:             "standard" | "ultra",
 *     cost:             number,                // credits charged for generation
 *     planTier:         "starter" | "plus" | "pro",
 *     warnings:         WorkflowWarning[],     // non-fatal validation warnings
 *     metadata:         Record<string, unknown>
 *   }
 */

import { z } from "zod";
import { generateWorkflow } from "@/lib/ai";
import { handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { deductCredits, getUserCredits } from "@/lib/credit-store";
import { createLogger } from "@/lib/logger";
import {
  calculateGenerationCost,
  isWorkflowError,
  projectWorkflowToLegacy,
  type PlanTier,
} from "@/lib/workflow";
import { getWorkflowFieldDefinitions as legacyFieldDefs } from "@/lib/automation";

const log = createLogger("api/generate-automation");

const requestSchema = z.object({
  prompt: z.string().trim().min(5).max(2000),
  ultraThinking: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    log.info("Request received.");

    /* ── Auth ────────────────────────────────────────────── */
    const user = await getCurrentUser();
    if (!user) {
      return handleRouteError(
        new Error("Authentication required."),
        "Authentication required.",
        401,
      );
    }

    /* ── Parse body ─────────────────────────────────────── */
    const body = await request.json().catch(() => null);
    const { prompt, ultraThinking } = requestSchema.parse(body);

    /* ── Plan + credits ─────────────────────────────────── */
    const credits = await getUserCredits(user.id);
    const hasSubscription = credits.hasSubscription;
    const planTier: PlanTier = hasSubscription ? "plus" : "starter";

    const tier = ultraThinking ? "ultra" : "standard";
    const cost = calculateGenerationCost(tier);

    const modeLabel = ultraThinking
      ? hasSubscription
        ? "Ultra Thinking (Plus)"
        : "Ultra Thinking (Starter)"
      : "Standard Generation";

    log.info("Deducting credits.", { cost, mode: modeLabel });
    const deducted = await deductCredits(user.id, cost, modeLabel);
    if (!deducted) {
      return handleRouteError(
        new Error("Not enough credits."),
        "Not enough credits.",
        402,
      );
    }

    /* ── Generate via orchestrator ──────────────────────── */
    const outcome = await generateWorkflow({
      prompt,
      ultraThinking,
      hasSubscription,
      plan: planTier,
    });

    /* ── Project IR → legacy + derive field definitions ── */
    const legacyWorkflow = projectWorkflowToLegacy(outcome.workflow);
    const fieldDefinitions = legacyFieldDefs(legacyWorkflow);

    log.info("Workflow generated successfully.", {
      source: outcome.source,
      stepCount: outcome.workflow.steps.length,
      warnings: outcome.warnings.length,
    });

    return Response.json({
      workflow: legacyWorkflow,
      ir: outcome.workflow,
      fieldDefinitions,
      source: outcome.source,
      tier: outcome.tier,
      cost,
      planTier,
      warnings: outcome.warnings,
      metadata: outcome.metadata,
    });
  } catch (error) {
    log.error("Request failed.", error);
    if (isWorkflowError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not generate automation.");
  }
}
