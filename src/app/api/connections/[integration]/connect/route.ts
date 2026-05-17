/**
 * POST /api/connections/[integration]/connect
 *
 * Begin OAuth flow for a provider. Returns the authorization URL.
 * Frontend redirects the user there; provider redirects back to
 * /api/oauth/callback/[provider] which finishes the flow.
 *
 * For `grantType: "api_key"` providers (WhatsApp) — the body should
 * include `credentialPayload`; this endpoint upserts the connection
 * inline without an OAuth dance.
 */

import { z } from "zod";
import { handleRouteError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/lib/security";
import {
  beginConnection,
  getOAuthProvider,
  isOAuthError,
} from "@/lib/oauth";
import { connect, type ConnectInput } from "@/lib/connections";
import {
  integrationSchema,
} from "@/lib/workflow";

const log = createLogger("api/connections/connect");

const apiKeyBodySchema = z
  .object({
    credentialPayload: z.record(z.string(), z.unknown()),
    displayName: z.string().optional(),
  })
  .optional();

export async function POST(
  request: Request,
  context: { params: Promise<{ integration: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleRouteError(
        new Error("Authentication required."),
        "Authentication required.",
        401,
      );
    }

    try {
      await enforceRateLimit({
        name: "connections-mutate",
        identifier: user.id,
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return Response.json(error.toApiPayload(), { status: 429 });
      }
      throw error;
    }

    const { integration } = await context.params;
    const provider = getOAuthProvider(integration);

    /* ── API-key providers (WhatsApp) — store inline ───────────── */
    if (provider.capabilities.grantType === "api_key") {
      const body = apiKeyBodySchema.parse(
        await request.json().catch(() => undefined),
      );
      if (!body?.credentialPayload) {
        return jsonError(
          "API-key provider requires a `credentialPayload` body.",
          400,
        );
      }
      const integrationSlug = integrationSchema.parse(
        provider.capabilities.integration,
      );
      const input: ConnectInput = {
        userId: user.id,
        integration: integrationSlug,
        credentialPayload: body.credentialPayload,
        displayName: body.displayName ?? provider.capabilities.displayName,
      };
      const connection = await connect(input);
      return Response.json({
        kind: "api_key",
        connection,
      });
    }

    /* ── OAuth providers ─────────────────────────────────────── */
    if (!provider.isReady()) {
      return jsonError(
        `Provider "${integration}" is not configured. Add its env vars.`,
        503,
      );
    }

    const out = await beginConnection({
      userId: user.id,
      providerSlug: integration,
    });

    return Response.json({
      kind: "oauth",
      authorizationUrl: out.authorizationUrl,
    });
  } catch (error) {
    log.error("Begin connection failed.", error);
    if (isOAuthError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not start connection.");
  }
}
