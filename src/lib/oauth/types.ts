/**
 * OAuth domain types.
 *
 * All providers implement the same `OAuthProvider` interface. The
 * `oauth/service.ts` orchestrator drives the flow generically; per-
 * provider quirks (param names, scope formatting, refresh body shape)
 * live inside each provider implementation.
 *
 * Token data lands in `credentials_vault`. Connection lifecycle lives
 * in `connections`. Phase 4 adds `oauth_state` for short-lived CSRF
 * state during the auth dance.
 */

import type { SupportedIntegration } from "@/lib/workflow";

/* ─── Provider capability metadata ───────────────────────────────── */

export type OAuthGrantType = "authorization_code" | "client_credentials" | "api_key";

export type ProviderCapabilities = {
  /** Provider slug — must match `SupportedIntegration`. */
  integration: SupportedIntegration;
  /** Display label for the OAuth consent prompt + connection card. */
  displayName: string;
  /** OAuth grant type. "api_key" providers skip the auth-code dance. */
  grantType: OAuthGrantType;
  /** Default scopes requested if the caller doesn't override. */
  defaultScopes: readonly string[];
  /** Whether the provider issues refresh tokens. */
  supportsRefresh: boolean;
  /** Default seconds before expiry to schedule a refresh attempt. */
  refreshSkewSeconds: number;
  /**
   * Stable n8n credential type identifier (e.g. "slackApi",
   * "googleOAuth2Api"). Phase 4 milestone 4 syncs vault tokens to n8n
   * using this type.
   */
  n8nCredentialType: string;
};

/* ─── Token + flow shapes ────────────────────────────────────────── */

/**
 * Normalized token bundle stored in the vault.
 *
 * Provider-specific extras (e.g. Slack's `bot_user_id`) live in
 * `metadata` so the vault payload stays type-stable.
 */
export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  /** Absolute expiry (ISO 8601). Computed from `expires_in` at exchange time. */
  expiresAt?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
};

/**
 * Begin-flow input. Returns an authorization URL the user is
 * redirected to.
 */
export type BeginOAuthInput = {
  userId: string;
  /** Override default scopes. */
  scopes?: readonly string[];
  /** State payload merged into the signed CSRF token. */
  state?: Record<string, unknown>;
  /** Override the default callback URL (rarely needed). */
  redirectUri?: string;
};

export type BeginOAuthOutput = {
  authorizationUrl: string;
  state: string;
  /** Optional code verifier when the provider requires PKCE. */
  codeVerifier?: string;
};

/**
 * Complete-flow input. The OAuth callback handler verifies state,
 * then hands the raw query params to the provider for exchange.
 */
export type CompleteOAuthInput = {
  userId: string;
  code: string;
  state: string;
  redirectUri?: string;
  codeVerifier?: string;
  rawQuery: Record<string, string>;
};

export type CompleteOAuthOutput = {
  tokens: TokenSet;
  /** Display name for the connection card ("hello@gmail.com" etc.). */
  accountLabel?: string;
  /** Provider-specific account identifiers stored in connection.metadata. */
  accountMetadata?: Record<string, unknown>;
};

/* ─── Provider interface ─────────────────────────────────────────── */

export interface OAuthProvider {
  readonly capabilities: ProviderCapabilities;

  /** True when env-configured (client id/secret present). */
  isReady(): boolean;

  /** Build the auth URL + reserve CSRF state. */
  beginOAuthFlow(input: BeginOAuthInput): Promise<BeginOAuthOutput>;

  /** Exchange authorization code for tokens. */
  completeOAuthFlow(input: CompleteOAuthInput): Promise<CompleteOAuthOutput>;

  /** Refresh an expiring access token using the refresh token. */
  refreshAccessToken(refreshToken: string): Promise<TokenSet>;

  /** Revoke tokens at the provider (best-effort). */
  revokeConnection(tokens: TokenSet): Promise<void>;

  /** Verify the connection by calling a lightweight provider endpoint. */
  validateConnection(tokens: TokenSet): Promise<{ ok: boolean; reason?: string }>;
}
