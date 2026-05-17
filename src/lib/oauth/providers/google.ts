/**
 * Google OAuth2 provider.
 *
 * Notes:
 *   - `access_type=offline` + `prompt=consent` required to receive a
 *     refresh token reliably.
 *   - Scopes are space-separated.
 *   - Token endpoint accepts form-encoded body (default).
 */

import { env } from "@/lib/env";
import { AbstractOAuth2Provider, type ProviderEnvConfig } from "../base-provider";
import type { BeginOAuthInput, ProviderCapabilities, TokenSet } from "../types";

export class GoogleOAuthProvider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities = {
    integration: "google",
    displayName: "Google",
    grantType: "authorization_code",
    defaultScopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/forms.responses.readonly",
      "openid",
      "email",
      "profile",
    ],
    supportsRefresh: true,
    refreshSkewSeconds: 120,
    n8nCredentialType: "googleOAuth2Api",
  };

  protected readonly authorizationUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  protected readonly tokenUrl = "https://oauth2.googleapis.com/token";
  protected readonly revokeUrl = "https://oauth2.googleapis.com/revoke";
  protected readonly validationEndpoint = "https://www.googleapis.com/oauth2/v3/userinfo";

  protected envConfig(): ProviderEnvConfig {
    return {
      clientId: env.oauth.google.clientId,
      clientSecret: env.oauth.google.clientSecret,
    };
  }

  protected override extraAuthParams(_input: BeginOAuthInput): Record<string, string> {
    return {
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    };
  }

  protected override parseTokenResponse(raw: Record<string, unknown>) {
    const base = super.parseTokenResponse(raw);
    const idTokenSub = typeof raw.id_token === "string" ? raw.id_token : null;
    return {
      ...base,
      accountLabel: typeof raw.email === "string" ? raw.email : undefined,
      accountMetadata: idTokenSub ? { idToken: idTokenSub } : undefined,
    };
  }

  override async validateConnection(tokens: TokenSet) {
    const response = await fetch(this.validationEndpoint, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) {
      return { ok: false, reason: `userinfo HTTP ${response.status}` };
    }
    return { ok: true };
  }
}
