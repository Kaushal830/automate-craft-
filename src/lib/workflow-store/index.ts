/**
 * workflow-store barrel.
 *
 * Phase 1 only exposes version-repo. The existing automation-store
 * (`@/lib/automation-store`) continues to handle automation rows;
 * Phase 2 will refactor it into this directory.
 */

export {
  createWorkflowVersion,
  listVersionsForAutomation,
  getActiveVersion,
  getVersionById,
  activateVersion,
} from "./version-repo";

export { mapVersionRow } from "./mappers";

export {
  saveNewAutomationWithVersion,
  type SaveNewAutomationInput,
  type SaveNewAutomationOutcome,
} from "./save-flow";
