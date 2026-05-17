/**
 * Slack OAuth2 provider.
 *
 * Notes:
 *   - Slack uses comma-separated scopes.
 *   - Token response wraps token under `authed_user`/`team` shapes
 *     depending on V2 OAuth.
 *   - Revocation endpoint exists at `/api/auth.revoke`.
 */

import { env } from "@/lib/env";
import { AbstractOAuth2Provider, type ProviderEnvConfig } from "../base-provider";
import type { ProviderCapabilities, TokenSet } from "../types";

export class SlackOAuthProvider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities = {
    integration: "slack",
    displayName: "Slack",
    grantType: "authorization_code",
    defaultScopes: ["chat:write", "channels:read", "users:read"],
    supportsRefresh: false, // Slack V2 bot tokens are long-lived; no rotation by default.
    refreshSkewSeconds: 0,
    n8nCredentialType: "slackApi",
  };

  protected readonly authorizationUrl = "https://slack.com/oauth/v2/authorize";
  protected readonly tokenUrl = "https://slack.com/api/oauth.v2.access";
  protected readonly revokeUrl = "https://slack.com/api/auth.revoke";
  protected readonly validationEndpoint = "https://slack.com/api/auth.test";

  protected envConfig(): ProviderEnvConfig {
    return {
      clientId: env.oauth.slack.clientId,
      clientSecret: env.oauth.slack.clientSecret,
    };
  }

  protected override formatScopes(scopes: readonly string[]): string {
    return scopes.join(",");
  }

  protected override parseTokenResponse(raw: Record<string, unknown>) {
    const team = raw.team as { id?: string; name?: string } | undefined;
    const authedUser = raw.authed_user as { id?: string; access_token?: string } | undefined;
    const accessToken = String(
      raw.access_token ?? authedUser?.access_token ?? "",
    );
    return {
      tokens: {
        accessToken,
        tokenType: typeof raw.token_type === "string" ? raw.token_type : "bearer",
        scopes:
          typeof raw.scope === "string"
            ? raw.scope.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
        metadata: raw,
      },
      accountLabel: team?.name,
      accountMetadata: {
        teamId: team?.id,
        teamName: team?.name,
        userId: authedUser?.id,
      },
    };
  }

  override async validateConnection(tokens: TokenSet) {
    const response = await fetch(this.validationEndpoint, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) {
      return { ok: false, reason: `auth.test HTTP ${response.status}` };
    }
    const body = (await response.json()) as { ok?: boolean; error?: string };
    if (!body.ok) {
      return { ok: false, reason: body.error ?? "Slack returned ok=false." };
    }
    return { ok: true };
  }
}
