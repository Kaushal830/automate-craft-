/**
 * GET /api/automations/[id]/estimate
 *
 * Pre-run cost preview. Returns the full ExecutionCostBreakdown for
 * the active workflow version. Frontend renders this on the run
 * button ("Run for X credits") and on the credit-usage page.
 */

import { handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { estimateRunCost } from "@/lib/execution";
import { getUserCredits } from "@/lib/credit-store";
import { isWorkflowError } from "@/lib/workflow";

const log = createLogger("api/automations/estimate");

export async function GET(
  _request: Request,
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
    const [estimate, credits] = await Promise.all([
      estimateRunCost({ automationId: id }),
      getUserCredits(user.id),
    ]);

    return Response.json({
      automationId: estimate.automationId,
      versionId: estimate.versionId,
      versionNumber: estimate.versionNumber,
      cost: estimate.cost,
      userBalance: credits.totalCredits,
      sufficient: credits.totalCredits >= estimate.cost.total,
    });
  } catch (error) {
    log.error("Cost estimate failed.", error);
    if (isWorkflowError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not estimate cost.");
  }
}
