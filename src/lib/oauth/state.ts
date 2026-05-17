/**
 * OAuth state — signed, short-lived CSRF token used during the auth
 * dance.
 *
 * The state is a HMAC-signed envelope carrying:
 *   - user id  (the user who initiated the flow)
 *   - provider (the integration slug)
 *   - nonce    (random; one-shot via persisted use-marker)
 *   - issuedAt (epoch ms — used for TTL)
 *   - extra    (free-form per-flow payload)
 *
 * Verification checks:
 *   1. signature matches `SESSION_SECRET`
 *   2. TTL (default 10 minutes)
 *   3. user id matches the currently logged-in user
 *   4. one-shot: state value not previously redeemed (persisted in
 *      `oauth_state` table when Supabase mode is active)
 *
 * No JWT library dependency — kept tiny and self-contained.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import {
  OAuthStateExpiredError,
  OAuthStateInvalidError,
  OAuthStateUserMismatchError,
} from "./errors";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const HMAC_ALGO = "sha256";

export type StatePayload = {
  userId: string;
  provider: string;
  nonce: string;
  issuedAt: number;
  extra: Record<string, unknown>;
};

/* ─── Issue ──────────────────────────────────────────────────────── */

export type IssueStateInput = {
  userId: string;
  provider: string;
  extra?: Record<string, unknown>;
};

export async function issueState(input: IssueStateInput): Promise<string> {
  const payload: StatePayload = {
    userId: input.userId,
    provider: input.provider,
    nonce: randomBytes(16).toString("hex"),
    issuedAt: Date.now(),
    extra: input.extra ?? {},
  };
  const encoded = encodeAndSign(payload);
  await persistState(payload, encoded);
  return encoded;
}

/* ─── Verify ─────────────────────────────────────────────────────── */

export type VerifyStateInput = {
  state: string;
  userId: string;
  provider: string;
};

export async function verifyAndConsumeState(
  input: VerifyStateInput,
): Promise<StatePayload> {
  const decoded = decodeAndVerifySignature(input.state);

  if (decoded.provider !== input.provider) {
    throw new OAuthStateInvalidError("State provider mismatch.", {
      expected: input.provider,
      actual: decoded.provider,
    });
  }

  if (decoded.userId !== input.userId) {
    throw new OAuthStateUserMismatchError("State does not belong to the current user.", {
      expected: input.userId,
      actual: decoded.userId,
    });
  }

  if (Date.now() - decoded.issuedAt > STATE_TTL_MS) {
    throw new OAuthStateExpiredError("OAuth state expired.", {
      issuedAt: decoded.issuedAt,
      ttlMs: STATE_TTL_MS,
    });
  }

  await consumeState(input.state);
  return decoded;
}

/* ─── Internals ──────────────────────────────────────────────────── */

function encodeAndSign(payload: StatePayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac(HMAC_ALGO, env.sessionSecret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function decodeAndVerifySignature(state: string): StatePayload {
  const [body, sig] = state.split(".", 2);
  if (!body || !sig) {
    throw new OAuthStateInvalidError("Malformed state.");
  }
  const expectedSig = createHmac(HMAC_ALGO, env.sessionSecret)
    .update(body)
    .digest("base64url");

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new OAuthStateInvalidError("State signature invalid.");
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as StatePayload;
  } catch (error) {
    throw new OAuthStateInvalidError("State payload unreadable.", {}, error);
  }
}

async function persistState(payload: StatePayload, encoded: string): Promise<void> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    await supabase.from("oauth_state").insert({
      state: encoded,
      user_id: payload.userId,
      provider: payload.provider,
      issued_at: new Date(payload.issuedAt).toISOString(),
      consumed_at: null,
      extra: payload.extra,
    });
    return;
  }
  await updateLocalDatabase((database) => {
    database.oauthState.push({
      state: encoded,
      userId: payload.userId,
      provider: payload.provider,
      issuedAt: new Date(payload.issuedAt).toISOString(),
      consumedAt: null,
      extra: payload.extra,
    });
    return null;
  });
}

async function consumeState(encoded: string): Promise<void> {
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    // One-shot guard: only succeed if consumed_at is still NULL.
    const { data, error } = await supabase
      .from("oauth_state")
      .update({ consumed_at: new Date().toISOString() })
      .eq("state", encoded)
      .is("consumed_at", null)
      .select("state")
      .maybeSingle();

    if (error || !data) {
      throw new OAuthStateInvalidError("State already used or unknown.", {}, error);
    }
    return;
  }

  let consumed = false;
  await updateLocalDatabase((database) => {
    const entry = database.oauthState.find(
      (e) => e.state === encoded && e.consumedAt === null,
    );
    if (!entry) return null;
    entry.consumedAt = new Date().toISOString();
    consumed = true;
    return null;
  });
  if (!consumed) {
    // Local mode best-effort. Treat as already-consumed (still reject).
    const database = await readLocalDatabase();
    const ever = database.oauthState.find((e) => e.state === encoded);
    if (ever) {
      throw new OAuthStateInvalidError("State already used.");
    }
    throw new OAuthStateInvalidError("Unknown state.");
  }
}
