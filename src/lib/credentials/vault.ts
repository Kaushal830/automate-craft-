/**
 * Credential vault repository.
 *
 * CRUD over `credentials_vault`. All payloads encrypted via
 * `crypto.ts` before persistence; decrypted only when the orchestrator
 * is about to deploy or execute.
 *
 * Local-mode fallback (dev): writes encrypted base64 strings to the
 * local JSON store. Crypto path is identical — only the substrate
 * changes.
 *
 * SAFETY
 *   - Decrypted payloads NEVER returned by list functions.
 *   - Plaintext NEVER logged.
 *   - Vault rows scoped to user_id by RLS in production; service-role
 *     access is the only write path.
 */

import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import { createLogger } from "@/lib/logger";
import {
  decryptCredential,
  encryptCredential,
} from "./crypto";
import type {
  CredentialDescriptor,
  CredentialLookup,
  CredentialPutInput,
  DecryptedCredential,
} from "./types";

const log = createLogger("credentials/vault");

/* ─── Mappers ────────────────────────────────────────────────────── */

function mapDescriptor(row: Record<string, unknown>): CredentialDescriptor {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    integration: String(row.integration),
    name: String(row.name),
    keyId: String(row.key_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ─── Put (upsert) ───────────────────────────────────────────────── */

export async function putCredential(
  input: CredentialPutInput,
): Promise<CredentialDescriptor> {
  log.info("Storing credential.", {
    userId: input.userId,
    integration: input.integration,
    name: input.name,
  });

  const { blob, keyId } = encryptCredential(input.payload);

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("credentials_vault")
      .upsert(
        {
          user_id: input.userId,
          integration: input.integration,
          name: input.name,
          encrypted_blob: blob,
          key_id: keyId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,integration,name" },
      )
      .select("id, user_id, integration, name, key_id, created_at, updated_at")
      .single();

    if (response.error || !response.data) {
      throw new Error(response.error?.message || "Could not store credential.");
    }

    return mapDescriptor(response.data as Record<string, unknown>);
  }

  return updateLocalDatabase((database) => {
    const now = new Date().toISOString();
    const existing = database.credentialsVault.find(
      (entry) =>
        entry.userId === input.userId &&
        entry.integration === input.integration &&
        entry.name === input.name,
    );

    if (existing) {
      existing.encryptedBlobBase64 = blob.toString("base64");
      existing.keyId = keyId;
      existing.updatedAt = now;
      return {
        id: existing.id,
        userId: existing.userId,
        integration: existing.integration,
        name: existing.name,
        keyId: existing.keyId,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }

    const created = {
      id: crypto.randomUUID(),
      userId: input.userId,
      integration: input.integration,
      name: input.name,
      keyId,
      encryptedBlobBase64: blob.toString("base64"),
      createdAt: now,
      updatedAt: now,
    };
    database.credentialsVault.push(created);
    return {
      id: created.id,
      userId: created.userId,
      integration: created.integration,
      name: created.name,
      keyId: created.keyId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  });
}

/* ─── Get (decrypt) ──────────────────────────────────────────────── */

/**
 * Look up a credential and return its decrypted payload.
 *
 * Returns null when no matching row exists.
 */
export async function getCredential(
  lookup: CredentialLookup,
): Promise<DecryptedCredential | null> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("credentials_vault")
      .select(
        "id, user_id, integration, name, key_id, encrypted_blob, created_at, updated_at",
      )
      .eq("user_id", lookup.userId)
      .eq("integration", lookup.integration)
      .eq("name", lookup.name)
      .maybeSingle();

    if (response.error) {
      throw new Error(response.error.message);
    }
    if (!response.data) return null;

    const row = response.data as Record<string, unknown>;
    const blob = coerceBlob(row.encrypted_blob);
    const payload = decryptCredential(blob);

    return {
      ...mapDescriptor(row),
      payload,
    };
  }

  const database = await readLocalDatabase();
  const entry = database.credentialsVault.find(
    (e) =>
      e.userId === lookup.userId &&
      e.integration === lookup.integration &&
      e.name === lookup.name,
  );
  if (!entry) return null;

  const blob = Buffer.from(entry.encryptedBlobBase64, "base64");
  const payload = decryptCredential(blob);

  return {
    id: entry.id,
    userId: entry.userId,
    integration: entry.integration,
    name: entry.name,
    keyId: entry.keyId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    payload,
  };
}

/* ─── List (descriptors only — no plaintext) ─────────────────────── */

export async function listCredentialsForUser(
  userId: string,
): Promise<CredentialDescriptor[]> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("credentials_vault")
      .select("id, user_id, integration, name, key_id, created_at, updated_at")
      .eq("user_id", userId)
      .order("integration", { ascending: true });

    if (response.error) {
      throw new Error(response.error.message);
    }
    return (response.data ?? []).map((row) =>
      mapDescriptor(row as Record<string, unknown>),
    );
  }

  const database = await readLocalDatabase();
  return database.credentialsVault
    .filter((e) => e.userId === userId)
    .map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      integration: entry.integration,
      name: entry.name,
      keyId: entry.keyId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));
}

/* ─── Delete ─────────────────────────────────────────────────────── */

export async function deleteCredential(lookup: CredentialLookup): Promise<boolean> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("credentials_vault")
      .delete()
      .eq("user_id", lookup.userId)
      .eq("integration", lookup.integration)
      .eq("name", lookup.name)
      .select("id")
      .maybeSingle();

    if (response.error) {
      throw new Error(response.error.message);
    }
    return Boolean(response.data?.id);
  }

  return updateLocalDatabase((database) => {
    const before = database.credentialsVault.length;
    database.credentialsVault = database.credentialsVault.filter(
      (e) =>
        !(
          e.userId === lookup.userId &&
          e.integration === lookup.integration &&
          e.name === lookup.name
        ),
    );
    return database.credentialsVault.length !== before;
  });
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function coerceBlob(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") {
    // Supabase may return BYTEA columns as `\x...` hex strings.
    if (value.startsWith("\\x")) {
      return Buffer.from(value.slice(2), "hex");
    }
    return Buffer.from(value, "base64");
  }
  throw new Error("Unrecognized credential blob shape from storage.");
}
