import AuthScreen from "@/components/auth/AuthScreen";
import { getCurrentUser } from "@/lib/auth";
import { isSsoEnabled, isSupabaseAuthEnabled } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/navigation";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your AutomateCraft account to manage automations.",
};

type SearchParams = Promise<{
  next?: string | string[];
  error?: string | string[];
  focus?: string | string[];
}>;

function pickFirst(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeAuthPageError(value?: string | string[]) {
  const message = pickFirst(value);
  if (!message) return null;

  const lowerMessage = message.toLowerCase();
  if (
    lowerMessage.includes("fetch failed") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("dns") ||
    lowerMessage.includes("unreachable")
  ) {
    return "Authentication service is unreachable right now. Please check the Supabase project URL in your environment settings.";
  }

  return message;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser({ allowUnverified: true });
  if (user) {
    redirect(
      user.emailVerified
        ? "/dashboard"
        : `/verify-email?email=${encodeURIComponent(user.email)}`,
    );
  }

  const params = await searchParams;

  return (
    <AuthScreen
      mode="login"
      nextPath={sanitizeNextPath(pickFirst(params.next))}
      initialError={normalizeAuthPageError(params.error)}
      socialAuthEnabled={isSupabaseAuthEnabled()}
      ssoEnabled={isSsoEnabled()}
      focusSso={pickFirst(params.focus) === "sso"}
    />
  );
}
