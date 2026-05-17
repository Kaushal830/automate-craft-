/**
 * POST /api/connections/[integration]/refresh
 *
 * Manually refresh an OAuth connection's access token. Used by
 * frontend "Reconnect / Refresh" button + by the background refresh
 * scheduler (Phase 5).
 */

import { handleRouteError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/lib/security";
import {
  refreshConnection,
  isOAuthError,
} from "@/lib/oauth";
import { integrationSchema } from "@/lib/workflow";

const log = createLogger("api/connections/refresh");

export async function POST(
  _request: Request,
  context: { params: Promise<{ integration: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Authentication required.", 401);
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
    const slug = integrationSchema.parse(integration);
    const tokens = await refreshConnection({ userId: user.id, integration: slug });
    return Response.json({
      refreshed: true,
      expiresAt: tokens.expiresAt ?? null,
      scopes: tokens.scopes ?? [],
    });
  } catch (error) {
    log.error("Refresh failed.", error);
    if (isOAuthError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not refresh connection.");
  }
}
