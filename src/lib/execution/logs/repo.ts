/**
 * Runtime logs repository.
 *
 * Append-only writes for `runtime_events` and `step_executions`. Reads
 * are scoped to `run_id` for fast retrieval per execution.
 *
 * No batching in Phase 2 — single inserts. Phase 3 can add Postgres
 * COPY-from / batch insert when volume warrants.
 */

import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import {
  runtimeEventSchema,
  stepExecutionRecordSchema,
  type RuntimeEvent,
  type RuntimeEventLevel,
  type StepExecutionRecord,
  type StepExecutionStatus,
} from "./types";

/* ─── Runtime event append ───────────────────────────────────────── */

export type AppendRuntimeEventInput = {
  runId: string;
  stepId?: string | null;
  kind: string;
  level: RuntimeEventLevel;
  message: string;
  details?: Record<string, unknown>;
};

export async function appendRuntimeEvent(
  input: AppendRuntimeEventInput,
): Promise<RuntimeEvent> {
  const now = new Date().toISOString();

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("runtime_events")
      .insert({
        run_id: input.runId,
        step_id: input.stepId ?? null,
        kind: input.kind,
        level: input.level,
        message: input.message,
        details: input.details ?? {},
      })
      .select("id, run_id, step_id, kind, level, message, details, created_at")
      .single();

    if (response.error || !response.data) {
      throw new Error(response.error?.message || "Could not append runtime event.");
    }
    const row = response.data as Record<string, unknown>;
    return runtimeEventSchema.parse({
      id: row.id,
      runId: row.run_id,
      stepId: row.step_id ?? null,
      kind: row.kind,
      level: row.level,
      message: row.message,
      details: row.details ?? {},
      createdAt: row.created_at,
    });
  }

  return updateLocalDatabase((database) => {
    const created: RuntimeEvent = {
      id: crypto.randomUUID(),
      runId: input.runId,
      stepId: input.stepId ?? null,
      kind: input.kind,
      level: input.level,
      message: input.message,
      details: input.details ?? {},
      createdAt: now,
    };
    database.runtimeEvents.push({
      id: created.id,
      runId: created.runId,
      stepId: created.stepId,
      kind: created.kind,
      level: created.level,
      message: created.message,
      details: created.details,
      createdAt: created.createdAt,
    });
    return created;
  });
}

export async function listRuntimeEventsForRun(runId: string): Promise<RuntimeEvent[]> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("runtime_events")
      .select("id, run_id, step_id, kind, level, message, details, created_at")
      .eq("run_id", runId)
      .order("created_at", { ascending: true });

    if (response.error) throw new Error(response.error.message);
    return (response.data ?? []).map((row: Record<string, unknown>) =>
      runtimeEventSchema.parse({
        id: row.id,
        runId: row.run_id,
        stepId: row.step_id ?? null,
        kind: row.kind,
        level: row.level,
        message: row.message,
        details: row.details ?? {},
        createdAt: row.created_at,
      }),
    );
  }

  const database = await readLocalDatabase();
  return database.runtimeEvents
    .filter((e) => e.runId === runId)
    .map((entry) =>
      runtimeEventSchema.parse({
        id: entry.id,
        runId: entry.runId,
        stepId: entry.stepId,
        kind: entry.kind,
        level: entry.level,
        message: entry.message,
        details: entry.details,
        createdAt: entry.createdAt,
      }),
    );
}

/* ─── Step execution upsert ──────────────────────────────────────── */

export type UpsertStepExecutionInput = {
  runId: string;
  stepId: string;
  status: StepExecutionStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  durationMs?: number | null;
};

export async function upsertStepExecution(
  input: UpsertStepExecutionInput,
): Promise<StepExecutionRecord> {
  const now = new Date().toISOString();

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    // Idempotent: try update first, insert if no row exists.
    const update = await supabase
      .from("step_executions")
      .update({
        status: input.status,
        ...(input.startedAt !== undefined ? { started_at: input.startedAt } : {}),
        ...(input.finishedAt !== undefined ? { finished_at: input.finishedAt } : {}),
        ...(input.output !== undefined ? { output: input.output } : {}),
        ...(input.error !== undefined ? { error: input.error } : {}),
        ...(input.durationMs !== undefined ? { duration_ms: input.durationMs } : {}),
      })
      .eq("run_id", input.runId)
      .eq("step_id", input.stepId)
      .select(
        "id, run_id, step_id, status, started_at, finished_at, output, error, duration_ms, created_at",
      )
      .maybeSingle();

    if (update.error) throw new Error(update.error.message);
    if (update.data) {
      return mapStepRow(update.data as Record<string, unknown>);
    }

    const insert = await supabase
      .from("step_executions")
      .insert({
        run_id: input.runId,
        step_id: input.stepId,
        status: input.status,
        started_at: input.startedAt ?? null,
        finished_at: input.finishedAt ?? null,
        output: input.output ?? null,
        error: input.error ?? null,
        duration_ms: input.durationMs ?? null,
      })
      .select(
        "id, run_id, step_id, status, started_at, finished_at, output, error, duration_ms, created_at",
      )
      .single();

    if (insert.error || !insert.data) {
      throw new Error(insert.error?.message || "Could not upsert step execution.");
    }
    return mapStepRow(insert.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    let entry = database.stepExecutions.find(
      (e) => e.runId === input.runId && e.stepId === input.stepId,
    );
    if (!entry) {
      entry = {
        id: crypto.randomUUID(),
        runId: input.runId,
        stepId: input.stepId,
        status: input.status,
        startedAt: input.startedAt ?? null,
        finishedAt: input.finishedAt ?? null,
        output: input.output ?? null,
        error: input.error ?? null,
        durationMs: input.durationMs ?? null,
        createdAt: now,
      };
      database.stepExecutions.push(entry);
    } else {
      entry.status = input.status;
      if (input.startedAt !== undefined) entry.startedAt = input.startedAt;
      if (input.finishedAt !== undefined) entry.finishedAt = input.finishedAt;
      if (input.output !== undefined) entry.output = input.output;
      if (input.error !== undefined) entry.error = input.error;
      if (input.durationMs !== undefined) entry.durationMs = input.durationMs;
    }
    return stepExecutionRecordSchema.parse({
      id: entry.id,
      runId: entry.runId,
      stepId: entry.stepId,
      status: entry.status,
      startedAt: entry.startedAt,
      finishedAt: entry.finishedAt,
      output: entry.output,
      error: entry.error,
      durationMs: entry.durationMs,
      createdAt: entry.createdAt,
    });
  });
}

export async function listStepExecutionsForRun(
  runId: string,
): Promise<StepExecutionRecord[]> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("step_executions")
      .select(
        "id, run_id, step_id, status, started_at, finished_at, output, error, duration_ms, created_at",
      )
      .eq("run_id", runId)
      .order("created_at", { ascending: true });

    if (response.error) throw new Error(response.error.message);
    return (response.data ?? []).map((row) =>
      mapStepRow(row as Record<string, unknown>),
    );
  }

  const database = await readLocalDatabase();
  return database.stepExecutions
    .filter((e) => e.runId === runId)
    .map((entry) =>
      stepExecutionRecordSchema.parse({
        id: entry.id,
        runId: entry.runId,
        stepId: entry.stepId,
        status: entry.status,
        startedAt: entry.startedAt,
        finishedAt: entry.finishedAt,
        output: entry.output,
        error: entry.error,
        durationMs: entry.durationMs,
        createdAt: entry.createdAt,
      }),
    );
}

function mapStepRow(row: Record<string, unknown>): StepExecutionRecord {
  return stepExecutionRecordSchema.parse({
    id: row.id,
    runId: row.run_id,
    stepId: row.step_id,
    status: row.status,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    output: row.output ?? null,
    error: row.error ?? null,
    durationMs: row.duration_ms ?? null,
    createdAt: row.created_at,
  });
}
