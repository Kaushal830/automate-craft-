/**
 * Connection repository.
 *
 * CRUD over the new `connections` table (Phase 2). The legacy
 * `connected_integrations` table remains untouched for backward
 * compatibility; Phase 3+ will migrate any remaining reads to this
 * repo.
 */

import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import {
  connectionSchema,
  connectionStatusSchema,
  type Connection,
  type CreateConnectionInput,
  type UpdateConnectionInput,
} from "./types";
import { integrationSchema } from "@/lib/workflow";

function mapRow(row: Record<string, unknown>): Connection {
  return connectionSchema.parse({
    id: row.id,
    userId: row.user_id,
    integration: integrationSchema.parse(row.integration),
    status: connectionStatusSchema.parse(row.status),
    displayName: row.display_name ?? null,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });
}

/* ─── Upsert ─────────────────────────────────────────────────────── */

export async function upsertConnection(
  input: CreateConnectionInput,
): Promise<Connection> {
  const status = input.status ?? "connected";
  const now = new Date().toISOString();

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("connections")
      .upsert(
        {
          user_id: input.userId,
          integration: input.integration,
          status,
          display_name: input.displayName ?? null,
          scopes: input.scopes ?? [],
          metadata: input.metadata ?? {},
          expires_at: input.expiresAt ?? null,
          updated_at: now,
        },
        { onConflict: "user_id,integration" },
      )
      .select(
        "id, user_id, integration, status, display_name, scopes, metadata, expires_at, created_at, updated_at",
      )
      .single();

    if (response.error || !response.data) {
      throw new Error(response.error?.message || "Could not save connection.");
    }
    return mapRow(response.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    const existing = database.connectionsV2.find(
      (entry) =>
        entry.userId === input.userId &&
        entry.integration === input.integration,
    );
    if (existing) {
      existing.status = status;
      existing.displayName = input.displayName ?? existing.displayName;
      existing.scopes = input.scopes ?? existing.scopes;
      existing.metadata = input.metadata ?? existing.metadata;
      existing.expiresAt = input.expiresAt ?? existing.expiresAt;
      existing.updatedAt = now;
      return mapRowFromLocal(existing);
    }

    const created = {
      id: crypto.randomUUID(),
      userId: input.userId,
      integration: input.integration,
      status,
      displayName: input.displayName ?? null,
      scopes: input.scopes ?? [],
      metadata: input.metadata ?? {},
      expiresAt: input.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    database.connectionsV2.push(created);
    return mapRowFromLocal(created);
  });
}

/* ─── Get ────────────────────────────────────────────────────────── */

export async function getConnection(
  userId: string,
  integration: string,
): Promise<Connection | null> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("connections")
      .select(
        "id, user_id, integration, status, display_name, scopes, metadata, expires_at, created_at, updated_at",
      )
      .eq("user_id", userId)
      .eq("integration", integration)
      .maybeSingle();

    if (response.error) throw new Error(response.error.message);
    return response.data ? mapRow(response.data as Record<string, unknown>) : null;
  }

  const database = await readLocalDatabase();
  const found = database.connectionsV2.find(
    (entry) => entry.userId === userId && entry.integration === integration,
  );
  return found ? mapRowFromLocal(found) : null;
}

/* ─── List ───────────────────────────────────────────────────────── */

export async function listConnectionsForUser(userId: string): Promise<Connection[]> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("connections")
      .select(
        "id, user_id, integration, status, display_name, scopes, metadata, expires_at, created_at, updated_at",
      )
      .eq("user_id", userId);

    if (response.error) throw new Error(response.error.message);
    return (response.data ?? []).map((row) =>
      mapRow(row as Record<string, unknown>),
    );
  }

  const database = await readLocalDatabase();
  return database.connectionsV2
    .filter((entry) => entry.userId === userId)
    .map(mapRowFromLocal);
}

/* ─── Update ─────────────────────────────────────────────────────── */

export async function updateConnection(
  userId: string,
  integration: string,
  patch: UpdateConnectionInput,
): Promise<Connection | null> {
  const now = new Date().toISOString();
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("connections")
      .update({
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
        ...(patch.scopes ? { scopes: patch.scopes } : {}),
        ...(patch.metadata ? { metadata: patch.metadata } : {}),
        ...(patch.expiresAt !== undefined ? { expires_at: patch.expiresAt } : {}),
        updated_at: now,
      })
      .eq("user_id", userId)
      .eq("integration", integration)
      .select(
        "id, user_id, integration, status, display_name, scopes, metadata, expires_at, created_at, updated_at",
      )
      .maybeSingle();

    if (response.error) throw new Error(response.error.message);
    return response.data
      ? mapRow(response.data as Record<string, unknown>)
      : null;
  }

  return updateLocalDatabase((database) => {
    const entry = database.connectionsV2.find(
      (e) => e.userId === userId && e.integration === integration,
    );
    if (!entry) return null;
    if (patch.status) entry.status = patch.status;
    if (patch.displayName !== undefined) entry.displayName = patch.displayName;
    if (patch.scopes) entry.scopes = patch.scopes;
    if (patch.metadata) entry.metadata = patch.metadata;
    if (patch.expiresAt !== undefined) entry.expiresAt = patch.expiresAt;
    entry.updatedAt = now;
    return mapRowFromLocal(entry);
  });
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function mapRowFromLocal(entry: {
  id: string;
  userId: string;
  integration: string;
  status: string;
  displayName: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}): Connection {
  return mapRow({
    id: entry.id,
    user_id: entry.userId,
    integration: entry.integration,
    status: entry.status,
    display_name: entry.displayName,
    scopes: entry.scopes,
    metadata: entry.metadata,
    expires_at: entry.expiresAt,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  });
}
