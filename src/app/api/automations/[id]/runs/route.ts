/**
 * GET /api/automations/[id]/runs
 *
 * Lists recent runs for an automation, scoped to the requesting user.
 * Each run includes its step executions and runtime events for
 * frontend rendering.
 */

import { handleRouteError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { listRunsForUser } from "@/lib/automation-store";
import {
  listRuntimeEventsForRun,
  listStepExecutionsForRun,
} from "@/lib/execution";

const log = createLogger("api/automations/runs");

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

    const allUserRuns = await listRunsForUser(user.id);
    const runs = allUserRuns.filter((r) => r.automationId === id).slice(0, 50);

    if (runs.length === 0) {
      return Response.json({ runs: [] });
    }

    // Hydrate step executions + events (Phase 2 — small N, no batching).
    const detailed = await Promise.all(
      runs.map(async (run) => {
        const [steps, events] = await Promise.all([
          listStepExecutionsForRun(run.id),
          listRuntimeEventsForRun(run.id),
        ]);
        return { ...run, stepExecutions: steps, events };
      }),
    );

    return Response.json({ runs: detailed });
  } catch (error) {
    log.error("List runs failed.", error);
    return handleRouteError(error, "Could not list runs.");
  }
}

export const POST = async () =>
  jsonError(
    "POST /api/automations/[id]/runs is not supported. Use POST /api/run-automation.",
    405,
  );
