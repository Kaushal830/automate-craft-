/**
 * GET /api/automations/[id]/status
 *
 * Composite status endpoint. Returns:
 *   - automation summary (name, status, integration_status)
 *   - active workflow version (id, versionNumber, source)
 *   - active deployment (state, lastError, adapter)
 *   - last run summary (status, started, finished)
 *   - cost estimate for next run
 *
 * Frontend uses this on the automation detail page to render the
 * "deployment + last run + cost" header without making 4 separate
 * calls.
 */

import { handleRouteError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { getAutomationByIdForUser } from "@/lib/automation-store";
import {
  estimateRunCost,
  getActiveDeployment,
  listDeploymentsForAutomation,
} from "@/lib/execution";
import { getActiveVersion } from "@/lib/workflow-store";
import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase } from "@/lib/local-store";

const log = createLogger("api/automations/status");

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
    const automation = await getAutomationByIdForUser(user.id, id);
    if (!automation) {
      return jsonError("Automation not found.", 404);
    }

    const [activeVersion, activeDeployment, allDeployments, lastRun] =
      await Promise.all([
        getActiveVersion(id),
        getActiveDeployment({ automationId: id, adapter: "n8n" }),
        listDeploymentsForAutomation(id),
        fetchLastRun(id, user.id),
      ]);

    // Cost estimate — only meaningful when an active version exists.
    let estimate = null;
    if (activeVersion) {
      try {
        const result = await estimateRunCost({ automationId: id });
        estimate = result.cost;
      } catch {
        estimate = null;
      }
    }

    return Response.json({
      automation: {
        id: automation.id,
        name: automation.name,
        status: automation.status,
        webhookId: automation.webhookId,
        integrationStatus: automation.integrationStatus,
        createdAt: automation.createdAt,
        updatedAt: automation.updatedAt,
      },
      activeVersion: activeVersion
        ? {
            id: activeVersion.id,
            versionNumber: activeVersion.versionNumber,
            source: activeVersion.source,
            createdAt: activeVersion.createdAt,
          }
        : null,
      activeDeployment: activeDeployment
        ? {
            id: activeDeployment.id,
            adapter: activeDeployment.adapter,
            state: activeDeployment.state,
            lastError: activeDeployment.lastError,
            deployedAt: activeDeployment.deployedAt,
          }
        : null,
      deploymentHistory: allDeployments.slice(0, 10).map((d) => ({
        id: d.id,
        adapter: d.adapter,
        state: d.state,
        lastError: d.lastError,
        createdAt: d.createdAt,
      })),
      lastRun,
      estimate,
    });
  } catch (error) {
    log.error("Status composite failed.", error);
    return handleRouteError(error, "Could not load status.");
  }
}

async function fetchLastRun(automationId: string, userId: string) {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automation_runs")
      .select("id, status, trigger_source, trigger_kind, created_at, finished_at, error_message")
      .eq("automation_id", automationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (response.error) throw new Error(response.error.message);
    return response.data;
  }

  const database = await readLocalDatabase();
  const sorted = database.automationRuns
    .filter((r) => r.automationId === automationId && r.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = sorted[0];
  return last
    ? {
        id: last.id,
        status: last.status,
        trigger_source: last.triggerSource,
        created_at: last.createdAt,
        finished_at: last.finishedAt,
        error_message: last.errorMessage,
      }
    : null;
}
