/**
 * POST /api/automations/[id]/deploy
 *
 * Deploys the active workflow version of an automation via the
 * configured execution adapter. Returns the deployment record once
 * the state transitions to "active".
 *
 * Request body (optional):
 *   { adapter?: "n8n" | "temporal" | "inngest" }
 */

import { z } from "zod";
import { handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getUserCredits } from "@/lib/credit-store";
import { createLogger } from "@/lib/logger";
import { enforceRateLimit, RateLimitError } from "@/lib/security";
import { deployAutomation } from "@/lib/execution";
import { isWorkflowError, type PlanTier } from "@/lib/workflow";

const log = createLogger("api/automations/deploy");

const requestSchema = z
  .object({
    adapter: z.enum(["n8n", "temporal", "inngest"]).optional(),
  })
  .optional();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleRouteError(
        new Error("Authentication required."),
        "Authentication required.",
        401,
      );
    }

    try {
      await enforceRateLimit({ name: "deploy-automation", identifier: user.id });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return Response.json(error.toApiPayload(), { status: 429 });
      }
      throw error;
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => undefined);
    const parsed = requestSchema.parse(body);

    const credits = await getUserCredits(user.id);
    const plan: PlanTier = credits.hasSubscription ? "plus" : "starter";

    const outcome = await deployAutomation({
      automationId: id,
      userId: user.id,
      plan,
      adapter: parsed?.adapter,
    });

    log.info("Deploy succeeded.", {
      automationId: id,
      deploymentId: outcome.deployment.id,
    });

    return Response.json({
      deployment: outcome.deployment,
      warnings: outcome.warnings,
    });
  } catch (error) {
    log.error("Deploy failed.", error);
    if (isWorkflowError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not deploy automation.");
  }
}
