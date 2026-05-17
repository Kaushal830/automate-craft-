/**
 * GET /api/runs/[runId]
 *
 * Live single-run status — designed for frontend polling. Returns the
 * run row hydrated with step executions + recent events.
 *
 * Frontend pattern:
 *   - User clicks "Run" → /api/run-automation returns { runId }.
 *   - Frontend polls /api/runs/[runId] every 1-2s until status is
 *     "success" or "error".
 *
 * Phase 3 ships poll-based reads. Phase 4 can add SSE / WebSocket
 * push via Postgres LISTEN/NOTIFY without changing this endpoint.
 */

import { handleRouteError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase } from "@/lib/local-store";
import {
  listRuntimeEventsForRun,
  listStepExecutionsForRun,
} from "@/lib/execution";

const log = createLogger("api/runs/[runId]");

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
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

    const { runId } = await context.params;
    const run = await fetchRun(runId, user.id);
    if (!run) {
      return jsonError("Run not found.", 404);
    }

    const [stepExecutions, events] = await Promise.all([
      listStepExecutionsForRun(runId),
      listRuntimeEventsForRun(runId),
    ]);

    return Response.json({
      run,
      stepExecutions,
      events,
      isTerminal: run.status === "success" || run.status === "error",
    });
  } catch (error) {
    log.error("Failed to load run.", error);
    return handleRouteError(error, "Could not load run.");
  }
}

async function fetchRun(runId: string, userId: string) {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automation_runs")
      .select(
        "id, automation_id, user_id, status, logs, trigger_source, trigger_kind, payload, result, error_message, deployment_id, version_id, created_at, finished_at",
      )
      .eq("id", runId)
      .eq("user_id", userId)
      .maybeSingle();
    if (response.error) throw new Error(response.error.message);
    return response.data;
  }

  const database = await readLocalDatabase();
  return (
    database.automationRuns.find(
      (entry) => entry.id === runId && entry.userId === userId,
    ) ?? null
  );
}
