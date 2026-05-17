/**
 * Runtime orchestrator.
 *
 * Single entry point for executing a workflow run end-to-end.
 *
 *   buildExecutionContext()
 *     → automation_runs row (status="running")
 *     → adapter.execute(deploymentRef, payload) → RunRef
 *     → store RunRef on run row
 *     → kickoff async polling fallback (if callbacks miss)
 *
 * Phase 2 uses fire-and-forget async polling. Phase 3 swaps to a
 * proper queue. The public API stays stable.
 */

import { createAutomationRun, updateAutomationRun } from "@/lib/automation-store";
import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getAdapter, type AdapterName } from "@/lib/adapters";
import { createLogger, type TaggedLogger } from "@/lib/logger";
import {
  buildExecutionContext,
  type BuildContextInput,
  type ExecutionContext,
} from "./context-builder";
import {
  appendRuntimeEvent,
  upsertStepExecution,
} from "@/lib/execution/logs";
import { calculateExecutionCost } from "@/lib/workflow";
import { refundRunCredits, reserveRunCredits } from "@/lib/execution/credits";
import { publish, runChannel } from "@/lib/realtime";
import type { RunStatus, RunRef } from "@/lib/adapters";

const log = createLogger("execution/runtime/orchestrator");

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 30; // ~2 minutes total — webhook callback should arrive far sooner.

export type StartRunInput = BuildContextInput & {
  /**
   * When true, the orchestrator handles credit reservation + refund
   * on adapter failure. Default false: the caller (webhook handler,
   * run-automation route) has already deducted credits.
   */
  manageCredits?: boolean;
};

export type StartRunOutcome = {
  runId: string;
  context: ExecutionContext;
  /** Credits charged for this run (after refund logic, if any). */
  creditsCharged: number;
};

/**
 * Start a run. Creates the run row, kicks off the adapter, and
 * fires-and-forgets a polling fallback. Returns the run id immediately
 * so the caller (API route / webhook handler) can respond with 200
 * fast.
 */
export async function startRun(input: StartRunInput): Promise<StartRunOutcome> {
  const context = await buildExecutionContext(input);

  const run = await createAutomationRun({
    automationId: context.automation.id,
    userId: context.automation.userId,
    status: "running",
    logs: [],
    triggerSource: input.triggerKind === "manual" ? "manual" : "webhook",
    payload: context.payload,
  });

  const runLog: TaggedLogger = log.withContext({
    runId: run.id,
    automationId: context.automation.id,
    versionId: context.versionId,
    provider: context.adapterName,
    triggerKind: context.triggerKind,
    userId: context.automation.userId,
  });

  // Attach version + deployment + trigger linkage.
  await attachRunLinks({
    runId: run.id,
    deploymentId: context.deploymentId,
    versionId: context.versionId,
    triggerKind: context.triggerKind,
  });

  /* ── Credit reservation (optional) ──────────────────────── */
  const costBreakdown = calculateExecutionCost(context.workflow);
  let creditsCharged = 0;

  if (input.manageCredits) {
    const reservation = await reserveRunCredits({
      userId: context.automation.userId,
      amount: costBreakdown.total,
      referenceId: run.id,
      description: `Run ${run.id} (${costBreakdown.total} credits)`,
    });
    if (!reservation.reserved) {
      runLog.warn("Credit reservation failed — aborting run.");
      await markRunFailed(run.id, "Insufficient credits.");
      throw new Error("Insufficient credits to start run.");
    }
    creditsCharged = reservation.amount;
  }

  await appendRuntimeEvent({
    runId: run.id,
    kind: "run.started",
    level: "info",
    message: `Run started via ${context.triggerKind}.`,
    details: {
      automationId: context.automation.id,
      adapter: context.adapterName,
      versionId: context.versionId,
      estimatedCost: costBreakdown.total,
    },
  });

  publish({
    channel: runChannel(run.id),
    kind: "run.started",
    payload: {
      runId: run.id,
      automationId: context.automation.id,
      estimatedCost: costBreakdown.total,
      triggerKind: context.triggerKind,
    },
  });

  runLog.info("Run started.", { estimatedCost: costBreakdown.total });

  await appendRuntimeEvent({
    runId: run.id,
    kind: "trigger.received",
    level: "debug",
    message: `Trigger payload received.`,
    details: { triggerKind: context.triggerKind, payloadKeys: Object.keys(context.payload) },
  });

  // Mark every IR step as pending.
  for (const step of context.workflow.steps) {
    await upsertStepExecution({
      runId: run.id,
      stepId: step.id,
      status: "pending",
    });
  }

  const adapter = getAdapter(context.adapterName);

  let runRef: RunRef;
  try {
    runRef = await adapter.execute(context.deploymentRef, context.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Adapter execute failed.";
    runLog.error("Adapter execute failed.", { error: message });
    await markRunFailed(run.id, message);

    // Refund credits if we reserved them — adapter never charged the user
    // for work it didn't perform.
    if (input.manageCredits && creditsCharged > 0) {
      await refundRunCredits({
        userId: context.automation.userId,
        amount: creditsCharged,
        referenceId: run.id,
        description: `Refund for failed run ${run.id}`,
      });
      creditsCharged = 0;
    }
    throw error;
  }

  await persistAdapterRunRef(run.id, runRef);

  // Fire-and-forget poll fallback. n8n callback flips the run state
  // earlier; this is the safety net.
  schedulePollingFallback({
    runId: run.id,
    runRef,
    adapterName: context.adapterName,
  });

  return { runId: run.id, context, creditsCharged };
}

/* ─── Callback ingestion ─────────────────────────────────────────── */

export type CallbackInput = {
  runId: string;
  status: RunStatus;
};

/**
 * Apply an n8n webhook callback (or any future adapter callback) to
 * the run + step records. Idempotent — repeated callbacks for the
 * same run produce the same final state.
 */
export async function applyAdapterCallback(input: CallbackInput): Promise<void> {
  await appendRuntimeEvent({
    runId: input.runId,
    kind: "callback.received",
    level: "info",
    message: `Adapter callback received: ${input.status.state}.`,
    details: { state: input.status.state, stepCount: input.status.steps.length },
  });

  for (const step of input.status.steps) {
    await upsertStepExecution({
      runId: input.runId,
      stepId: step.id,
      status: step.status,
      finishedAt: new Date().toISOString(),
      output: (step.output as Record<string, unknown> | undefined) ?? null,
      error: step.error ?? null,
    });
    const kind = step.status === "error" ? "step.failed" : "step.succeeded";
    await appendRuntimeEvent({
      runId: input.runId,
      stepId: step.id,
      kind,
      level: step.status === "error" ? "error" : "info",
      message: `Step ${step.id} ${step.status}.`,
      details: step.error ? { error: step.error } : {},
    });
    publish({
      channel: runChannel(input.runId),
      kind,
      payload: { runId: input.runId, stepId: step.id, status: step.status },
    });
  }

  if (input.status.state === "success") {
    await markRunSucceeded(input.runId);
  } else if (input.status.state === "error") {
    await markRunFailed(input.runId, "Adapter reported run failure.");
  }
}

/* ─── Polling fallback ───────────────────────────────────────────── */

function schedulePollingFallback(input: {
  runId: string;
  runRef: RunRef;
  adapterName: AdapterName;
}): void {
  // Phase 2: Node setTimeout in-process. Phase 3 will swap to BullMQ
  // delayed jobs / external scheduler. The public surface stays the
  // same (orchestrator schedules; runtime executes).
  void (async () => {
    const adapter = getAdapter(input.adapterName);
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);
      try {
        const status = await adapter.pollStatus(input.runRef);
        if (status.state === "success" || status.state === "error") {
          await applyAdapterCallback({ runId: input.runId, status });
          await appendRuntimeEvent({
            runId: input.runId,
            kind: "poll.completed",
            level: "info",
            message: `Polled adapter; final state: ${status.state}.`,
            details: { attempts: attempt + 1 },
          });
          return;
        }
      } catch (error) {
        log.warn("Poll attempt failed.", { runId: input.runId, attempt, error });
      }
    }
  })();
}

/* ─── Helpers ────────────────────────────────────────────────────── */

async function attachRunLinks(input: {
  runId: string;
  deploymentId: string;
  versionId: string;
  triggerKind: string;
}): Promise<void> {
  if (!isSupabaseMode()) return; // local-store mode skips linkage columns.
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("automation_runs")
    .update({
      deployment_id: input.deploymentId,
      version_id: input.versionId,
      trigger_kind: input.triggerKind,
    })
    .eq("id", input.runId);
}

async function persistAdapterRunRef(runId: string, runRef: RunRef): Promise<void> {
  // Stash externalId on the run so callback handlers can correlate.
  if (!isSupabaseMode()) return;
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("automation_runs")
    .update({
      result: { adapterRunId: runRef.runId, deploymentRef: runRef.deploymentRef },
    })
    .eq("id", runId);
}

async function markRunSucceeded(runId: string): Promise<void> {
  await updateAutomationRun(runId, {
    status: "success",
    finishedAt: new Date().toISOString(),
  });
  await appendRuntimeEvent({
    runId,
    kind: "run.succeeded",
    level: "info",
    message: "Run completed successfully.",
  });
  publish({
    channel: runChannel(runId),
    kind: "run.succeeded",
    payload: { runId },
  });
}

async function markRunFailed(runId: string, message: string): Promise<void> {
  await updateAutomationRun(runId, {
    status: "error",
    errorMessage: message,
    finishedAt: new Date().toISOString(),
  });
  await appendRuntimeEvent({
    runId,
    kind: "run.failed",
    level: "error",
    message,
  });
  publish({
    channel: runChannel(runId),
    kind: "run.failed",
    payload: { runId, error: message },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
