/**
 * Structured logger with tagged sources + threadable execution context.
 *
 * Usage:
 *   const log = createLogger("execution/runtime");           // base
 *   log.info("Starting run.", { automationId });
 *
 *   const runLog = log.withContext({ runId, automationId, provider: "n8n" });
 *   runLog.info("Step started.", { stepId });
 *   // → output: [execution/runtime] {"runId":"...","automationId":"...","provider":"n8n"} Step started. {stepId:...}
 *
 * Context fields are emitted as the first structured argument so log
 * shippers (Datadog/Loki/etc.) can index them as attributes. Adding new
 * trace fields is a non-breaking extension to the LogContext type.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): LogLevel {
  const envLevel = (process.env.LOG_LEVEL || "").toLowerCase();

  if (envLevel in levelPriority) {
    return envLevel as LogLevel;
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[getConfiguredLevel()];
}

/**
 * Trace context attached to every log line on a derived logger.
 *
 * Extend cautiously — these field names become public attributes for
 * downstream log indexers. Adding optional fields is non-breaking.
 */
export type LogContext = {
  workflowId?: string;
  automationId?: string;
  versionId?: string;
  runId?: string;
  /** Adapter-side execution identifier (e.g. n8n executionId). */
  executionId?: string;
  /** Adapter / provider name (e.g. "n8n", "openai"). */
  provider?: string;
  /** User identifier — emit cautiously, omit in audit-restricted environments. */
  userId?: string;
  /** Free-form additions. */
  [key: string]: string | number | boolean | null | undefined;
};

function formatArgs(tag: string, context: LogContext | null, args: unknown[]): unknown[] {
  if (context && hasAnyField(context)) {
    return [`[${tag}]`, context, ...args];
  }
  return [`[${tag}]`, ...args];
}

function hasAnyField(context: LogContext): boolean {
  for (const key of Object.keys(context)) {
    if (context[key] !== undefined && context[key] !== null) return true;
  }
  return false;
}

function buildLogger(tag: string, context: LogContext | null): TaggedLogger {
  return {
    debug(...args: unknown[]) {
      if (shouldLog("debug")) {
        console.debug(...formatArgs(tag, context, args));
      }
    },
    info(...args: unknown[]) {
      if (shouldLog("info")) {
        console.info(...formatArgs(tag, context, args));
      }
    },
    warn(...args: unknown[]) {
      if (shouldLog("warn")) {
        console.warn(...formatArgs(tag, context, args));
      }
    },
    error(...args: unknown[]) {
      if (shouldLog("error")) {
        console.error(...formatArgs(tag, context, args));
      }
    },
    /**
     * Returns a NEW logger that emits the same tag plus merged context.
     * Original logger is untouched (immutable derivation).
     */
    withContext(extra: LogContext): TaggedLogger {
      const merged: LogContext = { ...(context ?? {}), ...extra };
      return buildLogger(tag, merged);
    },
  };
}

export type TaggedLogger = {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  withContext(extra: LogContext): TaggedLogger;
};

export function createLogger(tag: string): TaggedLogger {
  return buildLogger(tag, null);
}
