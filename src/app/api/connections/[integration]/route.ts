/**
 * GET    /api/connections/[integration]  — fetch single connection state
 * DELETE /api/connections/[integration]  — revoke (calls provider + clears vault)
 * POST   /api/connections/[integration]/refresh  — handled by separate sub-route
 */

import { handleRouteError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/lib/security";
import {
  getConnection,
} from "@/lib/connections";
import {
  revokeConnection,
  validateConnection,
  isOAuthError,
} from "@/lib/oauth";
import { integrationSchema } from "@/lib/workflow";

const log = createLogger("api/connections/[integration]");

export async function GET(
  _request: Request,
  context: { params: Promise<{ integration: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Authentication required.", 401);
    }

    const { integration } = await context.params;
    const slug = integrationSchema.parse(integration);
    const connection = await getConnection(user.id, slug);
    if (!connection) {
      return Response.json({ connected: false });
    }
    const validation = await validateConnection({ userId: user.id, integration: slug });
    return Response.json({
      connected: true,
      connection,
      validation,
    });
  } catch (error) {
    log.error("GET connection failed.", error);
    if (isOAuthError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not load connection.");
  }
}

export async function DELETE(
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
    await revokeConnection({ userId: user.id, integration: slug });
    return Response.json({ revoked: true });
  } catch (error) {
    log.error("DELETE connection failed.", error);
    if (isOAuthError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not revoke connection.");
  }
}
