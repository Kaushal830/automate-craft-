/**
 * adapters barrel.
 */

export type {
  Credentials,
  DeploymentRef,
  ExecutionAdapter,
  ExecutionPlan,
  RunRef,
  RunStatus,
  StepStatus,
} from "./types";

export {
  checkAdapterCompatibility,
  type AdapterCapabilities,
  type CompatibilityResult,
  type ParamSourceKind,
} from "./capabilities";

export {
  getDefaultAdapter,
  getAdapter,
  type AdapterName,
} from "./registry";
