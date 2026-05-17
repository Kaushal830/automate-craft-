/**
 * execution/deployment barrel.
 */

export type {
  Deployment,
  CreateDeploymentInput,
} from "./types";

export {
  createDeployment,
  transitionDeploymentState,
  getDeploymentById,
  getActiveDeployment,
  listDeploymentsForAutomation,
} from "./repo";

export {
  preDeployValidate,
  type PreDeployIssue,
  type PreDeployResult,
  type PreDeployInput,
} from "./pre-deploy-validator";

export {
  deployAutomation,
  pauseDeployment,
  resumeDeployment,
  destroyDeployment,
  type DeployInput,
  type DeployOutcome,
} from "./service";
