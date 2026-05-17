/**
 * execution/runtime barrel.
 */

export {
  buildExecutionContext,
  type BuildContextInput,
  type ExecutionContext,
  type TriggerKindLabel,
} from "./context-builder";

export {
  startRun,
  applyAdapterCallback,
  type StartRunInput,
  type StartRunOutcome,
  type CallbackInput,
} from "./orchestrator";
