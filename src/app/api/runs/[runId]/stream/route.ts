/**
 * GET /api/runs/[runId]/stream
 *
 * Server-Sent Events feed for a single run. Frontend opens this with
 * `new EventSource()` and receives `run.started`, `step.started`,
 * `step.succeeded`, `step.failed`, `run.succeeded`, `run.failed`
 * events.
 *
 * The `/api/runs/[runId]` polling endpoint (Phase 3) still exists for
 * clients that can't use EventSource — this endpoint is the realtime
 * alternative.
 *
 * Phase 4: in-process broadcaster only (single-instance Next.js
 * deployment). Phase 5 swaps the broadcaster to Postgres LISTEN/NOTIFY
 * without changing this route.
 */

import { handleRouteError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { buildSseResponse, runChannel } from "@/lib/realtime";
import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase } from "@/lib/local-store";

const log = createLogger("api/runs/stream");

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Authentication required.", 401);
    }

    const { runId } = await context.params;
    const owns = await runBelongsToUser(runId, user.id);
    if (!owns) {
      return jsonError("Run not found.", 404);
    }

    return buildSseResponse(runChannel(runId), {
      kind: "stream.ready",
      payload: { runId },
    });
  } catch (error) {
    log.error("SSE handshake failed.", error);
    return handleRouteError(error, "Could not open run stream.");
  }
}

async function runBelongsToUser(runId: string, userId: string): Promise<boolean> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automation_runs")
      .select("id")
      .eq("id", runId)
      .eq("user_id", userId)
      .maybeSingle();
    if (response.error) return false;
    return Boolean(response.data);
  }
  const database = await readLocalDatabase();
  return database.automationRuns.some(
    (r) => r.id === runId && r.userId === userId,
  );
}
