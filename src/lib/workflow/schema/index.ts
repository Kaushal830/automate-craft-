/**
 * workflow/schema barrel.
 *
 * Public surface of the workflow schema module. All Zod schemas and
 * their inferred TypeScript types are re-exported from here.
 *
 * Consumers import from `@/lib/workflow/schema` rather than reaching
 * into individual files. The internal file layout is an implementation
 * detail.
 */

/* ─── Integrations ─────────────────────────────────────────────── */
export {
  SUPPORTED_INTEGRATIONS,
  integrationSchema,
  isSupportedIntegration,
  type SupportedIntegration,
} from "./integration";

/* ─── Parameter references ─────────────────────────────────────── */
export {
  paramRefSchema,
  stepParamsSchema,
  literal,
  fromTrigger,
  fromStep,
  template,
  secret,
  type ParamRef,
  type StepParams,
} from "./param";

/* ─── Triggers ─────────────────────────────────────────────────── */
export {
  triggerSchema,
  TRIGGER_KINDS,
  type Trigger,
  type TriggerKind,
} from "./trigger";

/* ─── Steps ────────────────────────────────────────────────────── */
export {
  stepSchema,
  stepKindSchema,
  stepErrorPolicySchema,
  STEP_KINDS,
  STEP_ERROR_POLICIES,
  type Step,
  type StepKind,
  type StepErrorPolicy,
} from "./step";

/* ─── Setup fields ─────────────────────────────────────────────── */
export {
  setupFieldSchema,
  setupFieldsSchema,
  fieldTypeSchema,
  FIELD_TYPES,
  type SetupField,
  type SetupFields,
  type FieldType,
} from "./field";

/* ─── Top-level workflow IR ────────────────────────────────────── */
export {
  workflowIRSchema,
  workflowStatusSchema,
  WORKFLOW_SCHEMA_VERSION,
  type WorkflowIR,
  type WorkflowStatus,
} from "./workflow";

/* ─── Versions ─────────────────────────────────────────────────── */
export {
  workflowVersionSchema,
  versionSourceSchema,
  createWorkflowVersionInputSchema,
  VERSION_SOURCES,
  type WorkflowVersion,
  type VersionSource,
  type CreateWorkflowVersionInput,
} from "./version";
