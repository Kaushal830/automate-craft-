"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Shield,
  RotateCcw,
  History,
  Lock,
  Eye,
  Activity,
  FileText,
} from "lucide-react";

/* ─── Execution Log Entry ─── */
const executionLog = [
  { step: "Trigger: Form submission received", status: "success", time: "0ms", detail: "webhook_id: frm_8x92k" },
  { step: "Parse: Extract lead fields", status: "success", time: "45ms", detail: "name, email, phone parsed" },
  { step: "Validate: Check required fields", status: "success", time: "12ms", detail: "All 3 required fields present" },
  { step: "Action: Send WhatsApp message", status: "success", time: "340ms", detail: "Delivered to +91 98765 43210" },
  { step: "Sync: Update Google Sheets", status: "success", time: "180ms", detail: "Row 847 appended" },
];

/* ─── Trust Proof Tiles ─── */
const trustProofs = [
  {
    icon: Shield,
    title: "Review before deploy",
    description: "Every blueprint is validated before it goes live. No accidental automations.",
    color: "text-accent",
    bg: "bg-accent/8",
  },
  {
    icon: RotateCcw,
    title: "Retry handling",
    description: "Failed steps auto-retry with smart backoff. Recovery is built in.",
    color: "text-violet-400",
    bg: "bg-violet-400/8",
  },
  {
    icon: History,
    title: "Version history",
    description: "Every edit creates a new version. Roll back any blueprint in one click.",
    color: "text-amber-400",
    bg: "bg-amber-400/8",
  },
  {
    icon: Lock,
    title: "Credential isolation",
    description: "API keys and tokens are encrypted, scoped per-workflow, and never logged.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/8",
  },
];

export default function TrustProof() {
  const reduce = useReducedMotion();

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
            Execution Trust
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Every run is logged.<br className="hidden sm:block" /> Every step is visible.
          </h2>
          <p className="mt-4 text-[1rem] leading-7 text-white/35 max-w-xl mx-auto">
            See exactly what ran, when it ran, and what happened.
            Validation before deployment, not after.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Execution log */}
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: reduce ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#111113] to-[#0d0d0f] overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/70">Execution log</p>
                    <p className="text-[10px] text-white/25">Run #847 · 2 seconds ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-400/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Success
                </div>
              </div>

              <div className="divide-y divide-white/[0.03]">
                {executionLog.map((entry, i) => (
                  <motion.div
                    key={entry.step}
                    initial={{ opacity: 0, x: reduce ? 0 : -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: reduce ? 0 : 0.3,
                      delay: reduce ? 0 : 0.15 + i * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.015] transition-colors"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/60" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-white/55">{entry.step}</p>
                      <p className="mt-0.5 text-[11px] text-white/20 font-mono">{entry.detail}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono text-white/15">{entry.time}</span>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center gap-4 border-t border-white/[0.05] px-5 py-3 text-[11px] text-white/20">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3 w-3" /> Live mode
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Full log available
                </span>
                <span className="ml-auto font-mono">Total: 577ms</span>
              </div>
            </div>
          </motion.div>

          {/* Trust proof tiles */}
          <div className="grid grid-cols-2 gap-3">
            {trustProofs.map((proof, i) => (
              <motion.div
                key={proof.title}
                initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: reduce ? 0 : 0.4,
                  delay: reduce ? 0 : 0.1 + i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${proof.bg}`}>
                  <proof.icon className={`h-4 w-4 ${proof.color}`} />
                </div>
                <h3 className="mt-3 text-[13px] font-semibold text-white/70 group-hover:text-white/90 transition-colors">
                  {proof.title}
                </h3>
                <p className="mt-1.5 text-[11px] leading-[1.5] text-white/30">
                  {proof.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
