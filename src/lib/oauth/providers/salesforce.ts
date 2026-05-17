/**
 * Salesforce OAuth2 provider.
 *
 * Notes:
 *   - Uses standard OAuth2 with refresh tokens.
 *   - Instance URL is returned in the token response and required for
 *     subsequent API calls.
 */

import { env } from "@/lib/env";
import { AbstractOAuth2Provider, type ProviderEnvConfig } from "../base-provider";
import type { ProviderCapabilities, TokenSet } from "../types";

export class SalesforceOAuthProvider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities = {
    integration: "salesforce",
    displayName: "Salesforce",
    grantType: "authorization_code",
    defaultScopes: ["api", "refresh_token", "offline_access"],
    supportsRefresh: true,
    refreshSkewSeconds: 300,
    n8nCredentialType: "salesforceOAuth2Api",
  };

  protected readonly authorizationUrl = "https://login.salesforce.com/services/oauth2/authorize";
  protected readonly tokenUrl = "https://login.salesforce.com/services/oauth2/token";
  protected readonly revokeUrl = "https://login.salesforce.com/services/oauth2/revoke";
  protected readonly validationEndpoint = "https://login.salesforce.com/services/oauth2/userinfo";

  protected envConfig(): ProviderEnvConfig {
    return {
      clientId: env.oauth.salesforce.clientId,
      clientSecret: env.oauth.salesforce.clientSecret,
    };
  }

  protected override parseTokenResponse(raw: Record<string, unknown>) {
    const base = super.parseTokenResponse(raw);
    return {
      ...base,
      accountLabel: typeof raw.id === "string" ? raw.id : undefined,
      accountMetadata: {
        instanceUrl: raw.instance_url,
        idUrl: raw.id,
      },
    };
  }

  override async validateConnection(tokens: TokenSet) {
    const response = await fetch(this.validationEndpoint, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) {
      return { ok: false, reason: `Salesforce HTTP ${response.status}` };
    }
    return { ok: true };
  }
}
