"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  | "clarifying"
  | "building"
  | "ready"
  | "testing"
  | "deploying"
  | "success"
  | "failed"
  | "retrying"
  | "rate_limited"
  | "context_warning";

type PhaseConfig = {
  label: string;
  dotColor: string;
  textColor: string;
  pulse?: boolean;
};

const PHASE_MAP: Record<SystemPhase, PhaseConfig> = {
  idle: {
    label: "Ready",
    dotColor: "#4ade80",
    textColor: "var(--cc-text-2)",
  },
  clarifying: {
    label: "Clarifying",
    dotColor: "var(--cc-accent)",
    textColor: "var(--cc-accent)",
    pulse: true,
  },
  building: {
    label: "Building",
    dotColor: "var(--cc-accent)",
    textColor: "var(--cc-accent)",
    pulse: true,
  },
  ready: {
    label: "Ready to test",
    dotColor: "#4ade80",
    textColor: "#4ade80",
  },
  testing: {
    label: "Testing",
    dotColor: "#fbbf24",
    textColor: "#fbbf24",
    pulse: true,
  },
  deploying: {
    label: "Deploying",
    dotColor: "var(--cc-accent)",
    textColor: "var(--cc-accent)",
    pulse: true,
  },
  success: {
    label: "Live",
    dotColor: "#4ade80",
    textColor: "#4ade80",
  },
  failed: {
    label: "Failed",
    dotColor: "#f87171",
    textColor: "#f87171",
  },
  retrying: {
    label: "Retrying...",
    dotColor: "#fbbf24",
    textColor: "#fbbf24",
    pulse: true,
  },
  rate_limited: {
    label: "Rate limited",
    dotColor: "#f87171",
    textColor: "#f87171",
  },
  context_warning: {
    label: "Context near limit",
    dotColor: "#fbbf24",
    textColor: "#fbbf24",
    pulse: true,
  },
};

type SystemStatusBarProps = {
  phase: SystemPhase;
};

export function SystemStatusBar({ phase }: SystemStatusBarProps) {
  const reducedMotion = useReducedMotion();
  const config = PHASE_MAP[phase];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
        transition={{ duration: 0.2 }}
        className="cc-hbtn"
        style={{ cursor: "default", gap: 6 }}
        role="status"
        aria-label={config.label}
      >
        {/* Status dot */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: config.dotColor,
              boxShadow: `0 0 4px ${config.dotColor}`,
            }}
          />
          {config.pulse && !reducedMotion && (
            <motion.div
              style={{
                position: "absolute",
                inset: -2,
                borderRadius: "50%",
                border: `1px solid ${config.dotColor}`,
              }}
              animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          )}
        </div>

        {/* Label */}
        <span style={{ fontSize: 11, fontWeight: 500, color: config.textColor }}>
          {config.label}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
