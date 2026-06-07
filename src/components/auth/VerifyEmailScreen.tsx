"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/* LOGIC EXPLAINED:
This page keeps unverified users in one safe place. It polls the server for the
current Supabase user, waits until `email_confirmed_at` becomes true, and only
then redirects to the dashboard. The resend button also calls Supabase directly
so the verification state is always server-backed.
*/

export default function VerifyEmailScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkVerification = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as {
            emailVerified?: boolean;
          };

          if (data.emailVerified) {
            router.push("/dashboard");
            return;
          }
        }
      } catch {
        // Keep polling quietly.
      }

      timeoutId = setTimeout(checkVerification, 4000);
    };

    checkVerification();
    return () => clearTimeout(timeoutId);
  }, [router]);

  const handleResend = async () => {
    if (!emailParam) {
      setError("No email address found. Please sign up again.");
      return;
    }

    setResending(true);
    setError(null);
    setResent(false);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error("Auth service is not configured.");
      }

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: emailParam,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (resendError) {
        throw resendError;
      }

      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resend email.",
      );
    } finally {
      setResending(false);
    }
  };

  const getEmailProviderLink = (email: string) => {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain === "gmail.com") return "https://mail.google.com";
    if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") return "https://outlook.live.com";
    if (domain === "yahoo.com") return "https://mail.yahoo.com";
    return `mailto:${email}`;
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.015),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(79,142,247,0.03),_transparent_40%)]" />

      <motion.section
        initial={false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="card-surface relative w-full max-w-[440px] rounded-3xl p-8 sm:p-10 text-foreground shadow-2xl shadow-black/40 border border-white/5"
      >
        <div className="mb-10 flex items-center justify-between">
          <BrandMark compact showName={true} />
          <Link
            href="/login"
            className="text-[0.85rem] font-medium text-foreground/40 transition-colors hover:text-foreground/80"
          >
            Back to login
          </Link>
        </div>

        <div className="mb-8 flex justify-center">
          <motion.div
            initial={false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", bounce: 0.5 }}
            className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[2rem] bg-gradient-to-b from-accent/20 to-accent/5 ring-1 ring-accent/20"
          >
            <div className="absolute inset-0 rounded-[2rem] bg-accent/20 blur-2xl mix-blend-screen" />
            <Mail className="relative z-10 h-8 w-8 text-accent drop-shadow-[0_0_12px_rgba(79,142,247,0.6)]" strokeWidth={1.5} />
          </motion.div>
        </div>

        <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">
          Verify your email
        </h1>

        <p className="mt-4 text-center text-[0.95rem] leading-[1.6] text-foreground/60">
          Please verify your email before continuing. We&apos;ll unlock the dashboard automatically as soon as Supabase confirms your address.
        </p>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
            <span className="text-[0.85rem] font-medium text-foreground/50">Sent to:</span>
            <span className="text-[0.9rem] font-semibold text-foreground/90">{emailParam || "your email"}</span>
          </div>
        </div>

        {resent && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-500/10 px-4 py-3 text-[0.85rem] font-medium text-green-400"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Verification email sent again
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            className="flex items-center justify-center rounded-xl bg-red-500/10 px-4 py-3 text-[0.85rem] font-medium text-red-400 text-center"
          >
            {error}
          </motion.div>
        )}

        <div className="mt-8 space-y-3">
          <button
            onClick={() => window.open(getEmailProviderLink(emailParam), "_blank")}
            className="relative flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[0.95rem] font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:-translate-y-[1px] hover:shadow-xl hover:shadow-accent/30 hover:bg-accent/90"
          >
            Open Email App
          </button>

          <button
            onClick={handleResend}
            disabled={resending}
            className="flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl border border-white/5 bg-transparent text-[0.95rem] font-medium text-foreground/70 transition-colors hover:bg-white/[0.02] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin opacity-70" />
                <span>Resending...</span>
              </>
            ) : (
              <span>Resend Email</span>
            )}
          </button>
        </div>

        <p className="mt-8 mx-auto max-w-[280px] text-center text-[0.8rem] leading-relaxed text-foreground/40">
          Didn&apos;t receive the email?<br />Check spam or resend.
        </p>
      </motion.section>
    </main>
  );
}
