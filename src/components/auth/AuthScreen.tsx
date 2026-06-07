"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  getSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase-browser";

type AuthScreenProps = {
  mode: "login" | "signup";
  nextPath: string;
  initialError?: string | null;
  socialAuthEnabled: boolean;
  ssoEnabled: boolean;
  focusSso?: boolean;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M21.8 12.23c0-.76-.07-1.49-.2-2.18H12v4.13h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.94-1.79 3.05-4.42 3.05-7.59Z" fill="#4285F4" />
      <path d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.97-3.45.97-2.65 0-4.89-1.79-5.7-4.2H2.89v2.64A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.3 13.74a5.98 5.98 0 0 1 0-3.48V7.62H2.89a10 10 0 0 0 0 8.76l3.41-2.64Z" fill="#FBBC04" />
      <path d="M12 6.03c1.49 0 2.83.51 3.88 1.52l2.9-2.9C17.06 3.03 14.75 2 12 2A10 10 0 0 0 2.89 7.62L6.3 10.26c.81-2.41 3.05-4.23 5.7-4.23Z" fill="#EA4335" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/* ─── Orbiting integration icon ─── */
/* Removed — replaced by LoginDemoPlayer */

import dynamic from "next/dynamic";
const LoginDemoPlayer = dynamic(() => import("@/components/auth/LoginDemoPlayer"), { ssr: false });

/* LOGIC EXPLAINED:
The auth page was exposing raw network errors like "fetch failed", and Google
sign-in used a server-generated redirect that could send users to a dead
Supabase URL. This frontend-only guard turns those failures into a clear message
and only opens Google after the configured Supabase Auth project is reachable.
*/
function normalizeAuthError(err: unknown) {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Authentication failed.";
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

async function assertSupabaseAuthReachable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

  if (!supabaseUrl) {
    throw new Error("Google sign-in is not configured yet.");
  }

  try {
    await fetch(`${supabaseUrl}/auth/v1/health`, {
      cache: "no-store",
      mode: "no-cors",
    });
  } catch {
    throw new Error(
      "Authentication service is unreachable right now. Please check the Supabase project URL in your environment settings.",
    );
  }
}


/* ═══════════════════════════════════════════════
   MAIN AUTH SCREEN COMPONENT
   ═══════════════════════════════════════════════ */
export default function AuthScreen({
  mode,
  nextPath,
  initialError = null,
  socialAuthEnabled,
  ssoEnabled,
  focusSso = false,
}: AuthScreenProps) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [loginStep, setLoginStep] = useState<"methods" | "email" | "forgot-password">("methods");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? normalizeAuthError(initialError) : null,
  );

  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const googleHref = "#";

  const handleGoogleAuth = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (!socialAuthEnabled || socialLoading) return;

    setError(null);
    setMagicError(null);
    setResetError(null);
    setSocialLoading(true);

    try {
      if (!isSupabaseBrowserConfigured()) {
        throw new Error("Google sign-in is not configured yet.");
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error("Google sign-in is not configured yet.");
      }

      await assertSupabaseAuthReachable();

      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) {
        throw oauthError;
      }

      if (!data.url) {
        throw new Error("Could not start Google sign-in.");
      }

      window.location.assign(data.url);
    } catch (err) {
      setError(normalizeAuthError(err));
      setSocialLoading(false);
    }
  };

  /* ─── Password submit ─── */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignup ? { name, email, password } : { email, password }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        user?: { onboarded: boolean };
        needsEmailVerification?: boolean;
      };
      if (!res.ok) {
        if (json.needsEmailVerification) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(json.error || "Authentication failed.");
      }
      if (json.needsEmailVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      let finalPath = nextPath;
      if (json.user && json.user.onboarded === false) finalPath = "/onboarding";
      router.push(finalPath);
      router.refresh();
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ─── Magic link submit ─── */
  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMagicLoading(true);
    setMagicError(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send magic link.");
      setMagicSent(true);
    } catch (err) {
      setMagicError(normalizeAuthError(err));
    } finally {
      setMagicLoading(false);
    }
  };

  /* ─── Reset Password submit ─── */
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send reset link.");
      setResetSent(true);
    } catch (err) {
      setResetError(normalizeAuthError(err));
    } finally {
      setResetLoading(false);
    }
  };

  const title = isSignup ? "Create your account" : "Welcome back";
  const visibleError = error || magicError || resetError;
  const displayError = visibleError ? normalizeAuthError(visibleError) : null;

  const inputCls =
    "h-[50px] w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-[0.875rem] text-white outline-none transition-all duration-200 placeholder:text-white/20 focus:border-[#3b82f6]/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#3b82f6]/10";

  const primaryBtnCls =
    "flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#ededed] text-[0.875rem] font-semibold text-[#0a0a0a] transition-all duration-200 hover:bg-[#3b82f6] hover:shadow-[0_4px_24px_rgba(59,130,246,0.2)] disabled:cursor-not-allowed disabled:opacity-60";

  const socialBtnCls =
    "flex h-[50px] w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[0.875rem] font-semibold text-white transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.07]";

  return (
    <main className="flex min-h-screen w-full bg-[#0a0a0a]">

      {/* ═══════════ LEFT PANEL — Auth form ═══════════ */}
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        className="relative flex w-full flex-col items-center justify-center px-6 py-10 lg:w-[50%]"
      >
        <div className="w-full max-w-[420px]">

          {/* Logo + Heading */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mb-8 flex flex-col items-center"
          >
            <Link href="/" className="mb-6 block">
              <Image
                src="/logo-new.png"
                alt="AutomateCraft"
                width={56}
                height={56}
                className="object-contain"
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </Link>
            <h1 className="text-center text-[1.85rem] font-semibold tracking-[-0.02em] text-white">
              {title}
            </h1>
            <p className="mt-2 text-center text-[0.9rem] text-white/35">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <Link
                href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(nextPath)}`}
                className="font-semibold text-[#3b82f6] transition-colors hover:text-[#60a5fa]"
              >
                {isSignup ? "Sign in" : "Sign up for free"}
              </Link>
            </p>
          </motion.div>

          {/* Error banner */}
          <AnimatePresence>
            {displayError && (
              <motion.div
                initial={false}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-center text-[0.825rem] font-medium text-red-400"
              >
                {displayError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════ LOGIN FLOW — two steps ══════════ */}
          {!isSignup ? (
            <AnimatePresence mode="wait">

              {/* STEP 1: Google + Continue with Email */}
              {loginStep === "methods" ? (
                <motion.div
                  key="step-methods"
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="space-y-3">
                    <a
                      href={socialAuthEnabled ? googleHref : undefined}
                      onClick={handleGoogleAuth}
                      aria-disabled={!socialAuthEnabled}
                      id="google-signin-btn"
                      className={`${socialBtnCls} ${!socialAuthEnabled ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      {socialLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
                      {socialLoading ? "Opening Google..." : "Continue with Google"}
                    </a>

                    <button
                      type="button"
                      id="continue-with-email-btn"
                      onClick={() => { setLoginStep("email"); setError(null); setMagicError(null); }}
                      className={socialBtnCls}
                    >
                      <MailIcon />
                      Continue with Email
                    </button>
                  </div>

                  <p className="mt-10 text-center text-[0.7rem] leading-5 text-white/[0.18]">
                    By continuing, you agree to our{" "}
                    <Link href="/terms" className="text-white/30 underline underline-offset-2 hover:text-white/50 transition-colors">Terms of Service</Link> and{" "}
                    <Link href="/privacy" className="text-white/30 underline underline-offset-2 hover:text-white/50 transition-colors">Privacy Policy</Link>.
                  </p>
                </motion.div>

              ) : loginStep === "email" ? (
                /* STEP 2: Email + Password + Magic Link */
                <motion.div
                  key="step-email"
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    type="button"
                    onClick={() => { setLoginStep("methods"); setError(null); setMagicError(null); setMagicSent(false); }}
                    className="mb-6 flex items-center gap-1.5 text-[0.8rem] font-medium text-white/30 transition-colors hover:text-white/60"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All sign in options
                  </button>

                  {magicSent ? (
                    <motion.div
                      initial={false}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-4 text-center"
                    >
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/20">
                        <CheckCircle2 className="h-8 w-8 text-[#3b82f6]" />
                      </div>
                      <h2 className="mb-2 text-lg font-semibold text-white">Check your inbox</h2>
                      <p className="mb-1 text-sm text-white/40">We sent a login link to</p>
                      <p className="mb-6 text-sm font-semibold text-[#3b82f6]">{email}</p>
                      <p className="mb-4 text-xs text-white/25">Click the link in the email to sign in. Expires in 1 hour.</p>
                      <button
                        type="button"
                        onClick={() => { setMagicSent(false); setEmail(""); }}
                        className="text-sm font-medium text-white/30 hover:text-white/60 transition-colors"
                      >
                        Use a different email
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" autoFocus className={inputCls} />
                        <div className="relative mb-1">
                          <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} placeholder="Password" autoComplete="current-password" className={`${inputCls} pr-16`} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <div />
                          <button type="button" onClick={() => { setLoginStep("forgot-password"); setError(null); setResetError(null); setResetSent(false); }} className="text-xs font-medium text-accent hover:text-accent/80 transition-colors">
                            Forgot password?
                          </button>
                        </div>
                        <button type="submit" disabled={loading} className={primaryBtnCls}>
                          {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>) : (<>Sign in <ArrowRight className="h-4 w-4 ml-1" /></>)}
                        </button>
                      </form>

                      <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-white/[0.06]" /></div>
                        <div className="relative flex justify-center"><span className="bg-[#0a0a0a] px-4 text-[0.68rem] font-medium text-white/20">or sign in without a password</span></div>
                      </div>

                      <form onSubmit={handleMagicLink}>
                        <button type="submit" disabled={magicLoading || !email} id="send-magic-link-btn" className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[0.875rem] font-semibold text-white/70 transition-all duration-200 hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                          {magicLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending link...</>) : (<><Mail className="h-4 w-4" /> Send magic link instead</>)}
                        </button>
                        <p className="mt-2.5 text-center text-[0.7rem] text-white/20">Uses the email above — no password needed.</p>
                      </form>
                    </>
                  )}
                </motion.div>

              ) : (
                /* STEP 3: Forgot Password */
                <motion.div
                  key="step-forgot"
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    type="button"
                    onClick={() => { setLoginStep("email"); setResetError(null); setResetSent(false); }}
                    className="mb-6 flex items-center gap-1.5 text-[0.8rem] font-medium text-white/30 transition-colors hover:text-white/60"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </button>

                  {resetSent ? (
                    <motion.div
                      initial={false}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-4 text-center"
                    >
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/20">
                        <CheckCircle2 className="h-8 w-8 text-[#3b82f6]" />
                      </div>
                      <h2 className="mb-2 text-lg font-semibold text-white">Check your email</h2>
                      <p className="mb-1 text-sm text-white/40">We sent a password reset link to</p>
                      <p className="mb-6 text-sm font-semibold text-[#3b82f6]">{email}</p>
                      <p className="mb-4 text-xs text-white/25">Click the link in the email to reset your password.</p>
                      <button
                        type="button"
                        onClick={() => { setLoginStep("email"); }}
                        className="text-sm font-medium text-white/30 hover:text-white/60 transition-colors"
                      >
                        Return to sign in
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold text-white mb-2">Reset Password</h2>
                        <p className="text-sm text-white/40">Enter your email address and we&apos;ll send you a link to reset your password.</p>
                      </div>
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" autoFocus className={inputCls} />
                        <button type="submit" disabled={resetLoading || !email} className={primaryBtnCls}>
                          {resetLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>) : "Send reset link"}
                        </button>
                      </form>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          ) : (
            /* ══════════ SIGNUP FLOW — single step ══════════ */
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
            >
              <a href={socialAuthEnabled ? googleHref : undefined} onClick={handleGoogleAuth} aria-disabled={!socialAuthEnabled} id="google-signup-btn" className={`${socialBtnCls} ${!socialAuthEnabled ? "cursor-not-allowed opacity-40" : ""}`}>
                {socialLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
                {socialLoading ? "Opening Google..." : "Continue with Google"}
              </a>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-white/[0.06]" /></div>
                <div className="relative flex justify-center"><span className="bg-[#0a0a0a] px-4 text-[0.7rem] font-medium text-white/25">Or sign up with email</span></div>
              </div>

              <form className="space-y-3" onSubmit={handleSubmit}>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" className={inputCls} />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" className={inputCls} />
                <div className="relative">
                  <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} placeholder="Password (min. 8 characters)" autoComplete="new-password" className={`${inputCls} pr-16`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className={primaryBtnCls}>
                  {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>) : (<>Create account <ArrowRight className="h-4 w-4 ml-1" /></>)}
                </button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-white/[0.06]" /></div>
                <div className="relative flex justify-center"><span className="bg-[#0a0a0a] px-4 text-[0.68rem] font-medium text-white/20">or sign up without a password</span></div>
              </div>

              <form onSubmit={handleMagicLink}>
                <button type="submit" disabled={magicLoading || !email} className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[0.875rem] font-semibold text-white/70 transition-all duration-200 hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                  {magicLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending link...</>) : (<><Mail className="h-4 w-4" /> Send magic link instead</>)}
                </button>
                <p className="mt-2.5 text-center text-[0.7rem] text-white/20">Uses the email above — no password needed.</p>
              </form>

              <p className="mt-8 text-center text-[0.7rem] leading-5 text-white/[0.18]">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="text-white/30 underline underline-offset-2 hover:text-white/50 transition-colors">Terms of Service</Link> and{" "}
                <Link href="/privacy" className="text-white/30 underline underline-offset-2 hover:text-white/50 transition-colors">Privacy Policy</Link>.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ═══════════ RIGHT PANEL — Hero visual ═══════════ */}
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="hidden lg:block lg:w-[50%]"
      >
        <div className="relative h-full border-l border-white/[0.04] bg-gradient-to-br from-[#040608] via-[#080d16] to-[#040608] flex items-center justify-center p-6">
          <div className="w-full max-w-[720px]" style={{ aspectRatio: "18/10" }}>
            <LoginDemoPlayer />
          </div>
        </div>
      </motion.div>
    </main>
  );
}
