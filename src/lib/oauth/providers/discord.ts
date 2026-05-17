/**
 * Discord OAuth2 provider.
 *
 * Notes:
 *   - Scopes are space-separated.
 *   - `prompt=consent` ensures fresh consent grant.
 *   - Validation via GET /users/@me.
 */

import { env } from "@/lib/env";
import { AbstractOAuth2Provider, type ProviderEnvConfig } from "../base-provider";
import type { BeginOAuthInput, ProviderCapabilities, TokenSet } from "../types";

export class DiscordOAuthProvider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities = {
    integration: "webhook", // Discord categorized as webhook integration for now.
    displayName: "Discord",
    grantType: "authorization_code",
    defaultScopes: ["identify", "guilds", "webhook.incoming"],
    supportsRefresh: true,
    refreshSkewSeconds: 300,
    n8nCredentialType: "discordOAuth2Api",
  };

  protected readonly authorizationUrl = "https://discord.com/api/oauth2/authorize";
  protected readonly tokenUrl = "https://discord.com/api/oauth2/token";
  protected readonly revokeUrl = "https://discord.com/api/oauth2/token/revoke";
  protected readonly validationEndpoint = "https://discord.com/api/users/@me";

  protected envConfig(): ProviderEnvConfig {
    return {
      clientId: env.oauth.discord.clientId,
      clientSecret: env.oauth.discord.clientSecret,
    };
  }

  protected override extraAuthParams(_input: BeginOAuthInput) {
    return { prompt: "consent" };
  }

  override async validateConnection(tokens: TokenSet) {
    const response = await fetch(this.validationEndpoint, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) {
      return { ok: false, reason: `Discord HTTP ${response.status}` };
    }
    return { ok: true };
  }
}
