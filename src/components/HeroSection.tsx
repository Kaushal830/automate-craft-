"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, useScroll, useSpring, useTransform, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Send,
} from "lucide-react";
const HeroScene = dynamic(() => import("@/components/HeroScene"), { ssr: false });

import WorkflowStarters from "@/components/home/WorkflowStarters";
import StatusStrip from "@/components/home/StatusStrip";
import SocialProofStrip from "@/components/home/SocialProofStrip";
import ConnectorIntelligence from "@/components/home/ConnectorIntelligence";
import TrustProof from "@/components/home/TrustProof";
import TrustEngine from "@/components/home/TrustEngine";
import IntegrationLogoStrip from "@/components/home/IntegrationLogoStrip";
import Testimonials from "@/components/home/Testimonials";
import { LoginModal } from "@/components/auth/LoginModal";
import type { AuthenticatedUser } from "@/lib/automation";

/* ─── "How it works" steps — reframed as intent → deploy pipeline ─── */
const pipelineSteps = [
  {
    step: "01",
    title: "Describe the workflow",
    desc: "Type what you need in plain English. The AI builds the full automation in under three minutes.",
    status: "Automation generated",
    statusColor: "text-accent",
    dotColor: "bg-accent",
  },
  {
    step: "02",
    title: "Review every step",
    desc: "See exactly what runs before anything goes live. Every trigger, action, and connection is visible.",
    status: "Ready for review",
    statusColor: "text-amber-400",
    dotColor: "bg-amber-400",
  },
  {
    step: "03",
    title: "Deploy with confidence",
    desc: "Connect your apps, run a test, and go live. Retry handling and logging are built in.",
    status: "Validation passed",
    statusColor: "text-emerald-400",
    dotColor: "bg-emerald-400",
  },
];

export default function HeroSection({
  user,
  socialAuthEnabled,
  ssoEnabled,
}: {
  user: AuthenticatedUser | null;
  socialAuthEnabled: boolean;
  ssoEnabled: boolean;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [prompt, setPrompt] = useState("");
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const heightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scrollY } = useScroll();
  const heroYRaw = useTransform(scrollY, reduceMotion ? [0, 1] : [0, 280, 700], reduceMotion ? [0, 0] : [0, -16, -40]);
  const heroOpacityRaw = useTransform(scrollY, reduceMotion ? [0, 1] : [0, 600], reduceMotion ? [1, 1] : [1, 0.94]);
  const heroY = useSpring(heroYRaw, {
    stiffness: reduceMotion ? 1000 : 88,
    damping: reduceMotion ? 100 : 24,
    mass: reduceMotion ? 1 : 0.55,
  });
  const heroOpacity = useSpring(heroOpacityRaw, {
    stiffness: reduceMotion ? 1000 : 90,
    damping: reduceMotion ? 100 : 24,
    mass: reduceMotion ? 1 : 0.55,
  });

  const adjustPromptHeight = useEffectEvent(() => {
    const element = promptRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  });

  useEffect(() => {
    if (heightTimerRef.current) clearTimeout(heightTimerRef.current);
    heightTimerRef.current = setTimeout(() => adjustPromptHeight(), 60);
    return () => {
      if (heightTimerRef.current) clearTimeout(heightTimerRef.current);
    };
  }, [prompt]);

  const handleSubmit = () => {
    if (!prompt.trim()) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const chatId = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({ prompt });
    router.push(`/dashboard/chat/${chatId}?${params.toString()}`);
  };

  const handleStarterSelect = (starterPrompt: string) => {
    setPrompt(starterPrompt);
    promptRef.current?.focus();
  };

  const hasPrompt = prompt.trim().length > 0;
  const canSubmit = prompt.trim().length > 0;

  return (
    <div className="relative w-full">
      {/* ════════════════════════════════════════════
          HERO — Intent → Blueprint Surface
          ════════════════════════════════════════════ */}
      <section
        id="home"
        className="relative flex min-h-screen items-center overflow-hidden pb-10 pt-24 md:pb-14"
      >
        <HeroScene isPromptFocused={isPromptFocused} />
        {!user && (
          <div className="pointer-events-none absolute bottom-[-9rem] left-1/2 h-72 w-[46rem] -translate-x-1/2 rounded-full bg-accent/[0.05] blur-[140px]" />
        )}

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full">
            {/* ── Headline ── */}
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-10"
            >
              <h1 className="mx-auto max-w-4xl text-[3rem] font-semibold leading-[0.94] tracking-[-0.04em] text-foreground sm:text-[4rem] lg:text-[4.8rem]">
                {user
                  ? <>Describe it.<br /><span className="text-accent">Deploy it.</span></>
                  : <>Describe the workflow.<br /><span className="text-accent">Review every step.</span><br />Run it with confidence.</>}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[1rem] leading-8 text-white/45 sm:text-lg">
                {user
                  ? "Describe what you need — we'll build and test it for you."
                  : "Tell us what to automate. We'll build it, test it, and deploy it."}
              </p>
            </motion.div>

            {/* ── Centered Composer ── */}
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.85,
                delay: reduceMotion ? 0 : 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mx-auto max-w-3xl"
            >
              <div className="space-y-4">
                <div
                  className="group relative cursor-text"
                  onClick={() => promptRef.current?.focus()}
                >
                  <div className="relative">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-56 w-full rounded-full bg-accent/5 blur-[80px]"
                    />

                    <div className="rounded-[16px] bg-[#0a0a0a] p-1.5 text-left shadow-[0_24px_50px_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.1)] transition-[box-shadow,transform] duration-300 ease-out group-hover:shadow-[0_0_80px_rgba(79,142,247,0.12),0_32px_60px_rgba(79,142,247,0.1),0_16px_32px_rgba(28,28,28,0.12)]">
                      <div
                        className={`relative isolate overflow-hidden rounded-[16px] border px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out sm:px-5 sm:py-4.5 ${
                          hasPrompt
                            ? "border-accent/50 shadow-[0_0_0_4px_rgba(59,130,246,0.2),0_16px_34px_rgba(59,130,246,0.15)] scale-[1.01]"
                            : isPromptFocused
                            ? "border-accent/40 shadow-[0_0_0_3px_rgba(59,130,246,0.1),0_16px_34px_rgba(0,0,0,0.4)] scale-[1.005]"
                            : "border-white/10 group-hover:border-white/20 group-hover:shadow-[0_18px_42px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)]"
                        }`}
                      >
                        <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[linear-gradient(180deg,#1c1c1c_0%,#0a0a0a_100%)]" />
                        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/15 blur-[1px]" />

                        {/* Label */}
                        <div className="relative mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
                            Describe your automation
                          </span>
                        </div>

                        <div className="relative">
                          {!prompt ? (
                            <div className="pointer-events-none absolute inset-0 text-[1rem] leading-[1.55] sm:text-[1.05rem] overflow-hidden">
                              <span className="text-white/30">
                                Describe the automation you want to build...
                              </span>
                            </div>
                          ) : null}

                          <textarea
                            ref={promptRef}
                            rows={1}
                            value={prompt}
                            onFocus={() => setIsPromptFocused(true)}
                            onBlur={() => setIsPromptFocused(false)}
                            onChange={(event) => setPrompt(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                if (canSubmit) handleSubmit();
                              }
                            }}
                            className="prompt-textarea caret-accent min-h-[72px] w-full resize-none border-none bg-transparent text-[1rem] leading-[1.55] text-white outline-none sm:min-h-[78px] sm:text-[1.05rem]"
                          />
                        </div>

                        {/* Bottom bar */}
                        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3.5">
                          <p className="text-[12px] font-medium tracking-[0.02em] text-white/25 hidden sm:block">
                            ↵ Generate automation
                          </p>

                          <motion.button
                            onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                            disabled={!canSubmit}
                            aria-label="Generate automation"
                            whileTap={canSubmit && !reduceMotion ? { scale: 0.94 } : undefined}
                            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[12px] font-semibold transition-all duration-300 ease-out z-10 ${
                              canSubmit
                                ? "bg-accent text-white shadow-[0_8px_18px_rgba(79,142,247,0.3)] hover:scale-[1.03] hover:bg-[#5c95fb]"
                                : "bg-white/10 text-white/30 opacity-80 border border-white/5"
                            }`}
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Generate automation</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow starters */}
                {!hasPrompt && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reduceMotion ? 0 : 0.5, duration: reduceMotion ? 0 : 0.5 }}
                  >
                    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/15">
                      Start with a real workflow
                    </p>
                    <WorkflowStarters onSelect={handleStarterSelect} />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* ── Status Strip ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduceMotion ? 0 : 1.0, duration: reduceMotion ? 0 : 0.8 }}
              className="mt-10"
            >
              <StatusStrip activeStage={3} />
              <div className="mt-5">
                <SocialProofStrip />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Sign-in Modal for unauthenticated anonymous attempts */}
      <LoginModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        nextUrl={`/dashboard/chat/new?prompt=${encodeURIComponent(prompt)}`}
      />

      {/* ══ Below-the-fold sections — only for public visitors ══ */}
      {!user && (
        <div className="relative overflow-hidden pt-12">
          {/* Ambient light */}
          <div className="pointer-events-none absolute left-[-12%] top-24 h-72 w-72 rounded-full bg-accent/[0.06] blur-[120px]" />
          <div className="pointer-events-none absolute right-[-10%] top-[28rem] h-80 w-80 rounded-full bg-white/[0.03] blur-[140px]" />
          <div className="pointer-events-none absolute bottom-[-8rem] left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-accent/[0.04] blur-[160px]" />

          {/* ═══ SECTION 1: From Intent to Deployment ═══ */}
          <section className="relative py-28 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/35 to-transparent" />
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-[60%] bg-gradient-to-r from-transparent via-accent/15 to-transparent" />

            <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
              <div className="mb-20 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
                  How It Works
                </span>
                <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  From a sentence to<br className="hidden sm:block" /> a running workflow
                </h2>
                <p className="mt-4 text-[1rem] leading-7 text-white/35 max-w-xl mx-auto">
                  Three steps. Every time.
                </p>
              </div>

              {/* Pipeline steps */}
              <div className="grid gap-6 md:grid-cols-3">
                {pipelineSteps.map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.6,
                      delay: reduceMotion ? 0 : i * 0.12,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="group relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-[#111113] to-[#0d0d0f] p-8 transition-all duration-300 hover:border-white/[0.1] hover:shadow-[0_20px_48px_rgba(0,0,0,0.6)]"
                  >
                    {/* Step number */}
                    <p className="mb-6 font-mono text-[11px] font-bold tracking-[0.3em] text-white/15">
                      {item.step}
                    </p>

                    <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-[14px] leading-7 text-white/35">
                      {item.desc}
                    </p>

                    {/* Status indicator */}
                    <div className="mt-5 flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${item.dotColor}`} />
                      <span className={`text-[11px] font-semibold ${item.statusColor}`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Connector */}
                    {i < 2 && (
                      <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.06] bg-[#0d0d0f]">
                          <ArrowRight className="h-3 w-3 text-white/20" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-14 text-center">
                <Link
                  href="/signup"
                  className="cta-glow inline-flex h-13 items-center gap-2.5 rounded-full bg-gradient-to-r from-accent to-blue-600 px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(59,130,246,0.3)] transition-all duration-200 hover:shadow-[0_8px_32px_rgba(59,130,246,0.4)] hover:translate-y-[-2px]"
                >
                  Start building for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-4 text-[12px] text-white/20">10 free credits on signup · No card required</p>
              </div>
            </div>
          </section>

          {/* ═══ SECTION 2: Connector Intelligence ═══ */}
          <ConnectorIntelligence />

          {/* ═══ SECTION 3: Runtime Trust ═══ */}
          <TrustProof />

          {/* ═══ SECTION 4: Infrastructure Trust (replaces fake testimonials) ═══ */}
          <TrustEngine />

          {/* ═══ SECTION 5: Integration Logo Strip (verified tools) ═══ */}
          <IntegrationLogoStrip />

          {/* ═══ Testimonials — renders null until real quotes exist ═══ */}
          <Testimonials />

          {/* ═══ SECTION 5: Final CTA ═══ */}
          <section className="relative py-28 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/40 to-transparent" />
            <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto max-w-2xl text-center"
              >
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Your first automation<br />takes 90 seconds.
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-white/35">
                  Describe, review, and deploy — all in one platform. Powered by n8n.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/signup"
                    className="cta-glow inline-flex h-12 items-center gap-2 rounded-full bg-accent px-8 text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_32px_rgba(59,130,246,0.35)] hover:-translate-y-0.5"
                  >
                    Start automating for free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/why-us"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-8 text-[15px] font-medium text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
                  >
                    Explore real workflows
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
