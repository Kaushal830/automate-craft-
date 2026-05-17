/**
 * POST /api/automations/[id]/pause
 * POST /api/automations/[id]/pause?action=resume
 *
 * Toggles a deployment between active and paused states. The query
 * string `action` selects pause (default) or resume.
 */

import { handleRouteError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { enforceRateLimit, RateLimitError } from "@/lib/security";
import {
  getActiveDeployment,
  pauseDeployment,
  resumeDeployment,
} from "@/lib/execution";
import { isWorkflowError } from "@/lib/workflow";

const log = createLogger("api/automations/pause");

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
    const action = new URL(request.url).searchParams.get("action") ?? "pause";

    const deployment = await getActiveDeployment({
      automationId: id,
      adapter: "n8n",
    });
    if (!deployment) {
      return jsonError("No active deployment for this automation.", 404);
    }
    if (deployment.userId !== user.id) {
      return jsonError("Forbidden.", 403);
    }

    if (action === "pause") {
      await pauseDeployment(deployment.id);
      log.info("Deployment paused.", { deploymentId: deployment.id });
      return Response.json({ ok: true, state: "paused" });
    }
    if (action === "resume") {
      await resumeDeployment(deployment.id);
      log.info("Deployment resumed.", { deploymentId: deployment.id });
      return Response.json({ ok: true, state: "active" });
    }
    return jsonError(`Unknown action "${action}".`, 400);
  } catch (error) {
    log.error("Pause/resume failed.", error);
    if (isWorkflowError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not toggle deployment.");
  }
}
