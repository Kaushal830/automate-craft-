/**
 * AbstractOAuth2Provider — template method base class for OAuth2
 * providers.
 *
 * Concrete providers (Google, Slack, HubSpot, ...) extend this class
 * and override only the bits that differ per provider:
 *   - authorizationUrl    — provider's auth endpoint
 *   - tokenUrl            — token exchange endpoint
 *   - revokeUrl           — optional revocation endpoint
 *   - validationEndpoint  — lightweight "is the token still good?" URL
 *   - parseAccountLabel   — pull a human-readable label from token response
 *   - extraAuthParams     — provider-specific auth URL query (e.g. access_type=offline)
 *   - extraTokenBody      — provider-specific token body extensions
 *
 * The flow itself (build URL, issue state, exchange code, normalize
 * tokens) is identical across providers and lives here.
 */

import { issueState, verifyAndConsumeState } from "./state";
import {
  OAuthExchangeFailedError,
  OAuthProviderNotConfiguredError,
  OAuthRefreshFailedError,
  OAuthRevokeFailedError,
  OAuthValidationFailedError,
} from "./errors";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import type {
  BeginOAuthInput,
  BeginOAuthOutput,
  CompleteOAuthInput,
  CompleteOAuthOutput,
  OAuthProvider,
  ProviderCapabilities,
  TokenSet,
} from "./types";

const log = createLogger("oauth/base-provider");

/**
 * Provider configuration sourced from environment variables. Each
 * concrete provider declares its env keys; the base class reads them
 * at instantiation and surfaces "not configured" errors lazily so the
 * app boots without any provider secrets.
 */
export type ProviderEnvConfig = {
  clientId?: string;
  clientSecret?: string;
};

export abstract class AbstractOAuth2Provider implements OAuthProvider {
  abstract readonly capabilities: ProviderCapabilities;

  /** Provider's authorization endpoint (Step 1 — user-facing redirect). */
  protected abstract readonly authorizationUrl: string;

  /** Provider's token endpoint (Step 2 — code → tokens). */
  protected abstract readonly tokenUrl: string;

  /** Optional revocation endpoint (`null` = best-effort skip on revoke). */
  protected readonly revokeUrl: string | null = null;

  /** Lightweight "ping" endpoint that returns 200 when token still valid. */
  protected abstract readonly validationEndpoint: string;

  /** Reads from `env`. Subclasses override `envConfig()` to map env keys. */
  protected abstract envConfig(): ProviderEnvConfig;

  /* ─── Hooks (optional override) ──────────────────────────────── */

  /** Extra query params appended to the authorization URL. */
  protected extraAuthParams(_input: BeginOAuthInput): Record<string, string> {
    return {};
  }

  /** Extra fields merged into the token exchange POST body. */
  protected extraTokenBody(_input: CompleteOAuthInput): Record<string, string> {
    return {};
  }

  /** Format scopes for the auth URL — default: space-separated. */
  protected formatScopes(scopes: readonly string[]): string {
    return scopes.join(" ");
  }

  /** Parse the provider's token response into a normalized TokenSet. */
  protected parseTokenResponse(
    raw: Record<string, unknown>,
  ): { tokens: TokenSet; accountLabel?: string; accountMetadata?: Record<string, unknown> } {
    const tokens: TokenSet = {
      accessToken: String(raw.access_token ?? ""),
      refreshToken: typeof raw.refresh_token === "string" ? raw.refresh_token : undefined,
      tokenType: typeof raw.token_type === "string" ? raw.token_type : undefined,
      expiresAt:
        typeof raw.expires_in === "number"
          ? new Date(Date.now() + raw.expires_in * 1000).toISOString()
          : undefined,
      scopes:
        typeof raw.scope === "string"
          ? raw.scope.split(/[\s,]+/).filter(Boolean)
          : undefined,
      metadata: raw,
    };
    return { tokens, accountLabel: undefined, accountMetadata: undefined };
  }

  /* ─── OAuthProvider implementation ───────────────────────────── */

  isReady(): boolean {
    const c = this.envConfig();
    return Boolean(c.clientId && c.clientSecret);
  }

  protected assertReady(): { clientId: string; clientSecret: string } {
    const c = this.envConfig();
    if (!c.clientId || !c.clientSecret) {
      throw new OAuthProviderNotConfiguredError(
        `Provider "${this.capabilities.integration}" is not configured. Set its env vars.`,
        { provider: this.capabilities.integration },
      );
    }
    return { clientId: c.clientId, clientSecret: c.clientSecret };
  }

  protected defaultRedirectUri(): string {
    const base = env.publicSiteUrl.replace(/\/+$/, "");
    return `${base}/api/oauth/callback/${this.capabilities.integration}`;
  }

  async beginOAuthFlow(input: BeginOAuthInput): Promise<BeginOAuthOutput> {
    const { clientId } = this.assertReady();

    const state = await issueState({
      userId: input.userId,
      provider: this.capabilities.integration,
      extra: input.state,
    });

    const scopes = input.scopes ?? this.capabilities.defaultScopes;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: input.redirectUri ?? this.defaultRedirectUri(),
      response_type: "code",
      scope: this.formatScopes(scopes),
      state,
      ...this.extraAuthParams(input),
    });

    return {
      authorizationUrl: `${this.authorizationUrl}?${params.toString()}`,
      state,
    };
  }

  async completeOAuthFlow(input: CompleteOAuthInput): Promise<CompleteOAuthOutput> {
    const { clientId, clientSecret } = this.assertReady();

    await verifyAndConsumeState({
      state: input.state,
      userId: input.userId,
      provider: this.capabilities.integration,
    });

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: input.redirectUri ?? this.defaultRedirectUri(),
      ...this.extraTokenBody(input),
    });

    let response: Response;
    try {
      response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch (error) {
      throw new OAuthExchangeFailedError(
        `Token exchange request failed for "${this.capabilities.integration}".`,
        { provider: this.capabilities.integration },
        error,
      );
    }

    const text = await response.text();
    if (!response.ok) {
      log.error("Token exchange returned non-2xx.", {
        provider: this.capabilities.integration,
        status: response.status,
      });
      throw new OAuthExchangeFailedError(
        `Token exchange failed (HTTP ${response.status}).`,
        {
          provider: this.capabilities.integration,
          status: response.status,
          body: text.slice(0, 240),
        },
      );
    }

    const raw = safeParseJson(text);
    const parsed = this.parseTokenResponse(raw);

    return {
      tokens: parsed.tokens,
      accountLabel: parsed.accountLabel,
      accountMetadata: parsed.accountMetadata,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    const { clientId, clientSecret } = this.assertReady();

    if (!this.capabilities.supportsRefresh) {
      throw new OAuthRefreshFailedError(
        `Provider "${this.capabilities.integration}" does not support refresh tokens.`,
        { provider: this.capabilities.integration },
      );
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new OAuthRefreshFailedError(
        `Refresh failed (HTTP ${response.status}).`,
        {
          provider: this.capabilities.integration,
          status: response.status,
          body: text.slice(0, 240),
        },
      );
    }

    const raw = safeParseJson(await response.text());
    const parsed = this.parseTokenResponse(raw);
    // Some providers omit refresh_token on refresh — preserve original.
    if (!parsed.tokens.refreshToken) parsed.tokens.refreshToken = refreshToken;
    return parsed.tokens;
  }

  async revokeConnection(tokens: TokenSet): Promise<void> {
    if (!this.revokeUrl) {
      log.info("No revocation endpoint declared — skipping.", {
        provider: this.capabilities.integration,
      });
      return;
    }
    try {
      await fetch(this.revokeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: tokens.accessToken }),
      });
    } catch (error) {
      throw new OAuthRevokeFailedError(
        `Revoke failed for "${this.capabilities.integration}".`,
        { provider: this.capabilities.integration },
        error,
      );
    }
  }

  async validateConnection(tokens: TokenSet): Promise<{ ok: boolean; reason?: string }> {
    try {
      const response = await fetch(this.validationEndpoint, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (!response.ok) {
        return { ok: false, reason: `Validation returned ${response.status}.` };
      }
      return { ok: true };
    } catch (error) {
      throw new OAuthValidationFailedError(
        `Validation request failed for "${this.capabilities.integration}".`,
        { provider: this.capabilities.integration },
        error,
      );
    }
  }
}

function safeParseJson(text: string): Record<string, unknown> {
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
