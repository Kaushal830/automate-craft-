/**
 * Execution adapter interface (Phase 2 scaffold).
 *
 * Adapters convert a platform-neutral `WorkflowIR` into an execution
 * engine's native representation, deploy it, trigger runs, and return
 * status. The IR has zero adapter vocabulary — adapters own the
 * impedance mismatch with their target executor.
 *
 * Adapters to implement in Phase 2 / later:
 *   - n8n        (`adapters/n8n/`)
 *   - temporal   (`adapters/temporal/`)  — future
 *   - inngest    (`adapters/inngest/`)   — future
 *
 * NOTHING in this file is implemented in Phase 1. The interface exists
 * now so the workflow IR can be designed against it from day one.
 */

import type { WorkflowIR } from "@/lib/workflow";
import type { AdapterCapabilities } from "./capabilities";

/** Encrypted, integration-keyed credentials resolved at deploy time. */
export type Credentials = Record<
  string,
  { type: string; data: Record<string, unknown> }
>;

/** Opaque reference to a deployed workflow. */
export type DeploymentRef = {
  adapter: string;
  externalId: string;
  metadata?: Record<string, unknown>;
};

/** Opaque reference to a single run. */
export type RunRef = {
  deploymentRef: DeploymentRef;
  runId: string;
};

export type StepStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

export type RunStatus = {
  state: "queued" | "running" | "success" | "error";
  startedAt: string | null;
  finishedAt: string | null;
  steps: Array<{
    id: string;
    status: StepStatus;
    output?: unknown;
    error?: string;
  }>;
};

/**
 * Compiled, adapter-specific representation of a workflow. Pure data —
 * no side effects to produce it. The `graph` field is opaque to the
 * orchestrator; only the adapter that produced it knows its shape.
 */
export type ExecutionPlan = {
  adapter: string;
  graph: unknown;
  metadata: Record<string, unknown>;
};

/**
 * The execution adapter contract.
 *
 * Concrete adapters live under `src/lib/adapters/<name>/`. Each adapter
 * declares its `capabilities` (see `./capabilities.ts`) which the
 * pre-deploy validator uses to reject incompatible workflows before
 * any compile() call.
 *
 * Lifecycle methods follow the deployment state machine:
 *   compile  → pure IR → ExecutionPlan
 *   deploy   → ExecutionPlan + credentials → DeploymentRef
 *   pause    → DeploymentRef → suspended in executor
 *   resume   → DeploymentRef → re-activated
 *   execute  → DeploymentRef + payload → RunRef
 *   pollStatus → RunRef → RunStatus (used as fallback when callbacks miss)
 *   destroy  → DeploymentRef → tear down (on automation delete)
 */
export interface ExecutionAdapter {
  readonly name: string;

  /** Capability declaration. Pre-deploy validator checks IR against this. */
  readonly capabilities: AdapterCapabilities;

  /** Whether the adapter is configured (env vars present, client reachable). */
  isReady(): boolean;

  /** Pure function: lower IR → adapter-specific plan. */
  compile(workflow: WorkflowIR): ExecutionPlan;

  /** Push the compiled plan to the executor and return a deployment handle. */
  deploy(plan: ExecutionPlan, credentials: Credentials): Promise<DeploymentRef>;

  /** Suspend a deployed workflow without tearing it down. */
  pause(deploymentRef: DeploymentRef): Promise<void>;

  /** Re-activate a paused deployment. */
  resume(deploymentRef: DeploymentRef): Promise<void>;

  /** Trigger a single run with the given payload. */
  execute(deploymentRef: DeploymentRef, payload: unknown): Promise<RunRef>;

  /** Fetch current status of a run. Used as a fallback when webhook callbacks miss. */
  pollStatus(runRef: RunRef): Promise<RunStatus>;

  /** Tear down a deployment when an automation is deleted or replaced. */
  destroy(deploymentRef: DeploymentRef): Promise<void>;
}
