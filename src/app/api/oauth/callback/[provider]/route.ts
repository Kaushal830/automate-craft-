/**
 * GET /api/oauth/callback/[provider]
 *
 * OAuth redirect target. Provider sends user back here with `code` +
 * `state` query params. We verify state, exchange code for tokens,
 * store them in the vault, upsert the connection, and redirect back
 * to the frontend connection page.
 *
 * On error, we redirect back with `?status=error&reason=...` so the
 * frontend can render a toast.
 */

import { handleRouteError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import {
  completeConnection,
  isOAuthError,
} from "@/lib/oauth";

const log = createLogger("api/oauth/callback");

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await context.params;
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    /* ── Provider-side denial ────────────────────────────────── */
    if (error) {
      log.warn("Provider returned OAuth error.", { provider, error, errorDescription });
      return redirectToConnections(provider, "error", error);
    }

    if (!code || !state) {
      return jsonError("Missing code or state parameter.", 400);
    }

    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Authentication required for callback.", 401);
    }

    const rawQuery: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      rawQuery[key] = value;
    });

    const outcome = await completeConnection({
      userId: user.id,
      providerSlug: provider,
      code,
      state,
      rawQuery,
    });

    log.info("OAuth callback completed.", {
      userId: user.id,
      provider,
      integration: outcome.integration,
    });

    return redirectToConnections(provider, "success");
  } catch (error) {
    log.error("OAuth callback failed.", error);
    if (isOAuthError(error)) {
      const { provider } = await context.params;
      return redirectToConnections(provider, "error", error.code);
    }
    return handleRouteError(error, "OAuth callback failed.");
  }
}

function redirectToConnections(
  provider: string,
  status: "success" | "error",
  reason?: string,
): Response {
  const base = env.publicSiteUrl.replace(/\/+$/, "");
  const target = new URL(`${base}/connections`);
  target.searchParams.set("provider", provider);
  target.searchParams.set("status", status);
  if (reason) target.searchParams.set("reason", reason);
  return Response.redirect(target.toString(), 302);
}
