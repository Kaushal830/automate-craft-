/**
 * workflow/validation barrel.
 */

export {
  allOperations,
  lookupOperation,
  operationsForIntegration,
  type OperationDefinition,
} from "./operation-catalog";

export {
  validateIntegrationCoherence,
  type CoherenceResult,
  type CoherenceWarning,
} from "./integration-coherence";

export {
  validateGraphIntegrity,
  type GraphIntegrityResult,
} from "./graph-integrity";

export { validateStepOrdering } from "./step-ordering";

export {
  validatePlanLimits,
  getPlanLimits,
  type PlanTier,
  type PlanLimits,
} from "./plan-limits";

export {
  validateWorkflow,
  type ValidationOptions,
  type ValidationResult,
  type ValidationWarning,
} from "./workflow-validator";
