"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  BrainCircuit,
  FlaskConical,
  Rocket,
  CheckCircle2,
  XCircle,
  Play,
} from "lucide-react";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export type SystemPhase =
  | "idle"
  | "building"
  | "ready"
  | "testing"
  | "deploying"
  | "success"
  | "failed";

type PhaseConfig = {
  label: string;
  icon: React.ElementType;
  color: string;        // tailwind text color
  bg: string;           // tailwind bg classes
  border: string;       // tailwind border classes
  glow?: string;        // box-shadow glow
  progress: number;     // 0-100
  animate?: boolean;    // whether the progress bar pulses
};

const PHASE_MAP: Record<SystemPhase, PhaseConfig> = {
  idle: {
    label: "Ready",
    icon: Play,
    color: "text-white/40",
    bg: "bg-white/[0.03]",
    border: "border-white/[0.06]",
    progress: 0,
  },
  building: {
    label: "Building automation",
    icon: BrainCircuit,
    color: "text-accent",
    bg: "bg-accent/[0.06]",
    border: "border-accent/20",
    glow: "0 0 16px rgba(59,130,246,0.12)",
    progress: 45,
    animate: true,
  },
  ready: {
    label: "Ready to test",
    icon: FlaskConical,
    color: "text-emerald-400",
    bg: "bg-emerald-400/[0.06]",
    border: "border-emerald-400/20",
    glow: "0 0 12px rgba(52,211,153,0.08)",
    progress: 65,
  },
  testing: {
    label: "Running test",
    icon: Loader2,
    color: "text-amber-400",
    bg: "bg-amber-400/[0.06]",
    border: "border-amber-400/20",
    glow: "0 0 16px rgba(245,158,11,0.12)",
    progress: 78,
    animate: true,
  },
  deploying: {
    label: "Deploying",
    icon: Rocket,
    color: "text-accent",
    bg: "bg-accent/[0.06]",
    border: "border-accent/20",
    glow: "0 0 20px rgba(59,130,246,0.15)",
    progress: 90,
    animate: true,
  },
  success: {
    label: "Live",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/[0.06]",
    border: "border-emerald-400/20",
    glow: "0 0 16px rgba(52,211,153,0.1)",
    progress: 100,
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/[0.06]",
    border: "border-red-400/20",
    glow: "0 0 12px rgba(248,113,113,0.1)",
    progress: 100,
  },
};

type SystemStatusBarProps = {
  phase: SystemPhase;
};

export function SystemStatusBar({ phase }: SystemStatusBarProps) {
  const reducedMotion = useReducedMotion();
  const config = PHASE_MAP[phase];
  const Icon = config.icon;
  const isSpinning = phase === "building" || phase === "testing" || phase === "deploying";

  // Show subtle Ready indicator in idle state (Task 5.3)
  if (phase === "idle") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg px-2 py-1">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_4px_rgba(52,211,153,0.3)]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/25">
          Ready
        </span>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={`flex items-center gap-2 rounded-lg border ${config.border} ${config.bg} px-2.5 py-1 transition-all duration-300`}
        style={{ boxShadow: config.glow }}
        role="status"
        aria-label={config.label}
      >
        {/* Icon */}
        {isSpinning && !reducedMotion ? (
          <Loader2 className={`h-3 w-3 animate-spin ${config.color}`} />
        ) : (
          <Icon className={`h-3 w-3 ${config.color}`} />
        )}

        {/* Label */}
        <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${config.color}`}>
          {config.label}
        </span>

        {/* Mini progress bar — only for in-progress phases */}
        {config.animate && (
          <div className="relative h-1 w-10 overflow-hidden rounded-full bg-white/[0.04] ml-0.5">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: phase === "testing"
                  ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                  : "linear-gradient(90deg, #3b82f6, #60a5fa)"
              }}
              initial={{ width: "15%" }}
              animate={reducedMotion
                ? { width: `${config.progress}%` }
                : { width: ["15%", `${config.progress}%`, "30%", `${config.progress}%`] }
              }
              transition={reducedMotion
                ? { duration: 0.3 }
                : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
              }
            />
          </div>
        )}

        {/* Completed dot for success state */}
        {phase === "success" && (
          <div className="relative ml-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            {!reducedMotion && (
              <motion.div
                className="absolute -inset-0.5 rounded-full border border-emerald-400/30"
                animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
