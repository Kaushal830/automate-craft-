/**
 * Save flow — composes automation row creation/update + workflow
 * version row creation in a single conceptual operation.
 *
 * Two flows:
 *
 *   saveNewAutomationWithVersion()
 *     - Create the automation row (legacy + IR dual-write).
 *     - Create the first workflow_versions row (activated=true).
 *     - Patch automation.current_version_id.
 *
 *   saveNewVersionForAutomation()
 *     - Create a new workflow_versions row (deactivates prior, activates new).
 *     - Patch automation row's IR + current_version_id.
 *
 * Phase 1 cannot use a Postgres transaction here because the automation
 * row CRUD lives in `automation-store.ts` which uses single-statement
 * inserts. The flow is best-effort sequential — each step is
 * idempotent on its own. Phase 2 will move both into a single SQL
 * function for atomic writes.
 */

import { createAutomation } from "@/lib/automation-store";
import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { updateLocalDatabase } from "@/lib/local-store";
import { createLogger } from "@/lib/logger";
import {
  projectWorkflowToLegacy,
  type VersionSource,
  type WorkflowIR,
  type WorkflowVersion,
} from "@/lib/workflow";
import type {
  AutomationRecord,
  AutomationStatus,
  ConnectionStatus,
} from "@/lib/automation";
import { createWorkflowVersion } from "./version-repo";

const log = createLogger("workflow-store/save-flow");

export type SaveNewAutomationInput = {
  userId: string;
  ir: WorkflowIR;
  formInputs: Record<string, string>;
  integrationStatus: Record<string, ConnectionStatus>;
  status?: AutomationStatus;
  prompt: string | null;
  source: VersionSource;
  cost: number;
  metadata?: Record<string, unknown>;
};

export type SaveNewAutomationOutcome = {
  automation: AutomationRecord;
  version: WorkflowVersion;
};

/**
 * Persist a brand-new automation with its initial workflow version.
 */
export async function saveNewAutomationWithVersion(
  input: SaveNewAutomationInput,
): Promise<SaveNewAutomationOutcome> {
  // 1. Project IR → legacy for the existing automation-store contract.
  const legacyWorkflow = projectWorkflowToLegacy(input.ir);

  // 2. Create the automation row.
  const automation = await createAutomation({
    userId: input.userId,
    workflow: legacyWorkflow,
    formInputs: input.formInputs,
    integrationStatus: input.integrationStatus,
    status: input.status ?? "active",
  });

  // 3. Create the first workflow_versions row.
  const version = await createWorkflowVersion({
    automationId: automation.id,
    userId: input.userId,
    workflow: input.ir,
    prompt: input.prompt ?? null,
    source: input.source,
    cost: input.cost,
    metadata: input.metadata ?? {},
  });

  // 4. Attach the version to the automation row (sets current_version_id + ir).
  await attachActiveVersion(automation.id, input.ir, version.id, input.userId);

  return { automation, version };
}

/**
 * Side-effect: write `ir` JSONB column + `current_version_id` pointer
 * on the automation row. Defensive — the columns are nullable, so a
 * failure here doesn't corrupt the legacy `workflow` column. We log
 * and continue.
 */
async function attachActiveVersion(
  automationId: string,
  ir: WorkflowIR,
  versionId: string,
  userId: string,
): Promise<void> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("automations")
      .update({
        ir,
        current_version_id: versionId,
      })
      .eq("id", automationId)
      .eq("user_id", userId);

    if (response.error) {
      log.warn(
        "Could not attach version pointer to automation row — IR + version are still safely stored.",
        response.error,
      );
    }
    return;
  }

  await updateLocalDatabase((database) => {
    const automation = database.automations.find(
      (a) => a.id === automationId && a.userId === userId,
    );
    if (!automation) return null;
    // Cast through unknown for the dual-write extension fields.
    (automation as unknown as Record<string, unknown>).ir = ir;
    (automation as unknown as Record<string, unknown>).currentVersionId = versionId;
    return automation;
  });
}

