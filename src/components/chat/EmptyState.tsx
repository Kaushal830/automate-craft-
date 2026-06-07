"use client";

import React, { useCallback } from "react";
import { Workflow, FileSpreadsheet, Mail, Zap, LayoutGrid, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useChatStore } from "@/store/chat-store";
import Link from "next/link";

const SUGGESTIONS = [
  {
    icon: Workflow,
    label: "Email Follow-up Workflow",
    desc: "Automate my email follow-up workflow",
    prompt: "Automate my email follow-up workflow",
  },
  {
    icon: FileSpreadsheet,
    label: "Sheets to CRM Sync",
    desc: "Sync Google Sheets data to my CRM",
    prompt: "Sync Google Sheets data to my CRM",
  },
  {
    icon: Mail,
    label: "Form Submission Alerts",
    desc: "Send alerts when a form is submitted",
    prompt: "Send alerts when a form is submitted",
  },
  {
    icon: Zap,
    label: "WhatsApp Lead Pipeline",
    desc: "Connect WhatsApp to my lead pipeline",
    prompt: "Connect WhatsApp to my lead pipeline",
  },
];

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
  onShowTemplates?: () => void;
}

/* Cursor-follow glow tracker for cards */
function trackGlow(e: React.MouseEvent<HTMLButtonElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  e.currentTarget.style.setProperty("--mx", `${x}%`);
  e.currentTarget.style.setProperty("--my", `${y}%`);
}

export function EmptyState({ onSuggestionClick, onShowTemplates }: EmptyStateProps) {
  const { sessions } = useChatStore();

  const recentSessions = Object.entries(sessions)
    .map(([id, session]) => ({ id, ...session }))
    .filter((s) => s.chatTitle)
    .sort((a, b) => {
      const aDeployed = a.step === "deployed" ? 1 : 0;
      const bDeployed = b.step === "deployed" ? 1 : 0;
      if (bDeployed !== aDeployed) return bDeployed - aDeployed;
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    })
    .slice(0, 3);

  return (
    <div className="cc-welcome">
      {/* Animated hero icon with pulsing ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="cc-welcome__icon"
        style={{ position: "relative" }}
      >
        <Sparkles className="h-7 w-7" />
        {/* Pulsing ring */}
        <motion.div
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: 22,
            border: "1.5px solid rgba(52, 133, 255, 0.3)",
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Title */}
      <motion.h3
        className="cc-welcome__title"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        What would you like to build?
      </motion.h3>

      {/* Subtitle */}
      <motion.p
        className="cc-welcome__sub"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4 }}
      >
        Describe a workflow in plain English, or start from a template below.
      </motion.p>

      {/* Starter cards grid */}
      <div className="cc-welcome__cards">
        {SUGGESTIONS.map((chip, i) => (
          <motion.button
            key={chip.label}
            onClick={() => onSuggestionClick(chip.prompt)}
            onMouseMove={trackGlow}
            className="cc-welcome__card"
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 + i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cc-welcome__card-head">
              <div className="cc-welcome__card-icon">
                <chip.icon className="h-3.5 w-3.5" />
              </div>
              <span className="cc-welcome__card-title">{chip.label}</span>
            </div>
            <span className="cc-welcome__card-body">{chip.desc}</span>
          </motion.button>
        ))}
      </div>

      {/* Templates button */}
      {onShowTemplates && (
        <motion.button
          onClick={onShowTemplates}
          className="cc-sugg-chip"
          style={{ marginTop: 18 }}
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Browse all templates
        </motion.button>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          style={{ width: "100%", marginTop: 28, borderTop: "1px solid var(--cc-border)", paddingTop: 20 }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cc-text-3)", marginBottom: 8 }}>
            Recent
          </div>
          <div className="flex flex-col gap-1">
            {recentSessions.map((session) => {
              const isDeployed = session.step === "deployed";
              return (
                <Link
                  key={session.id}
                  href={`/dashboard/chat/${session.id}`}
                  className="flex min-h-9 items-center gap-2 rounded-lg px-2.5"
                  style={{ fontSize: 13, color: "var(--cc-text-2)", transition: "background 0.1s, color 0.1s" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--cc-bg-raised)";
                    e.currentTarget.style.color = "var(--cc-text-0)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "";
                    e.currentTarget.style.color = "var(--cc-text-2)";
                  }}
                >
                  <div
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: isDeployed ? "#4ade80" : "var(--cc-text-3)" }}
                  />
                  <span className="min-w-0 flex-1 truncate">{session.chatTitle}</span>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
