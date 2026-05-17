/**
 * GET /api/automations/[id]/preflight
 *
 * Dry-run deployment validator. Runs the full pre-deploy check WITHOUT
 * creating a deployment row or calling the adapter. Used by the
 * frontend "Ready to deploy?" panel to surface missing connections,
 * credentials, plan-limit issues, etc.
 */

import { handleRouteError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { getActiveVersion } from "@/lib/workflow-store";
import {
  getDefaultAdapter,
  getAdapter,
  type AdapterName,
} from "@/lib/adapters";
import { preDeployValidate } from "@/lib/execution";
import { getUserCredits } from "@/lib/credit-store";
import { isWorkflowError, type PlanTier } from "@/lib/workflow";

const log = createLogger("api/automations/preflight");

export async function GET(
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

    const { id } = await context.params;
    const url = new URL(request.url);
    const adapterParam = url.searchParams.get("adapter") as AdapterName | null;

    const version = await getActiveVersion(id);
    if (!version) {
      return jsonError("No active workflow version.", 404);
    }

    const credits = await getUserCredits(user.id);
    const plan: PlanTier = credits.hasSubscription ? "plus" : "starter";

    const adapter = adapterParam ? getAdapter(adapterParam) : getDefaultAdapter();

    const result = await preDeployValidate({
      workflow: version.workflow,
      userId: user.id,
      plan,
      adapter,
    });

    return Response.json({
      ok: result.ok,
      adapter: adapter.name,
      adapterReady: adapter.isReady(),
      versionId: version.id,
      versionNumber: version.versionNumber,
      issues: result.issues,
      summary: {
        errorCount: result.issues.filter((i) => i.severity === "error").length,
        warningCount: result.issues.filter((i) => i.severity === "warning").length,
      },
    });
  } catch (error) {
    log.error("Preflight failed.", error);
    if (isWorkflowError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not run preflight.");
  }
}
