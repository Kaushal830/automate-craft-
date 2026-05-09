"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Loader2,
  GitBranch,
  Shield,
  Radio,
  Link2,
  RotateCcw,
  Play,
} from "lucide-react";

/* ─── Timeline Definition ─── */
const DEMO_PROMPT = "When a new lead fills my form, send WhatsApp welcome and sync to CRM";

type Phase =
  | "idle"
  | "typing"
  | "analyzing"
  | "blueprint"
  | "validating"
  | "deploying"
  | "live";

const ANALYSIS_STEPS = [
  "Parsing workflow intent",
  "Identifying trigger event",
  "Mapping action sequence",
  "Resolving integrations",
];

const BLUEPRINT_NODES = [
  { type: "trigger", label: "Form submission", app: "Typeform", icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10" },
  { type: "action", label: "Parse lead data", app: "Internal", icon: ArrowRight, color: "text-accent", bg: "bg-accent/10" },
  { type: "action", label: "Send WhatsApp welcome", app: "WhatsApp", icon: Radio, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { type: "action", label: "Create CRM contact", app: "HubSpot", icon: Link2, color: "text-violet-400", bg: "bg-violet-400/10" },
];

const VALIDATION_CHECKS = [
  "Trigger configured",
  "Required fields present",
  "Credentials connected",
  "No unsafe loops detected",
  "Estimated 4 steps per run",
];

/* ─── Main Component ─── */
export default function AnimatedProductDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: "-100px" });
  const reduce = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("idle");
  const [typedChars, setTypedChars] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [nodesVisible, setNodesVisible] = useState(0);
  const [validationStep, setValidationStep] = useState(0);
  const [deployProgress, setDeployProgress] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Auto-play when in view
  useEffect(() => {
    if (isInView && !hasPlayed && phase === "idle") {
      const t = setTimeout(() => startDemo(), 600);
      return () => clearTimeout(t);
    }
  }, [isInView, hasPlayed, phase]);

  const reset = () => {
    setPhase("idle");
    setTypedChars(0);
    setAnalysisStep(0);
    setNodesVisible(0);
    setValidationStep(0);
    setDeployProgress(0);
    setHasPlayed(false);
  };

  const startDemo = () => {
    setHasPlayed(true);
    setPhase("typing");
    setTypedChars(0);
  };

  // Phase: Typing
  useEffect(() => {
    if (phase !== "typing") return;
    if (typedChars >= DEMO_PROMPT.length) {
      const t = setTimeout(() => setPhase("analyzing"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTypedChars((c) => c + 1), 30);
    return () => clearTimeout(t);
  }, [phase, typedChars]);

  // Phase: Analyzing
  useEffect(() => {
    if (phase !== "analyzing") return;
    if (analysisStep >= ANALYSIS_STEPS.length) {
      const t = setTimeout(() => setPhase("blueprint"), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setAnalysisStep((s) => s + 1), 500);
    return () => clearTimeout(t);
  }, [phase, analysisStep]);

  // Phase: Blueprint nodes assembling
  useEffect(() => {
    if (phase !== "blueprint") return;
    if (nodesVisible >= BLUEPRINT_NODES.length) {
      const t = setTimeout(() => setPhase("validating"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setNodesVisible((n) => n + 1), 400);
    return () => clearTimeout(t);
  }, [phase, nodesVisible]);

  // Phase: Validating
  useEffect(() => {
    if (phase !== "validating") return;
    if (validationStep >= VALIDATION_CHECKS.length) {
      const t = setTimeout(() => setPhase("deploying"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setValidationStep((s) => s + 1), 350);
    return () => clearTimeout(t);
  }, [phase, validationStep]);

  // Phase: Deploying
  useEffect(() => {
    if (phase !== "deploying") return;
    if (deployProgress >= 100) {
      const t = setTimeout(() => setPhase("live"), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDeployProgress((p) => Math.min(p + 10, 100)), 60);
    return () => clearTimeout(t);
  }, [phase, deployProgress]);

  const displayedPrompt = DEMO_PROMPT.slice(0, typedChars);
  const isActive = phase !== "idle";
  const showBlueprint = phase === "blueprint" || phase === "validating" || phase === "deploying" || phase === "live";
  const showValidation = phase === "validating" || phase === "deploying" || phase === "live";
  const showDeploy = phase === "deploying" || phase === "live";

  return (
    <section ref={containerRef} className="relative py-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/40 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
            See It In Action
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Watch a blueprint assemble
          </h2>
          <p className="mt-4 text-[1rem] leading-7 text-white/35 max-w-xl mx-auto">
            From workflow intent to validated, deployable automation.
            No editing, no code — this is real product behavior.
          </p>
        </div>

        {/* Demo Window */}
        <div className="relative mx-auto max-w-3xl">
          {/* Browser chrome */}
          <div className="rounded-t-xl border border-white/[0.06] border-b-0 bg-[#111] px-4 py-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1 text-[11px] text-white/25">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/40" />
                app.automatecraft.com/blueprints
              </div>
            </div>
            {phase === "live" && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={reset}
                className="flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Replay
              </motion.button>
            )}
          </div>

          {/* Main panel */}
          <div className="rounded-b-xl border border-white/[0.06] bg-[#0a0a0c] overflow-hidden min-h-[460px] flex flex-col">
            <div className="flex-1 p-5 space-y-4 overflow-hidden">
              {/* Idle state */}
              {phase === "idle" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full gap-4 py-16"
                >
                  <button
                    onClick={startDemo}
                    className="group flex items-center gap-3 rounded-full bg-accent/10 border border-accent/20 px-6 py-3 text-[14px] font-semibold text-accent transition-all hover:bg-accent/15 hover:border-accent/30"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 group-hover:bg-accent/30 transition-colors">
                      <Play className="h-3.5 w-3.5 ml-0.5" />
                    </div>
                    Watch blueprint assembly
                  </button>
                  <p className="text-[12px] text-white/20">
                    Auto-plays · Live code animation · No video
                  </p>
                </motion.div>
              )}

              {/* Intent input */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/15 mb-2">
                      Workflow intent
                    </p>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                      <p className="text-[13px] text-white/70">
                        {displayedPrompt}
                        {phase === "typing" && (
                          <span className="inline-block w-[2px] h-[14px] bg-accent ml-0.5 mb-[-2px] animate-pulse" />
                        )}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Analysis steps */}
              <AnimatePresence>
                {(phase === "analyzing" || showBlueprint) && (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-white/[0.06] bg-[#0e0e10] p-3.5"
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      {phase === "analyzing" ? (
                        <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      <span className="text-[12px] font-semibold text-white/60">
                        {phase === "analyzing" ? "Analyzing workflow intent" : "Analysis complete"}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {ANALYSIS_STEPS.map((step, i) => (
                        <motion.div
                          key={step}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{
                            opacity: i < analysisStep ? 1 : 0.3,
                            x: 0,
                          }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-2"
                        >
                          {i < analysisStep ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-400/60" />
                          ) : (
                            <div className="h-3 w-3 flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-accent/40 animate-pulse" />
                            </div>
                          )}
                          <span className={`text-[11px] ${i < analysisStep ? "text-white/35" : "text-white/15"}`}>
                            {step}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Blueprint nodes assembling */}
              {showBlueprint && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5 text-accent/60" />
                      <span className="text-[12px] font-semibold text-white/60">
                        Blueprint: Lead capture → WhatsApp + CRM
                      </span>
                    </div>
                    <span className="text-[10px] text-white/15">v1.0</span>
                  </div>
                  <div className="space-y-1.5">
                    {BLUEPRINT_NODES.map((node, i) => (
                      <AnimatePresence key={node.label}>
                        {i < nodesVisible && (
                          <motion.div
                            initial={{ opacity: 0, x: reduce ? 0 : -8, scale: reduce ? 1 : 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3.5 py-2"
                          >
                            <div className={`flex h-6 w-6 items-center justify-center rounded-md ${node.bg}`}>
                              <node.icon className={`h-3 w-3 ${node.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/15 mr-2">{node.type}</span>
                              <span className="text-[12px] text-white/55">{node.label}</span>
                            </div>
                            <span className="text-[10px] text-white/15">{node.app}</span>
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Validation */}
              {showValidation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/[0.06] bg-[#0e0e10] p-3.5"
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <Shield className={`h-3.5 w-3.5 ${phase === "validating" ? "text-accent" : "text-emerald-400"}`} />
                    <span className="text-[12px] font-semibold text-white/60">
                      {phase === "validating" ? "Running validation checks" : "Validation passed"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {VALIDATION_CHECKS.map((check, i) => (
                      <motion.div
                        key={check}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: i < validationStep ? 1 : 0.2 }}
                        className="flex items-center gap-2"
                      >
                        {i < validationStep ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400/60" />
                        ) : (
                          <div className="h-3 w-3 flex items-center justify-center">
                            <div className="h-1 w-1 rounded-full bg-white/20" />
                          </div>
                        )}
                        <span className={`text-[11px] ${i < validationStep ? "text-white/35" : "text-white/15"}`}>
                          {check}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Deploy */}
              {showDeploy && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/[0.06] bg-[#0e0e10] p-3.5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {phase === "live" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                      )}
                      <span className="text-[12px] font-semibold text-white/60">
                        {phase === "live" ? "Deployed to n8n" : "Syncing to n8n"}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      phase === "live"
                        ? "bg-emerald-400/8 text-emerald-400 border border-emerald-400/15"
                        : "bg-accent/8 text-accent/70 border border-accent/15"
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${phase === "live" ? "bg-emerald-400 animate-pulse" : "bg-accent"}`} />
                      {phase === "live" ? "Live" : "Deploying"}
                    </div>
                  </div>
                  {phase === "deploying" && (
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        className="h-full bg-accent/60 rounded-full"
                        style={{ width: `${deployProgress}%` }}
                      />
                    </div>
                  )}
                  {phase === "live" && (
                    <p className="text-[11px] text-emerald-400/50 mt-1">
                      Runtime active · Monitoring enabled · Retry handling ready
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="mt-6 text-center text-[12px] text-white/15">
          ↑ Live code animation — exactly what happens in the product.
        </p>
      </div>
    </section>
  );
}
