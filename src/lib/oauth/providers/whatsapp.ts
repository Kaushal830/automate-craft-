/**
 * WhatsApp Business provider (API key, not OAuth).
 *
 * Notes:
 *   - WhatsApp Business API uses long-lived access tokens issued from
 *     Meta Developer Portal; no OAuth dance against AutomateCraft.
 *   - User pastes the token into the connection form; we store it in
 *     the vault under `whatsapp/default`.
 *   - `beginOAuthFlow()` is unsupported — returns a clear error. The
 *     `connect()` service path bypasses OAuth for `grantType: api_key`.
 */

import { AbstractOAuth2Provider, type ProviderEnvConfig } from "../base-provider";
import type {
  BeginOAuthInput,
  BeginOAuthOutput,
  CompleteOAuthInput,
  CompleteOAuthOutput,
  ProviderCapabilities,
  TokenSet,
} from "../types";
import {
  OAuthProviderNotConfiguredError,
} from "../errors";

export class WhatsAppProvider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities = {
    integration: "whatsapp",
    displayName: "WhatsApp Business",
    grantType: "api_key",
    defaultScopes: [],
    supportsRefresh: false,
    refreshSkewSeconds: 0,
    n8nCredentialType: "whatsAppApi",
  };

  protected readonly authorizationUrl = "";
  protected readonly tokenUrl = "";
  protected readonly validationEndpoint =
    "https://graph.facebook.com/v17.0/me";

  protected envConfig(): ProviderEnvConfig {
    // No OAuth client. Token is user-provided via /api/connections POST.
    return { clientId: "n/a", clientSecret: "n/a" };
  }

  override isReady(): boolean {
    return true; // No env requirement.
  }

  override async beginOAuthFlow(_input: BeginOAuthInput): Promise<BeginOAuthOutput> {
    throw new OAuthProviderNotConfiguredError(
      `WhatsApp uses API-key auth — no OAuth flow. POST /api/connections with credentialPayload.`,
      { provider: this.capabilities.integration },
    );
  }

  override async completeOAuthFlow(_input: CompleteOAuthInput): Promise<CompleteOAuthOutput> {
    throw new OAuthProviderNotConfiguredError(
      `WhatsApp does not use OAuth callback. Submit the API key via /api/connections.`,
      { provider: this.capabilities.integration },
    );
  }

  override async validateConnection(tokens: TokenSet) {
    const response = await fetch(this.validationEndpoint, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) {
      return { ok: false, reason: `WhatsApp HTTP ${response.status}` };
    }
    return { ok: true };
  }
}
