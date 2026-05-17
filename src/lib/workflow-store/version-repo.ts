/**
 * Workflow version repository.
 *
 * CRUD over the `workflow_versions` table. Two backends:
 *   - Supabase (production): writes via service-role client.
 *   - Local store (development): in-memory JSON file.
 *
 * Maintains the "exactly one activated version per automation"
 * invariant in both backends.
 */

import {
  VersionStorageError,
  VersionNotFoundError,
  type CreateWorkflowVersionInput,
  type WorkflowVersion,
} from "@/lib/workflow";
import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import { createLogger } from "@/lib/logger";
import { mapVersionRow } from "./mappers";

const log = createLogger("workflow-store/version-repo");

/* ─── Create ─────────────────────────────────────────────────────── */

export async function createWorkflowVersion(
  input: CreateWorkflowVersionInput,
): Promise<WorkflowVersion> {
  log.info("Creating workflow version.", {
    automationId: input.automationId,
    userId: input.userId,
    source: input.source,
  });

  if (isSupabaseMode()) {
    return createInSupabase(input);
  }
  return createInLocal(input);
}

async function createInSupabase(
  input: CreateWorkflowVersionInput,
): Promise<WorkflowVersion> {
  const supabase = createSupabaseAdminClient();

  // Atomic next version_number via DB function (handles races).
  const numberResult = await supabase.rpc("next_workflow_version_number", {
    p_automation_id: input.automationId,
  });

  if (numberResult.error || typeof numberResult.data !== "number") {
    log.error("Failed to allocate version number.", numberResult.error);
    throw new VersionStorageError(
      "Could not allocate a workflow version number.",
      { automationId: input.automationId },
      numberResult.error ?? undefined,
    );
  }

  const versionNumber = numberResult.data as number;

  // Deactivate prior versions before inserting the new one as activated.
  const deactivate = await supabase
    .from("workflow_versions")
    .update({ activated: false })
    .eq("automation_id", input.automationId);

  if (deactivate.error) {
    log.error("Failed to deactivate prior versions.", deactivate.error);
    throw new VersionStorageError(
      "Could not deactivate prior workflow versions.",
      { automationId: input.automationId },
      deactivate.error,
    );
  }

  const inserted = await supabase
    .from("workflow_versions")
    .insert({
      automation_id: input.automationId,
      user_id: input.userId,
      version_number: versionNumber,
      workflow: input.workflow,
      prompt: input.prompt ?? null,
      source: input.source,
      cost: input.cost ?? 0,
      activated: true,
      metadata: input.metadata ?? {},
    })
    .select(
      "id, automation_id, user_id, version_number, workflow, prompt, source, cost, activated, metadata, created_at",
    )
    .single();

  if (inserted.error || !inserted.data) {
    log.error("Failed to insert workflow version.", inserted.error);
    throw new VersionStorageError(
      "Could not persist workflow version.",
      { automationId: input.automationId },
      inserted.error ?? undefined,
    );
  }

  return mapVersionRow(inserted.data as Record<string, unknown>);
}

async function createInLocal(
  input: CreateWorkflowVersionInput,
): Promise<WorkflowVersion> {
  return updateLocalDatabase((database) => {
    const existing = database.workflowVersions.filter(
      (v) => v.automationId === input.automationId,
    );
    const versionNumber =
      existing.reduce((max, v) => Math.max(max, v.versionNumber), 0) + 1;

    // Deactivate prior versions
    for (const v of database.workflowVersions) {
      if (v.automationId === input.automationId) v.activated = false;
    }

    const created: WorkflowVersion = {
      id: crypto.randomUUID(),
      automationId: input.automationId,
      userId: input.userId,
      versionNumber,
      workflow: input.workflow,
      prompt: input.prompt ?? null,
      source: input.source,
      cost: input.cost ?? 0,
      activated: true,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };

    database.workflowVersions.unshift(created);
    return created;
  });
}

/* ─── List ───────────────────────────────────────────────────────── */

export async function listVersionsForAutomation(
  automationId: string,
): Promise<WorkflowVersion[]> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("workflow_versions")
      .select(
        "id, automation_id, user_id, version_number, workflow, prompt, source, cost, activated, metadata, created_at",
      )
      .eq("automation_id", automationId)
      .order("version_number", { ascending: false });

    if (response.error) {
      throw new VersionStorageError(
        "Could not list workflow versions.",
        { automationId },
        response.error,
      );
    }

    return (response.data ?? []).map((row) =>
      mapVersionRow(row as Record<string, unknown>),
    );
  }

  const database = await readLocalDatabase();
  return database.workflowVersions
    .filter((v) => v.automationId === automationId)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

/* ─── Get active version ─────────────────────────────────────────── */

export async function getActiveVersion(
  automationId: string,
): Promise<WorkflowVersion | null> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("workflow_versions")
      .select(
        "id, automation_id, user_id, version_number, workflow, prompt, source, cost, activated, metadata, created_at",
      )
      .eq("automation_id", automationId)
      .eq("activated", true)
      .maybeSingle();

    if (response.error) {
      throw new VersionStorageError(
        "Could not fetch active version.",
        { automationId },
        response.error,
      );
    }

    return response.data
      ? mapVersionRow(response.data as Record<string, unknown>)
      : null;
  }

  const database = await readLocalDatabase();
  return (
    database.workflowVersions.find(
      (v) => v.automationId === automationId && v.activated,
    ) ?? null
  );
}

/* ─── Get by id ──────────────────────────────────────────────────── */

export async function getVersionById(
  versionId: string,
): Promise<WorkflowVersion> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("workflow_versions")
      .select(
        "id, automation_id, user_id, version_number, workflow, prompt, source, cost, activated, metadata, created_at",
      )
      .eq("id", versionId)
      .maybeSingle();

    if (response.error) {
      throw new VersionStorageError(
        "Could not fetch workflow version.",
        { versionId },
        response.error,
      );
    }
    if (!response.data) {
      throw new VersionNotFoundError(`Workflow version ${versionId} not found.`, {
        versionId,
      });
    }
    return mapVersionRow(response.data as Record<string, unknown>);
  }

  const database = await readLocalDatabase();
  const found = database.workflowVersions.find((v) => v.id === versionId);
  if (!found) {
    throw new VersionNotFoundError(`Workflow version ${versionId} not found.`, {
      versionId,
    });
  }
  return found;
}

/* ─── Activate (rollback) ────────────────────────────────────────── */

export async function activateVersion(versionId: string): Promise<WorkflowVersion> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const { error: rpcError } = await supabase.rpc("activate_workflow_version", {
      p_version_id: versionId,
    });
    if (rpcError) {
      throw new VersionStorageError(
        "Could not activate workflow version.",
        { versionId },
        rpcError,
      );
    }
    return getVersionById(versionId);
  }

  const result = await updateLocalDatabase((database) => {
    const target = database.workflowVersions.find((v) => v.id === versionId);
    if (!target) return null;
    for (const v of database.workflowVersions) {
      if (v.automationId === target.automationId) v.activated = false;
    }
    target.activated = true;
    return target;
  });

  if (!result) {
    throw new VersionNotFoundError(`Workflow version ${versionId} not found.`, {
      versionId,
    });
  }
  return result;
}
