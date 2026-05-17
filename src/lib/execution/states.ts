/**
 * Execution state machines.
 *
 * Two state machines live here:
 *   - DeploymentState: lifecycle of a workflow's deployable form for one adapter.
 *   - RunState:        lifecycle of a single execution.
 *
 * Pure functions only. Storage is handled by the corresponding repos.
 *
 * State transitions are enumerated explicitly so the type system can
 * verify exhaustiveness when reviewing future transitions.
 */

/* ─── Deployment ────────────────────────────────────────────────── */

export const DEPLOYMENT_STATES = [
  "draft",
  "validated",
  "deployable",
  "deployed",
  "active",
  "paused",
  "failed",
] as const;

export type DeploymentState = (typeof DEPLOYMENT_STATES)[number];

/**
 * Allowed transitions per state. Used by `assertDeploymentTransition()`
 * AND mirrored in the Postgres CHECK constraint via the transition RPC.
 */
const DEPLOYMENT_TRANSITIONS: Record<DeploymentState, readonly DeploymentState[]> = {
  draft: ["validated", "failed"],
  validated: ["deployable", "failed"],
  deployable: ["deployed", "failed"],
  deployed: ["active", "failed"],
  active: ["paused", "failed"],
  paused: ["active", "failed"],
  failed: [],
};

export function isDeploymentTransitionAllowed(
  from: DeploymentState,
  to: DeploymentState,
): boolean {
  return DEPLOYMENT_TRANSITIONS[from].includes(to);
}

/* ─── Run ───────────────────────────────────────────────────────── */

export const RUN_STATES = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const;

export type RunState = (typeof RUN_STATES)[number];

const RUN_TRANSITIONS: Record<RunState, readonly RunState[]> = {
  pending: ["running", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

export function isRunTransitionAllowed(from: RunState, to: RunState): boolean {
  return RUN_TRANSITIONS[from].includes(to);
}

/* ─── Step execution ────────────────────────────────────────────── */

export const STEP_EXECUTION_STATES = [
  "pending",
  "running",
  "success",
  "error",
  "skipped",
] as const;

export type StepExecutionState = (typeof STEP_EXECUTION_STATES)[number];
