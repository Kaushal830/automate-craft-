/**
 * Connection service.
 *
 * High-level operations on the connection lifecycle. Wraps the repo +
 * vault to keep both stores consistent:
 *
 *   connect()       — upsert connection + put credential payload
 *   disconnect()    — mark revoked + delete credential payload
 *   markExpired()   — flip status when an OAuth token expires
 *   isActive()      — quick boolean for pre-deploy validator
 *
 * Phase 4 will add `beginOAuthFlow()` + `completeOAuthFlow()` per
 * provider. The service interface remains stable.
 */

import type { SupportedIntegration } from "@/lib/workflow";
import { getCredential, putCredential, deleteCredential } from "@/lib/credentials";
import {
  getConnection,
  upsertConnection,
  updateConnection,
} from "./repo";
import { getIntegrationMetadata, requiresCredential } from "./registry";
import type { Connection } from "./types";
import { createLogger } from "@/lib/logger";

const log = createLogger("connections/service");

export type ConnectInput = {
  userId: string;
  integration: SupportedIntegration;
  displayName?: string | null;
  scopes?: string[];
  /** Optional secret payload — stored encrypted in vault. */
  credentialPayload?: Record<string, unknown>;
  /** Override the default credential name from the registry. */
  credentialName?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
};

/**
 * Establish a connection. If a credential payload is provided, store
 * it encrypted in the vault under the integration's default name.
 */
export async function connect(input: ConnectInput): Promise<Connection> {
  log.info("Connecting integration.", {
    userId: input.userId,
    integration: input.integration,
  });

  const meta = getIntegrationMetadata(input.integration);
  const credentialName = input.credentialName ?? meta.defaultCredentialName;

  if (input.credentialPayload && requiresCredential(input.integration)) {
    await putCredential({
      userId: input.userId,
      integration: input.integration,
      name: credentialName,
      payload: input.credentialPayload,
    });
  }

  const connection = await upsertConnection({
    userId: input.userId,
    integration: input.integration,
    status: "connected",
    displayName: input.displayName ?? meta.displayName,
    scopes: input.scopes ?? Array.from(meta.defaultScopes),
    metadata: {
      ...(input.metadata ?? {}),
      credentialName,
    },
    expiresAt: input.expiresAt ?? null,
  });

  return connection;
}

export async function disconnect(
  userId: string,
  integration: SupportedIntegration,
): Promise<void> {
  log.info("Disconnecting integration.", { userId, integration });

  const meta = getIntegrationMetadata(integration);

  await deleteCredential({
    userId,
    integration,
    name: meta.defaultCredentialName,
  });

  await updateConnection(userId, integration, {
    status: "revoked",
    expiresAt: null,
  });
}

export async function markExpired(
  userId: string,
  integration: SupportedIntegration,
): Promise<void> {
  await updateConnection(userId, integration, { status: "expired" });
}

/**
 * Pre-deploy gate: is this user actively connected to this integration
 * AND does the credential exist in the vault (if required)?
 */
export async function isActive(
  userId: string,
  integration: SupportedIntegration,
): Promise<{ active: boolean; reason?: string }> {
  const connection = await getConnection(userId, integration);
  if (!connection || connection.status !== "connected") {
    return { active: false, reason: `No active connection for "${integration}".` };
  }

  if (!requiresCredential(integration)) {
    return { active: true };
  }

  const meta = getIntegrationMetadata(integration);
  const credentialName =
    (connection.metadata.credentialName as string | undefined) ??
    meta.defaultCredentialName;

  const credential = await getCredential({
    userId,
    integration,
    name: credentialName,
  });

  if (!credential) {
    return {
      active: false,
      reason: `Connection for "${integration}" has no stored credential.`,
    };
  }

  return { active: true };
}
