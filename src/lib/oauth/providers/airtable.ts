/**
 * Airtable OAuth2 provider.
 *
 * Notes:
 *   - Airtable requires PKCE (code_verifier + code_challenge).
 *   - Phase 4 scaffolds the basic flow; PKCE upgrade is a Phase 5
 *     enhancement (introduces stateful code_verifier storage).
 *   - Scopes are space-separated.
 *   - Validation via GET /v0/meta/whoami.
 */

import { env } from "@/lib/env";
import { AbstractOAuth2Provider, type ProviderEnvConfig } from "../base-provider";
import type { ProviderCapabilities, TokenSet } from "../types";

export class AirtableOAuthProvider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities = {
    integration: "webhook", // Wired under generic webhook category until first-class slug added.
    displayName: "Airtable",
    grantType: "authorization_code",
    defaultScopes: [
      "data.records:read",
      "data.records:write",
      "schema.bases:read",
    ],
    supportsRefresh: true,
    refreshSkewSeconds: 300,
    n8nCredentialType: "airtableTokenApi",
  };

  protected readonly authorizationUrl = "https://airtable.com/oauth2/v1/authorize";
  protected readonly tokenUrl = "https://airtable.com/oauth2/v1/token";
  protected readonly validationEndpoint = "https://api.airtable.com/v0/meta/whoami";

  protected envConfig(): ProviderEnvConfig {
    return {
      clientId: env.oauth.airtable.clientId,
      clientSecret: env.oauth.airtable.clientSecret,
    };
  }

  override async validateConnection(tokens: TokenSet) {
    const response = await fetch(this.validationEndpoint, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) {
      return { ok: false, reason: `Airtable HTTP ${response.status}` };
    }
    return { ok: true };
  }
}
