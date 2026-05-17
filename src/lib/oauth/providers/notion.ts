/**
 * Notion OAuth2 provider.
 *
 * Notes:
 *   - Token exchange requires Basic auth (clientId:clientSecret) +
 *     JSON body — different from form-encoded standard.
 *   - Tokens are long-lived; no refresh required.
 *   - Validation via GET /v1/users/me.
 */

import { env } from "@/lib/env";
import { AbstractOAuth2Provider, type ProviderEnvConfig } from "../base-provider";
import type {
  CompleteOAuthInput,
  CompleteOAuthOutput,
  ProviderCapabilities,
  TokenSet,
} from "../types";
import {
  OAuthExchangeFailedError,
} from "../errors";
import { verifyAndConsumeState } from "../state";

export class NotionOAuthProvider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities = {
    integration: "webhook", // No first-class slug for Notion yet — wire under "webhook" category.
    displayName: "Notion",
    grantType: "authorization_code",
    defaultScopes: [],
    supportsRefresh: false,
    refreshSkewSeconds: 0,
    n8nCredentialType: "notionApi",
  };

  protected readonly authorizationUrl = "https://api.notion.com/v1/oauth/authorize";
  protected readonly tokenUrl = "https://api.notion.com/v1/oauth/token";
  protected readonly validationEndpoint = "https://api.notion.com/v1/users/me";

  protected envConfig(): ProviderEnvConfig {
    return {
      clientId: env.oauth.notion.clientId,
      clientSecret: env.oauth.notion.clientSecret,
    };
  }

  protected override extraAuthParams() {
    return { owner: "user" };
  }

  /** Override: Notion uses Basic auth + JSON body. */
  override async completeOAuthFlow(input: CompleteOAuthInput): Promise<CompleteOAuthOutput> {
    const { clientId, clientSecret } = this.assertReady();

    await verifyAndConsumeState({
      state: input.state,
      userId: input.userId,
      provider: this.capabilities.integration,
    });

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: input.redirectUri ?? this.defaultRedirectUri(),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new OAuthExchangeFailedError(
        `Notion token exchange failed (HTTP ${response.status}).`,
        { status: response.status, body: text.slice(0, 240) },
      );
    }

    const raw = (await response.json()) as Record<string, unknown>;
    return {
      tokens: {
        accessToken: String(raw.access_token ?? ""),
        tokenType: typeof raw.token_type === "string" ? raw.token_type : "bearer",
        metadata: raw,
      },
      accountLabel:
        typeof raw.workspace_name === "string" ? raw.workspace_name : undefined,
      accountMetadata: {
        workspaceId: raw.workspace_id,
        workspaceName: raw.workspace_name,
        botId: raw.bot_id,
      },
    };
  }

  override async validateConnection(tokens: TokenSet) {
    const response = await fetch(this.validationEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Notion-Version": "2022-06-28",
      },
    });
    if (!response.ok) {
      return { ok: false, reason: `Notion HTTP ${response.status}` };
    }
    return { ok: true };
  }
}
