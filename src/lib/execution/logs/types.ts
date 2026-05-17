/**
 * Runtime event + step execution types.
 *
 * Append-only event stream + per-step records form the basis of the
 * execution audit trail. Both are queryable by run_id and (for events)
 * by kind for metric pipelines later.
 */

import { z } from "zod";
import { STEP_EXECUTION_STATES } from "../states";

export const stepExecutionStatusSchema = z.enum(STEP_EXECUTION_STATES);
export type StepExecutionStatus = z.infer<typeof stepExecutionStatusSchema>;

export const stepExecutionRecordSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  stepId: z.string().min(1),
  status: stepExecutionStatusSchema,
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  output: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  createdAt: z.string(),
});

export type StepExecutionRecord = z.infer<typeof stepExecutionRecordSchema>;

export const runtimeEventLevelSchema = z.enum(["debug", "info", "warn", "error"]);
export type RuntimeEventLevel = z.infer<typeof runtimeEventLevelSchema>;

export const runtimeEventSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  stepId: z.string().nullable(),
  kind: z.string().min(1),
  level: runtimeEventLevelSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export type RuntimeEvent = z.infer<typeof runtimeEventSchema>;
