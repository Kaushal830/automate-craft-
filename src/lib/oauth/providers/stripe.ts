/**
 * Stripe Connect OAuth provider.
 *
 * Notes:
 *   - Stripe Connect uses Standard accounts; the access_token returned
 *     is the connected account's restricted key, plus a
 *     stripe_user_id.
 *   - No refresh token — tokens are long-lived but can be revoked.
 *   - Validation via GET /v1/accounts/{stripe_user_id}.
 */

import { env } from "@/lib/env";
import { AbstractOAuth2Provider, type ProviderEnvConfig } from "../base-provider";
import type { ProviderCapabilities, TokenSet } from "../types";

export class StripeOAuthProvider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities = {
    integration: "stripe",
    displayName: "Stripe",
    grantType: "authorization_code",
    defaultScopes: ["read_write"],
    supportsRefresh: false,
    refreshSkewSeconds: 0,
    n8nCredentialType: "stripeApi",
  };

  protected readonly authorizationUrl = "https://connect.stripe.com/oauth/authorize";
  protected readonly tokenUrl = "https://connect.stripe.com/oauth/token";
  protected readonly revokeUrl = "https://connect.stripe.com/oauth/deauthorize";
  protected readonly validationEndpoint = "https://api.stripe.com/v1/accounts";

  protected envConfig(): ProviderEnvConfig {
    return {
      clientId: env.oauth.stripe.clientId,
      clientSecret: env.oauth.stripe.clientSecret,
    };
  }

  protected override parseTokenResponse(raw: Record<string, unknown>) {
    return {
      tokens: {
        accessToken: String(raw.access_token ?? ""),
        tokenType: typeof raw.token_type === "string" ? raw.token_type : "bearer",
        scopes:
          typeof raw.scope === "string"
            ? raw.scope.split(/[\s,]+/).filter(Boolean)
            : undefined,
        metadata: raw,
      },
      accountLabel: typeof raw.stripe_user_id === "string" ? raw.stripe_user_id : undefined,
      accountMetadata: {
        stripeUserId: raw.stripe_user_id,
        stripePublishableKey: raw.stripe_publishable_key,
        liveMode: raw.livemode,
      },
    };
  }

  override async validateConnection(tokens: TokenSet) {
    const stripeUserId = (tokens.metadata?.stripe_user_id as string | undefined) ?? "";
    if (!stripeUserId) {
      return { ok: false, reason: "Missing stripe_user_id in token metadata." };
    }
    const response = await fetch(`${this.validationEndpoint}/${stripeUserId}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) {
      return { ok: false, reason: `Stripe HTTP ${response.status}` };
    }
    return { ok: true };
  }
}
