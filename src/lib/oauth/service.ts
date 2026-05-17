/**
 * OAuth service.
 *
 * High-level operations that glue providers + state + vault +
 * connections together. The API routes call ONLY these methods —
 * never the provider directly.
 *
 * Lifecycle:
 *   beginConnection()    — issue state, build auth URL.
 *   completeConnection() — exchange code, store tokens, upsert connection.
 *   refreshConnection()  — refresh tokens, update vault + connection.
 *   revokeConnection()   — revoke at provider, mark connection revoked,
 *                          delete vault entry.
 *   validateConnection() — provider ping; returns boolean + reason.
 *
 * Each operation is idempotent where possible; failures bubble as
 * typed OAuthError instances.
 */

import {
  putCredential,
  getCredential,
  deleteCredential,
} from "@/lib/credentials";
import {
  upsertConnection,
  getConnection,
  updateConnection,
} from "@/lib/connections";
import { createLogger } from "@/lib/logger";
import {
  OAuthRefreshFailedError,
  OAuthValidationFailedError,
} from "./errors";
import { getOAuthProvider } from "./providers";
import type {
  BeginOAuthOutput,
  TokenSet,
} from "./types";
import type { SupportedIntegration } from "@/lib/workflow";

const log = createLogger("oauth/service");

/* ─── Begin ──────────────────────────────────────────────────────── */

export type BeginConnectionInput = {
  userId: string;
  providerSlug: string;
  scopes?: readonly string[];
  redirectUri?: string;
};

export async function beginConnection(
  input: BeginConnectionInput,
): Promise<BeginOAuthOutput> {
  const provider = getOAuthProvider(input.providerSlug);
  log.info("Begin OAuth flow.", {
    userId: input.userId,
    provider: input.providerSlug,
  });
  return provider.beginOAuthFlow({
    userId: input.userId,
    scopes: input.scopes,
    redirectUri: input.redirectUri,
  });
}

/* ─── Complete ───────────────────────────────────────────────────── */

export type CompleteConnectionInput = {
  userId: string;
  providerSlug: string;
  code: string;
  state: string;
  redirectUri?: string;
  rawQuery: Record<string, string>;
};

export type CompleteConnectionOutcome = {
  integration: SupportedIntegration;
  accountLabel: string | undefined;
  scopes: string[];
  expiresAt: string | null;
};

export async function completeConnection(
  input: CompleteConnectionInput,
): Promise<CompleteConnectionOutcome> {
  const provider = getOAuthProvider(input.providerSlug);
  const log2 = log.withContext({
    userId: input.userId,
    provider: input.providerSlug,
  });

  log2.info("Completing OAuth flow.");

  const result = await provider.completeOAuthFlow({
    userId: input.userId,
    code: input.code,
    state: input.state,
    redirectUri: input.redirectUri,
    rawQuery: input.rawQuery,
  });

  const integration = provider.capabilities.integration;
  const credentialName = "default";

  await putCredential({
    userId: input.userId,
    integration,
    name: credentialName,
    payload: { ...result.tokens },
  });

  await upsertConnection({
    userId: input.userId,
    integration,
    status: "connected",
    displayName: result.accountLabel ?? provider.capabilities.displayName,
    scopes: result.tokens.scopes ?? Array.from(provider.capabilities.defaultScopes),
    metadata: {
      ...(result.accountMetadata ?? {}),
      credentialName,
      providerSlug: input.providerSlug,
    },
    expiresAt: result.tokens.expiresAt ?? null,
  });

  log2.info("OAuth connection stored.");

  return {
    integration,
    accountLabel: result.accountLabel,
    scopes: result.tokens.scopes ?? [],
    expiresAt: result.tokens.expiresAt ?? null,
  };
}

/* ─── Refresh ────────────────────────────────────────────────────── */

export async function refreshConnection(input: {
  userId: string;
  integration: SupportedIntegration;
}): Promise<TokenSet> {
  const connection = await getConnection(input.userId, input.integration);
  if (!connection) {
    throw new OAuthRefreshFailedError(`No connection for "${input.integration}".`, {
      userId: input.userId,
      integration: input.integration,
    });
  }

  const providerSlug =
    (connection.metadata.providerSlug as string | undefined) ?? input.integration;
  const provider = getOAuthProvider(providerSlug);

  const credentialName =
    (connection.metadata.credentialName as string | undefined) ?? "default";

  const cred = await getCredential({
    userId: input.userId,
    integration: input.integration,
    name: credentialName,
  });
  if (!cred) {
    throw new OAuthRefreshFailedError("No stored credential to refresh.", {
      userId: input.userId,
      integration: input.integration,
    });
  }

  const refreshToken = (cred.payload.refreshToken as string | undefined) ?? "";
  if (!refreshToken) {
    throw new OAuthRefreshFailedError("Stored credential has no refresh token.", {
      userId: input.userId,
      integration: input.integration,
    });
  }

  const fresh = await provider.refreshAccessToken(refreshToken);

  await putCredential({
    userId: input.userId,
    integration: input.integration,
    name: credentialName,
    payload: { ...cred.payload, ...fresh },
  });

  await updateConnection(input.userId, input.integration, {
    expiresAt: fresh.expiresAt ?? null,
    scopes: fresh.scopes ?? connection.scopes,
  });

  log.info("Refreshed connection.", {
    userId: input.userId,
    integration: input.integration,
  });

  return fresh;
}

/* ─── Revoke ─────────────────────────────────────────────────────── */

export async function revokeConnection(input: {
  userId: string;
  integration: SupportedIntegration;
}): Promise<void> {
  const connection = await getConnection(input.userId, input.integration);
  if (!connection) return;

  const credentialName =
    (connection.metadata.credentialName as string | undefined) ?? "default";

  const cred = await getCredential({
    userId: input.userId,
    integration: input.integration,
    name: credentialName,
  });

  const providerSlug =
    (connection.metadata.providerSlug as string | undefined) ?? input.integration;

  try {
    const provider = getOAuthProvider(providerSlug);
    if (cred) {
      await provider.revokeConnection(cred.payload as unknown as TokenSet).catch((error) => {
        log.warn("Provider revoke failed; continuing with local revoke.", error);
      });
    }
  } catch {
    // Unknown provider slug — still clean local state.
  }

  await deleteCredential({
    userId: input.userId,
    integration: input.integration,
    name: credentialName,
  });

  await updateConnection(input.userId, input.integration, {
    status: "revoked",
    expiresAt: null,
  });
}

/* ─── Validate ───────────────────────────────────────────────────── */

export async function validateConnection(input: {
  userId: string;
  integration: SupportedIntegration;
}): Promise<{ ok: boolean; reason?: string }> {
  const connection = await getConnection(input.userId, input.integration);
  if (!connection || connection.status !== "connected") {
    return { ok: false, reason: "Connection not active." };
  }
  const credentialName =
    (connection.metadata.credentialName as string | undefined) ?? "default";
  const cred = await getCredential({
    userId: input.userId,
    integration: input.integration,
    name: credentialName,
  });
  if (!cred) return { ok: false, reason: "No stored credential." };

  const providerSlug =
    (connection.metadata.providerSlug as string | undefined) ?? input.integration;
  const provider = getOAuthProvider(providerSlug);

  try {
    return await provider.validateConnection(cred.payload as unknown as TokenSet);
  } catch (error) {
    if (error instanceof OAuthValidationFailedError) {
      return { ok: false, reason: error.message };
    }
    throw error;
  }
}
