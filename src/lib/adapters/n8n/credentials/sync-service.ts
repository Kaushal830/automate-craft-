/**
 * n8n credential sync service.
 *
 * Replaces the Phase 2 placeholder ({{$credentials.X}} string sentinels)
 * with real n8n credential registration:
 *
 *   AutomateCraft connection + vault entry
 *        │
 *        ▼
 *   POST /credentials  → returns n8n credential ID
 *        │
 *        ▼
 *   Store n8n credential ID on connection.metadata.n8nCredentialId
 *        │
 *        ▼
 *   When the workflow JSON is built for n8n, each node references
 *   the credential by stored ID via the `credentials` field on the
 *   n8n node.
 *
 * Sync is idempotent — if a connection already has a stored
 * `n8nCredentialId`, we PATCH instead of POST.
 *
 * Failure mode: if the n8n adapter is not configured, sync returns
 * { synced: false, reason } without throwing — pre-deploy validator
 * has already verified readiness for actual deploys.
 */

import {
  hasN8nConfigured,
} from "@/lib/env";
import {
  getConnection,
  updateConnection,
} from "@/lib/connections";
import { getCredential } from "@/lib/credentials";
import { getOAuthProvider } from "@/lib/oauth";
import { createLogger } from "@/lib/logger";
import { n8nClient } from "../client/http-client";
import type { SupportedIntegration } from "@/lib/workflow";
import type { N8nCredentialResponse } from "./types";

const log = createLogger("adapters/n8n/credentials/sync");

export type SyncCredentialInput = {
  userId: string;
  integration: SupportedIntegration;
  /** Optional vault credential name override. */
  credentialName?: string;
};

export type SyncCredentialOutcome =
  | { synced: true; n8nCredentialId: string; n8nCredentialType: string }
  | { synced: false; reason: string };

export async function syncCredentialToN8n(
  input: SyncCredentialInput,
): Promise<SyncCredentialOutcome> {
  if (!hasN8nConfigured()) {
    return { synced: false, reason: "n8n adapter not configured." };
  }

  const connection = await getConnection(input.userId, input.integration);
  if (!connection) {
    return { synced: false, reason: "No connection found." };
  }

  const credentialName =
    input.credentialName ??
    (connection.metadata.credentialName as string | undefined) ??
    "default";

  const cred = await getCredential({
    userId: input.userId,
    integration: input.integration,
    name: credentialName,
  });
  if (!cred) {
    return { synced: false, reason: "No stored credential in vault." };
  }

  /* ── Resolve n8n credential type ─────────────────────────── */
  const providerSlug =
    (connection.metadata.providerSlug as string | undefined) ?? input.integration;
  const provider = getOAuthProvider(providerSlug);
  const n8nCredentialType = provider.capabilities.n8nCredentialType;

  const n8nCredentialName = `automatecraft:${input.userId}:${input.integration}:${credentialName}`;

  /* ── Idempotency: update existing or create new ─────────── */
  const existingId =
    (connection.metadata.n8nCredentialId as string | undefined) ?? null;

  let response: N8nCredentialResponse;
  try {
    if (existingId) {
      log.info("Updating existing n8n credential.", {
        userId: input.userId,
        integration: input.integration,
        n8nCredentialId: existingId,
      });
      response = await n8nClient.updateCredential(existingId, {
        name: n8nCredentialName,
        type: n8nCredentialType,
        data: cred.payload,
      });
    } else {
      log.info("Creating new n8n credential.", {
        userId: input.userId,
        integration: input.integration,
      });
      response = await n8nClient.createCredential({
        name: n8nCredentialName,
        type: n8nCredentialType,
        data: cred.payload,
      });
    }
  } catch (error) {
    log.error("n8n credential sync failed.", error);
    return {
      synced: false,
      reason: error instanceof Error ? error.message : "n8n API request failed.",
    };
  }

  /* ── Persist n8n credential ID on connection.metadata ────── */
  await updateConnection(input.userId, input.integration, {
    metadata: {
      ...connection.metadata,
      n8nCredentialId: response.id,
      n8nCredentialName: response.name,
      n8nCredentialType,
    },
  });

  return {
    synced: true,
    n8nCredentialId: response.id,
    n8nCredentialType,
  };
}

/**
 * Remove an n8n credential when a connection is revoked. Best-effort —
 * failure does not block the local revoke.
 */
export async function deleteCredentialFromN8n(input: {
  userId: string;
  integration: SupportedIntegration;
}): Promise<{ deleted: boolean; reason?: string }> {
  if (!hasN8nConfigured()) {
    return { deleted: false, reason: "n8n adapter not configured." };
  }

  const connection = await getConnection(input.userId, input.integration);
  const n8nCredentialId =
    (connection?.metadata?.n8nCredentialId as string | undefined) ?? null;
  if (!n8nCredentialId) {
    return { deleted: false, reason: "No n8n credential ID stored." };
  }

  try {
    await n8nClient.deleteCredential(n8nCredentialId);
    return { deleted: true };
  } catch (error) {
    log.warn("n8n credential delete failed.", error);
    return {
      deleted: false,
      reason: error instanceof Error ? error.message : "n8n API delete failed.",
    };
  }
}
