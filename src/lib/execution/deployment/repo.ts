/**
 * Deployment repository.
 *
 * CRUD over `deployments`. Uses the `transition_deployment_state`
 * RPC for atomic state transitions (prevents race conditions where
 * two concurrent deploys would both try to mark a row "deployed").
 */

import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import { createLogger } from "@/lib/logger";
import {
  deploymentSchema,
  type CreateDeploymentInput,
  type Deployment,
} from "./types";
import {
  isDeploymentTransitionAllowed,
  type DeploymentState,
} from "../states";

const log = createLogger("execution/deployment/repo");

/* ─── Mappers ────────────────────────────────────────────────────── */

function mapRow(row: Record<string, unknown>): Deployment {
  return deploymentSchema.parse({
    id: row.id,
    automationId: row.automation_id,
    userId: row.user_id,
    versionId: row.version_id,
    adapter: row.adapter,
    state: row.state,
    externalRef: (row.external_ref as Record<string, unknown> | null) ?? null,
    lastError: (row.last_error as string | null) ?? null,
    deployedAt: row.deployed_at ? String(row.deployed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });
}

/* ─── Create ─────────────────────────────────────────────────────── */

export async function createDeployment(
  input: CreateDeploymentInput,
): Promise<Deployment> {
  const state = input.state ?? "draft";
  log.info("Creating deployment.", {
    automationId: input.automationId,
    adapter: input.adapter,
    state,
  });

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("deployments")
      .insert({
        automation_id: input.automationId,
        user_id: input.userId,
        version_id: input.versionId,
        adapter: input.adapter,
        state,
        external_ref: input.externalRef ?? null,
      })
      .select(
        "id, automation_id, user_id, version_id, adapter, state, external_ref, last_error, deployed_at, created_at, updated_at",
      )
      .single();

    if (response.error || !response.data) {
      throw new Error(response.error?.message || "Could not create deployment.");
    }
    return mapRow(response.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    const now = new Date().toISOString();
    const created = {
      id: crypto.randomUUID(),
      automationId: input.automationId,
      userId: input.userId,
      versionId: input.versionId,
      adapter: input.adapter,
      state,
      externalRef: input.externalRef ?? null,
      lastError: null,
      deployedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    database.deployments.unshift(created);
    return mapRow({
      id: created.id,
      automation_id: created.automationId,
      user_id: created.userId,
      version_id: created.versionId,
      adapter: created.adapter,
      state: created.state,
      external_ref: created.externalRef,
      last_error: created.lastError,
      deployed_at: created.deployedAt,
      created_at: created.createdAt,
      updated_at: created.updatedAt,
    });
  });
}

/* ─── Atomic state transition ────────────────────────────────────── */

export async function transitionDeploymentState(input: {
  deploymentId: string;
  fromStates: DeploymentState[];
  toState: DeploymentState;
  externalRef?: Record<string, unknown> | null;
  lastError?: string | null;
}): Promise<boolean> {
  // Pre-check the in-process transition map; cheaper than a DB roundtrip.
  for (const fromState of input.fromStates) {
    if (!isDeploymentTransitionAllowed(fromState, input.toState)) {
      throw new Error(
        `Illegal deployment transition: ${fromState} → ${input.toState}.`,
      );
    }
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("transition_deployment_state", {
      p_deployment_id: input.deploymentId,
      p_from_states: input.fromStates,
      p_to_state: input.toState,
      p_external_ref: input.externalRef ?? null,
      p_last_error: input.lastError ?? null,
    });

    if (error) {
      log.error("transition_deployment_state RPC failed.", error);
      return false;
    }
    return Boolean(data);
  }

  let result = false;
  await updateLocalDatabase((database) => {
    const dep = database.deployments.find((d) => d.id === input.deploymentId);
    if (!dep) return null;
    if (!input.fromStates.includes(dep.state)) return null;
    dep.state = input.toState;
    if (input.externalRef !== undefined) {
      dep.externalRef = input.externalRef;
    }
    dep.lastError = input.lastError ?? null;
    if (
      (input.toState === "deployed" || input.toState === "active") &&
      !dep.deployedAt
    ) {
      dep.deployedAt = new Date().toISOString();
    }
    dep.updatedAt = new Date().toISOString();
    result = true;
    return dep;
  });
  return result;
}

/* ─── Get / list ─────────────────────────────────────────────────── */

export async function getDeploymentById(id: string): Promise<Deployment | null> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("deployments")
      .select(
        "id, automation_id, user_id, version_id, adapter, state, external_ref, last_error, deployed_at, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (response.error) throw new Error(response.error.message);
    return response.data ? mapRow(response.data as Record<string, unknown>) : null;
  }

  const database = await readLocalDatabase();
  const found = database.deployments.find((d) => d.id === id);
  return found ? mapRowFromLocal(found) : null;
}

export async function getActiveDeployment(input: {
  automationId: string;
  adapter: string;
}): Promise<Deployment | null> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("deployments")
      .select(
        "id, automation_id, user_id, version_id, adapter, state, external_ref, last_error, deployed_at, created_at, updated_at",
      )
      .eq("automation_id", input.automationId)
      .eq("adapter", input.adapter)
      .in("state", ["deployed", "active", "paused"])
      .maybeSingle();

    if (response.error) throw new Error(response.error.message);
    return response.data ? mapRow(response.data as Record<string, unknown>) : null;
  }

  const database = await readLocalDatabase();
  const found = database.deployments.find(
    (d) =>
      d.automationId === input.automationId &&
      d.adapter === input.adapter &&
      ["deployed", "active", "paused"].includes(d.state),
  );
  return found ? mapRowFromLocal(found) : null;
}

export async function listDeploymentsForAutomation(
  automationId: string,
): Promise<Deployment[]> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("deployments")
      .select(
        "id, automation_id, user_id, version_id, adapter, state, external_ref, last_error, deployed_at, created_at, updated_at",
      )
      .eq("automation_id", automationId)
      .order("created_at", { ascending: false });

    if (response.error) throw new Error(response.error.message);
    return (response.data ?? []).map((row) =>
      mapRow(row as Record<string, unknown>),
    );
  }

  const database = await readLocalDatabase();
  return database.deployments
    .filter((d) => d.automationId === automationId)
    .map(mapRowFromLocal);
}

function mapRowFromLocal(entry: {
  id: string;
  automationId: string;
  userId: string;
  versionId: string;
  adapter: string;
  state: string;
  externalRef: Record<string, unknown> | null;
  lastError: string | null;
  deployedAt: string | null;
  createdAt: string;
  updatedAt: string;
}): Deployment {
  return mapRow({
    id: entry.id,
    automation_id: entry.automationId,
    user_id: entry.userId,
    version_id: entry.versionId,
    adapter: entry.adapter,
    state: entry.state,
    external_ref: entry.externalRef,
    last_error: entry.lastError,
    deployed_at: entry.deployedAt,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  });
}
