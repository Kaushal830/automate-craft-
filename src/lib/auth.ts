import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { AuthenticatedUser } from "@/lib/automation";
import { env, isOpenAccessMode, isSupabaseAuthEnabled, isSupabaseMode } from "@/lib/env";
import { getGuestUser } from "@/lib/guest-access";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
  createSupabaseServerComponentClient,
} from "@/lib/supabase";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth");

const LOCAL_SESSION_COOKIE = "ac_local_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type LocalSessionPayload = {
  sub: string;
  email: string;
  name: string | null;
  mode: "local";
};

function getSessionSecret() {
  return new TextEncoder().encode(env.sessionSecret);
}

function hasSupabaseAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore.getAll().some(({ name }) => (
    name.startsWith("sb-") && name.includes("-auth-token")
  ));
}

function mapSupabaseUser(
  user: {
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
    user_metadata?: Record<string, unknown>;
  },
): AuthenticatedUser {
  const name =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    mode: "supabase",
    onboarded: !!user.user_metadata?.onboarded,
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

async function setLocalSessionCookie(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  log.info("Setting local session cookie for user:", user.email);
  const cookieStore = await cookies();
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    mode: "local",
  } satisfies Omit<LocalSessionPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSessionSecret());

  cookieStore.set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

async function clearLocalSessionCookie() {
  log.debug("Clearing local session cookie.");
  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_SESSION_COOKIE);
}

async function getLocalUserFromCookie(): Promise<AuthenticatedUser | null> {
  log.debug("Reading local user from cookie.");
  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;

  if (!token) {
    log.debug("No local session cookie found.");
    return null;
  }

  try {
    const verified = await jwtVerify<LocalSessionPayload>(token, getSessionSecret());
    const database = await readLocalDatabase();
    const user = database.users.find((entry) => entry.id === verified.payload.sub);

    if (!user) {
      log.warn("Local session exists but user record was not found.");
      return null;
    }

    log.debug("Local user loaded successfully:", user.email);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      mode: "local",
      onboarded: !!user.onboarded,
    };
  } catch {
    log.error("Failed to verify local session cookie.");
    return null;
  }
}

async function ensureSupabaseProfile(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  if (!isSupabaseMode()) {
    return;
  }

  log.debug("Ensuring Supabase profile exists for:", user.email);
  const supabaseAdmin = createSupabaseAdminClient();

  // Check if the profile already exists
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    // Returning user — only update name/email, never overwrite credits
    await supabaseAdmin
      .from("profiles")
      .update({ email: user.email, full_name: user.name })
      .eq("id", user.id);
    return;
  }

  // New user — create profile with 10 free welcome credits
  const WELCOME_CREDITS = 10;

  const { error: insertError } = await supabaseAdmin.from("profiles").insert({
    id: user.id,
    email: user.email,
    full_name: user.name,
    plan_credits: WELCOME_CREDITS,
    extra_credits: 0,
  });

  if (insertError) {
    log.error("Failed to create profile for new user", insertError);
    // Fallback: try upsert in case of race condition
    await supabaseAdmin.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.name,
        plan_credits: WELCOME_CREDITS,
        extra_credits: 0,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    return;
  }

  // Log the welcome bonus in credit_transactions
  await supabaseAdmin.from("credit_transactions").insert({
    user_id: user.id,
    type: "grant",
    amount: WELCOME_CREDITS,
    balance_after: WELCOME_CREDITS,
    description: "Welcome bonus — 10 free credits",
    metadata: { source: "signup" },
  });

  // Log in usage_logs
  await supabaseAdmin.from("usage_logs").insert({
    user_id: user.id,
    action: "Welcome bonus — 10 free credits",
    credits_used: 0,
    status: "Success",
  });

  log.info("New user profile created with 10 welcome credits:", user.email);
}

export async function syncSupabaseProfileFromCurrentSession() {
  if (!isSupabaseAuthEnabled()) {
    log.debug("Supabase auth is off. Skipping session profile sync.");
    return null;
  }

  log.debug("Syncing Supabase profile from current session.");
  const supabase = await createSupabaseRouteClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id || !data.user.email) {
    log.error("Could not load current Supabase session for profile sync.", error);
    return null;
  }

  const name =
    typeof data.user.user_metadata.full_name === "string"
      ? data.user.user_metadata.full_name
      : typeof data.user.user_metadata.name === "string"
        ? data.user.user_metadata.name
        : null;

  await ensureSupabaseProfile({
    id: data.user.id,
    email: data.user.email,
    name,
  });

  return {
    id: data.user.id,
    email: data.user.email,
    name,
  };
}

const getCurrentUserRaw = cache(async (): Promise<AuthenticatedUser | null> => {
  log.debug("Resolving current user.");
  const cookieStore = await cookies();
  const hasLocalSessionCookie = Boolean(cookieStore.get(LOCAL_SESSION_COOKIE)?.value);
  const hasSupabaseSessionCookie = hasSupabaseAuthCookie(cookieStore);

  // Open-access shortcut: skip all auth checks and return guest immediately.
  if (isOpenAccessMode()) {
    // Still try to load a real session so logged-in users get their own data,
    // but never crash or block if it fails.
    try {
      if (isSupabaseAuthEnabled() && hasSupabaseSessionCookie) {
        const supabase = await createSupabaseServerComponentClient();
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) {
          const name =
            typeof data.user.user_metadata.full_name === "string"
              ? data.user.user_metadata.full_name
              : typeof data.user.user_metadata.name === "string"
                ? data.user.user_metadata.name
                : null;
          return {
            id: data.user.id,
            email: data.user.email ?? "",
            name,
            mode: "supabase",
            onboarded: !!data.user.user_metadata?.onboarded,
            emailVerified: Boolean(data.user.email_confirmed_at),
          };
        }
      }
      if (hasLocalSessionCookie) {
        const localUser = await getLocalUserFromCookie();
        if (localUser) return localUser;
      }
    } catch (err) {
      log.warn("Auth check failed in open-access mode, using guest.", err);
    }
    return getGuestUser();
  }

  // Standard auth flow (open-access OFF)
  if (isSupabaseAuthEnabled()) {
    if (!hasSupabaseSessionCookie) {
      log.debug("Supabase auth is enabled, but no auth cookie exists.");
      return null;
    }

    log.debug("Loading current user in Supabase auth mode.");
    const supabase = await createSupabaseServerComponentClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      log.error("Supabase getUser failed or returned no user.", error);
      return null;
    }

    const currentUser = mapSupabaseUser(data.user);
    return currentUser;
  }

  if (!hasLocalSessionCookie) {
    log.debug("Local auth mode has no session cookie.");
    return null;
  }

  log.debug("Loading current user in local mode.");
  return getLocalUserFromCookie();
});

export async function getCurrentUser(
  options: { allowUnverified?: boolean } = {},
): Promise<AuthenticatedUser | null> {
  const { allowUnverified = false } = options;
  const currentUser = await getCurrentUserRaw();

  if (!currentUser) {
    return null;
  }

  if (!allowUnverified && currentUser.emailVerified === false) {
    log.info("Supabase user exists, but email is not verified.");
    return null;
  }

  return currentUser;
}

export async function requireUser({ requireOnboarding = true }: { requireOnboarding?: boolean } = {}) {
  const user = await getCurrentUser({ allowUnverified: true });

  if (!user) {
    // Safety net: never redirect in open-access mode
    if (isOpenAccessMode()) {
      log.warn("requireUser: no user but open-access mode is ON. Returning guest.");
      return getGuestUser();
    }
    log.info("No user found. Redirecting to /login.");
    redirect("/login");
  }

  if (!user.emailVerified && !isOpenAccessMode()) {
    log.info("User email is not verified. Redirecting to /verify-email.");
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
  }

  if (requireOnboarding && !user.onboarded) {
    // Skip onboarding redirect in open-access mode
    if (isOpenAccessMode()) {
      return user;
    }
    log.info("User not onboarded. Redirecting to /onboarding.");
    redirect("/onboarding");
  }

  return user;
}

export async function signUpWithCredentials(input: {
  name: string;
  email: string;
  password: string;
}) {
  log.info("Starting sign up flow for:", input.email);
  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseRouteClient();
    const normalizedEmail = input.email.trim().toLowerCase();

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3000");

    const signUpResult = await supabase.auth.signUp({
      email: normalizedEmail,
      password: input.password,
      options: {
        data: {
          full_name: input.name,
        },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (signUpResult.error) {
      log.error("Supabase sign up failed.", signUpResult.error);
      throw new Error(signUpResult.error.message);
    }

    if (!signUpResult.data.user?.id) {
      throw new Error("Could not create the Supabase user.");
    }

    // When email confirmation is enabled, Supabase returns no session.
    // Return a flag so the frontend can redirect to the verify-email page.
    if (!signUpResult.data.session) {
      log.info("Email confirmation required for:", normalizedEmail);

      // Still upsert the profile so it exists when the user confirms.
      try {
        await ensureSupabaseProfile({
          id: signUpResult.data.user.id,
          email: normalizedEmail,
          name: input.name,
        });
      } catch {
        // Profile upsert may fail without service-role key — that's fine,
        // the callback route will sync it after confirmation.
        log.warn("Profile upsert skipped (no service role key or table missing).");
      }

      return {
        needsEmailVerification: true,
        user: {
          id: signUpResult.data.user.id,
          email: normalizedEmail,
          name: input.name,
          mode: "supabase" as const,
          onboarded: false,
          emailVerified: false,
        },
      };
    }

    await ensureSupabaseProfile({
      id: signUpResult.data.user.id,
      email: normalizedEmail,
      name: input.name,
    });

    return {
      needsEmailVerification: false,
      user: {
        id: signUpResult.data.user.id,
        email: normalizedEmail,
        name: input.name,
        mode: "supabase" as const,
        onboarded: !!signUpResult.data.user.user_metadata?.onboarded,
        emailVerified: Boolean(signUpResult.data.user.email_confirmed_at),
      },
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  log.info("Sign up is using local mode.");

  const user = await updateLocalDatabase(async (database) => {
    const existingUser = database.users.find(
      (entry) => entry.email === normalizedEmail,
    );

    if (existingUser) {
      throw new Error("An account with this email already exists.");
    }

    const createdUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: input.name,
      passwordHash: await bcrypt.hash(input.password, 10),
      createdAt: new Date().toISOString(),
      planCredits: 10,
      extraCredits: 0,
      onboarded: false,
    };

    database.users.push(createdUser);
    return createdUser;
  });

  await setLocalSessionCookie(user);

  return {
    needsEmailVerification: false,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mode: "local" as const,
      onboarded: !!user.onboarded,
      emailVerified: true,
    },
  };
}

export async function signInWithCredentials(input: {
  email: string;
  password: string;
}) {
  log.info("Starting sign in flow for:", input.email);
  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseRouteClient();
    const normalizedEmail = input.email.trim().toLowerCase();
    const signInResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: input.password,
    });

    if (signInResult.error) {
      log.error("Supabase sign in failed.", signInResult.error);

      if (signInResult.error.message.toLowerCase().includes("email not confirmed")) {
        return {
          needsEmailVerification: true,
          user: {
            id: "",
            email: normalizedEmail,
            name: null,
            mode: "supabase" as const,
            onboarded: false,
            emailVerified: false,
          },
        };
      }

      if (signInResult.error.message.toLowerCase().includes("invalid login credentials")) {
        throw new Error(
          "Incorrect email or password. If you just signed up, please verify your email before continuing.",
        );
      }

      throw new Error(signInResult.error.message || "Invalid login.");
    }

    if (!signInResult.data.user) {
      throw new Error("Invalid login.");
    }

    if (!signInResult.data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return {
        needsEmailVerification: true,
        user: {
          id: signInResult.data.user.id,
          email: normalizedEmail,
          name: null,
          mode: "supabase" as const,
          onboarded: false,
          emailVerified: false,
        },
      };
    }

    const mappedUser = mapSupabaseUser(signInResult.data.user);

    await ensureSupabaseProfile({
      id: signInResult.data.user.id,
      email: normalizedEmail,
      name: mappedUser.name,
    });

    return {
      needsEmailVerification: false,
      user: mappedUser,
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  log.info("Sign in is using local mode.");
  const database = await readLocalDatabase();
  const user = database.users.find((entry) => entry.email === normalizedEmail);

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  await setLocalSessionCookie(user);

  return {
    needsEmailVerification: false,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mode: "local" as const,
      onboarded: !!user.onboarded,
      emailVerified: true,
    },
  };
}

export async function signOutCurrentUser() {
  log.info("Starting sign out flow.");
  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseRouteClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      log.error("Supabase sign out failed.", error);
      throw new Error(error.message);
    }

    return;
  }

  await clearLocalSessionCookie();
}
