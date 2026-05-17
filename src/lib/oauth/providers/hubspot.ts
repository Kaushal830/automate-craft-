/**
 * HubSpot OAuth2 provider.
 *
 * Notes:
 *   - Scopes are space-separated.
 *   - Token endpoint returns `expires_in` + `refresh_token`.
 *   - HubSpot validation: GET /oauth/v1/access-tokens/{token}
 */

import { env } from "@/lib/env";
import { AbstractOAuth2Provider, type ProviderEnvConfig } from "../base-provider";
import type { ProviderCapabilities, TokenSet } from "../types";

export class HubspotOAuthProvider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities = {
    integration: "hubspot",
    displayName: "HubSpot",
    grantType: "authorization_code",
    defaultScopes: [
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.deals.read",
      "crm.objects.deals.write",
    ],
    supportsRefresh: true,
    refreshSkewSeconds: 300,
    n8nCredentialType: "hubspotOAuth2Api",
  };

  protected readonly authorizationUrl = "https://app.hubspot.com/oauth/authorize";
  protected readonly tokenUrl = "https://api.hubapi.com/oauth/v1/token";
  protected readonly validationEndpoint =
    "https://api.hubapi.com/oauth/v1/access-tokens";

  protected envConfig(): ProviderEnvConfig {
    return {
      clientId: env.oauth.hubspot.clientId,
      clientSecret: env.oauth.hubspot.clientSecret,
    };
  }

  override async validateConnection(tokens: TokenSet) {
    const response = await fetch(`${this.validationEndpoint}/${tokens.accessToken}`);
    if (!response.ok) {
      return { ok: false, reason: `HubSpot validation HTTP ${response.status}` };
    }
    return { ok: true };
  }
}
