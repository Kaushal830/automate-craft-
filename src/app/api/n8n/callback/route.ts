/**
 * POST /api/n8n/callback
 *
 * Receives execution-completed callbacks from n8n. n8n is configured
 * to POST here when a workflow execution finishes; we update the
 * corresponding automation_run + step_executions immediately.
 *
 * Polling fallback in `runtime/orchestrator` handles missed callbacks,
 * but the callback path is the primary source of truth.
 *
 * Auth: shared HMAC secret via N8N_WEBHOOK_SECRET. The callback body
 * is signed with `X-AutomateCraft-Signature: sha256=<hex>` header
 * (configured on the n8n side).
 *
 * Body shape (n8n side responsibility):
 *   {
 *     runId:   "<our automation_runs.id>",
 *     status: { state, steps: [{id, status, output?, error?}], finishedAt? }
 *   }
 */

import { z } from "zod";
import { handleRouteError, jsonError } from "@/lib/api";
import { createLogger } from "@/lib/logger";
import {
  enforceRateLimit,
  normalizeHeaders,
  RateLimitError,
  verifyIncomingWebhook,
} from "@/lib/security";
import { applyAdapterCallback } from "@/lib/execution";
import { hasN8nConfigured } from "@/lib/env";

const log = createLogger("api/n8n/callback");

const callbackSchema = z.object({
  runId: z.string().uuid(),
  status: z.object({
    state: z.enum(["queued", "running", "success", "error"]),
    startedAt: z.string().nullable().optional(),
    finishedAt: z.string().nullable().optional(),
    steps: z.array(
      z.object({
        id: z.string().min(1),
        status: z.enum(["pending", "running", "success", "error", "skipped"]),
        output: z.unknown().optional(),
        error: z.string().optional(),
      }),
    ),
  }),
});

export async function POST(request: Request) {
  try {
    if (!hasN8nConfigured()) {
      return jsonError("n8n adapter not configured.", 503);
    }

    /* ── Rate limit by source IP-ish header ─────────────────── */
    const headers = normalizeHeaders(request.headers);
    const rateKey = headers["x-forwarded-for"] ?? headers["x-real-ip"] ?? "n8n";
    try {
      await enforceRateLimit({ name: "webhook-receive", identifier: rateKey });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return Response.json(error.toApiPayload(), { status: 429 });
      }
      throw error;
    }

    const rawBody = await request.text();

    /* ── HMAC verify ─────────────────────────────────────────── */
    const verifyResult = await verifyIncomingWebhook({
      rawBody,
      headers,
      integration: "n8n-callback",
    });
    if (!verifyResult.valid) {
      log.warn("n8n callback verification failed.", { reason: verifyResult.reason });
      return jsonError(`Verification failed: ${verifyResult.reason}`, 401);
    }

    /* ── Parse + apply ───────────────────────────────────────── */
    const payload = callbackSchema.parse(JSON.parse(rawBody));

    await applyAdapterCallback({
      runId: payload.runId,
      status: {
        state: payload.status.state,
        startedAt: payload.status.startedAt ?? null,
        finishedAt: payload.status.finishedAt ?? null,
        steps: payload.status.steps,
      },
    });

    log.info("Callback applied.", {
      runId: payload.runId,
      state: payload.status.state,
    });

    return Response.json({ ok: true });
  } catch (error) {
    log.error("Callback handling failed.", error);
    return handleRouteError(error, "Could not process n8n callback.");
  }
}
