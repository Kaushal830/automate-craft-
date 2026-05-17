/**
 * Typed workflow error hierarchy.
 *
 * Every failure mode in the workflow generation pipeline maps to one of
 * these error classes. API routes catch the base `WorkflowError` and
 * map it to a structured HTTP response via `toApiPayload()`.
 *
 * Why typed errors instead of bare strings?
 *   - Frontend can branch on `code` (e.g. show "upgrade plan" UI for
 *     PLAN_LIMIT_EXCEEDED) without parsing free-text messages.
 *   - Logs carry stable codes — searchable, alertable.
 *   - HTTP status mapping is centralized.
 *   - Adding a new failure mode is a single class declaration.
 */

import { z } from "zod";

/* ─── Stable error code catalog ──────────────────────────────────── */

export const WORKFLOW_ERROR_CODES = [
  "WORKFLOW_SCHEMA_INVALID",
  "WORKFLOW_SANITIZATION_FAILED",
  "WORKFLOW_VALIDATION_FAILED",
  "WORKFLOW_PLAN_LIMIT_EXCEEDED",
  "WORKFLOW_INTEGRATION_UNSUPPORTED",
  "WORKFLOW_OPERATION_UNSUPPORTED",
  "WORKFLOW_GRAPH_INVALID",
  "PROVIDER_NOT_CONFIGURED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_FAILED",
  "VERSION_STORAGE_FAILED",
  "VERSION_NOT_FOUND",
  "AUTOMATION_NOT_FOUND",
] as const;

export type WorkflowErrorCode = (typeof WORKFLOW_ERROR_CODES)[number];

/* ─── Base class ─────────────────────────────────────────────────── */

export type WorkflowErrorDetails = Record<string, unknown>;

export abstract class WorkflowError extends Error {
  abstract readonly code: WorkflowErrorCode;
  abstract readonly httpStatus: number;
  readonly details: WorkflowErrorDetails;

  constructor(message: string, details: WorkflowErrorDetails = {}, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    if (cause !== undefined) {
      // Preserve original cause for log correlation.
      (this as { cause?: unknown }).cause = cause;
    }
  }

  /**
   * Serialize for HTTP response. Never includes `cause` (may contain
   * sensitive provider data).
   */
  toApiPayload() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/* ─── Schema-level failures (Zod parse) ──────────────────────────── */

export class WorkflowSchemaError extends WorkflowError {
  readonly code = "WORKFLOW_SCHEMA_INVALID" as const;
  readonly httpStatus = 422;

  static fromZodError(error: z.ZodError, contextLabel: string) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    const summary = issues[0]
      ? `${issues[0].path || "root"}: ${issues[0].message}`
      : "Schema parse failed.";
    return new WorkflowSchemaError(`${contextLabel}: ${summary}`, { issues }, error);
  }
}

/* ─── Sanitization failures (untrusted input cleanup) ────────────── */

export class WorkflowSanitizationError extends WorkflowError {
  readonly code = "WORKFLOW_SANITIZATION_FAILED" as const;
  readonly httpStatus = 400;
}

/* ─── Semantic validation failures ───────────────────────────────── */

export class WorkflowValidationError extends WorkflowError {
  readonly code: WorkflowErrorCode = "WORKFLOW_VALIDATION_FAILED";
  readonly httpStatus: number = 422;
}

export class WorkflowPlanLimitError extends WorkflowValidationError {
  override readonly code: WorkflowErrorCode = "WORKFLOW_PLAN_LIMIT_EXCEEDED";
  override readonly httpStatus: number = 403;
}

export class WorkflowIntegrationUnsupportedError extends WorkflowValidationError {
  override readonly code: WorkflowErrorCode = "WORKFLOW_INTEGRATION_UNSUPPORTED";
  override readonly httpStatus: number = 422;
}

export class WorkflowOperationUnsupportedError extends WorkflowValidationError {
  override readonly code: WorkflowErrorCode = "WORKFLOW_OPERATION_UNSUPPORTED";
  override readonly httpStatus: number = 422;
}

export class WorkflowGraphError extends WorkflowValidationError {
  override readonly code: WorkflowErrorCode = "WORKFLOW_GRAPH_INVALID";
  override readonly httpStatus: number = 422;
}

/* ─── AI provider failures ───────────────────────────────────────── */

export class ProviderNotConfiguredError extends WorkflowError {
  readonly code = "PROVIDER_NOT_CONFIGURED" as const;
  readonly httpStatus = 503;
}

export class ProviderTimeoutError extends WorkflowError {
  readonly code = "PROVIDER_TIMEOUT" as const;
  readonly httpStatus = 504;
}

export class ProviderRateLimitedError extends WorkflowError {
  readonly code = "PROVIDER_RATE_LIMITED" as const;
  readonly httpStatus = 429;
}

export class ProviderFailedError extends WorkflowError {
  readonly code = "PROVIDER_FAILED" as const;
  readonly httpStatus = 502;
}

/* ─── Storage failures ───────────────────────────────────────────── */

export class VersionStorageError extends WorkflowError {
  readonly code = "VERSION_STORAGE_FAILED" as const;
  readonly httpStatus = 500;
}

export class VersionNotFoundError extends WorkflowError {
  readonly code = "VERSION_NOT_FOUND" as const;
  readonly httpStatus = 404;
}

export class AutomationNotFoundError extends WorkflowError {
  readonly code = "AUTOMATION_NOT_FOUND" as const;
  readonly httpStatus = 404;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

export function isWorkflowError(value: unknown): value is WorkflowError {
  return value instanceof WorkflowError;
}
