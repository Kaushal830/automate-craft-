/**
 * workflow domain barrel.
 *
 * Public surface of the workflow module. Consumers should import from
 * `@/lib/workflow` rather than reaching into sub-modules.
 *
 * Re-exports:
 *   - schema/   — Zod schemas + inferred types
 *   - errors    — Typed error hierarchy
 *   - sanitization/ — AI output sanitizer
 *   - validation/   — Semantic validators
 *   - projection/   — IR ↔ legacy mappers
 *   - cost/         — Cost calculators
 */

/* ─── Schemas + types ──────────────────────────────────────────── */
export * from "./schema";

/* ─── Errors ───────────────────────────────────────────────────── */
export * from "./errors";

/* ─── Sanitization ─────────────────────────────────────────────── */
export {
  sanitizeWorkflowIR,
  sanitizeDisplayText,
  sanitizeIdentifier,
} from "./sanitization";

/* ─── Validation ───────────────────────────────────────────────── */
export {
  validateWorkflow,
  validateIntegrationCoherence,
  validateGraphIntegrity,
  validateStepOrdering,
  validatePlanLimits,
  getPlanLimits,
  allOperations,
  lookupOperation,
  operationsForIntegration,
  type ValidationOptions,
  type ValidationResult,
  type ValidationWarning,
  type PlanTier,
  type PlanLimits,
  type OperationDefinition,
} from "./validation";

/* ─── Projection ───────────────────────────────────────────────── */
export {
  projectWorkflowToLegacy,
  projectLegacyToIR,
  projectTriggerToLegacy,
} from "./projection";

/* ─── Cost ─────────────────────────────────────────────────────── */
export {
  calculateGenerationCost,
  calculateExecutionCost,
  type GenerationTier,
  type ExecutionCostBreakdown,
} from "./cost";
