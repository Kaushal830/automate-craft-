/**
 * POST /api/n8n/credentials/sync
 *
 * Push a user's stored credentials into n8n via the n8n credentials
 * API. Idempotent — re-syncing updates the existing n8n credential
 * row. Used by:
 *   - manual "Sync now" button on the connections dashboard
 *   - automatic call after `connect()` completes (Phase 5 hook)
 *
 * Body:
 *   { integration: "slack" | "google" | ... }
 *
 * If body omitted, syncs ALL connected integrations for the user.
 */

import { z } from "zod";
import { handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/lib/security";
import {
  integrationSchema,
  type SupportedIntegration,
} from "@/lib/workflow";
import { listConnectionsForUser } from "@/lib/connections";
import {
  syncCredentialToN8n,
  type SyncCredentialOutcome,
} from "@/lib/adapters/n8n/credentials/sync-service";

const log = createLogger("api/n8n/credentials/sync");

const bodySchema = z
  .object({
    integration: integrationSchema.optional(),
  })
  .optional();

export async function POST(request: Request) {
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

    const body = bodySchema.parse(await request.json().catch(() => undefined));

    let targets: SupportedIntegration[];
    if (body?.integration) {
      targets = [body.integration];
    } else {
      const connections = await listConnectionsForUser(user.id);
      targets = connections
        .filter((c) => c.status === "connected")
        .map((c) => c.integration);
    }

    const results: Array<{
      integration: SupportedIntegration;
      outcome: SyncCredentialOutcome;
    }> = [];

    for (const integration of targets) {
      const outcome = await syncCredentialToN8n({
        userId: user.id,
        integration,
      });
      results.push({ integration, outcome });
    }

    log.info("Sync batch completed.", {
      userId: user.id,
      count: results.length,
    });

    return Response.json({ results });
  } catch (error) {
    log.error("Sync request failed.", error);
    return handleRouteError(error, "Could not sync n8n credentials.");
  }
}
