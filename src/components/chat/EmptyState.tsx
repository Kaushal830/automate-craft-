"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Workflow, FileSpreadsheet, Mail, Zap, ArrowRight, ChevronRight } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import Link from "next/link";

const CATEGORIES = ["All", "Workflows", "Integrations", "Alerts"] as const;

const SUGGESTIONS = [
  {
    icon: Workflow,
    label: "Email Follow-up Workflow",
    desc: "Automate my email follow-up workflow",
    category: "Workflows" as const,
  },
  {
    icon: FileSpreadsheet,
    label: "Sheets → CRM Sync",
    desc: "Sync Google Sheets data to my CRM",
    category: "Integrations" as const,
  },
  {
    icon: Mail,
    label: "Form Submission Alerts",
    desc: "Send alerts when a form is submitted",
    category: "Alerts" as const,
    badge: "Popular",
  },
  {
    icon: Zap,
    label: "WhatsApp Lead Pipeline",
    desc: "Connect WhatsApp to my lead pipeline",
    category: "Integrations" as const,
  },
];

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  const [activeTab, setActiveTab] = useState<(typeof CATEGORIES)[number]>("All");
  const { sessions } = useChatStore();

  const filteredSuggestions =
    activeTab === "All"
      ? SUGGESTIONS
      : SUGGESTIONS.filter((s) => s.category === activeTab);

  /* Recent sessions (Task 1.4) */
  const recentSessions = Object.entries(sessions)
    .map(([id, session]) => ({ id, ...session }))
    .filter((s) => s.chatTitle)
    .sort((a, b) => {
      const aTime = a.messages?.[a.messages.length - 1]?.timestamp ?? 0;
      const bTime = b.messages?.[b.messages.length - 1]?.timestamp ?? 0;
      return bTime - aTime;
    })
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center flex-1 h-full max-w-xl mx-auto w-full pb-[10vh]"
    >
      {/* Ambient gradient — very subtle */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[400px] rounded-full bg-accent/[0.02] blur-[100px]" />
      </div>

      {/* Task 1.1: Static logo mark — no spinning animations */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 ring-1 ring-accent/10 shadow-[0_0_24px_rgba(59,130,246,0.08)] mb-6">
          <Image
            src="/logo-new.png"
            alt="AutomateCraft"
            width={22}
            height={22}
            className="object-contain"
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        <h3 className="text-[22px] font-semibold text-white/90 mb-1.5 tracking-tight">
          What would you like to automate?
        </h3>
        <p className="text-[14px] text-white/40 mb-8 text-center max-w-[340px] leading-relaxed">
          Describe your workflow and the engine will build it.
        </p>
      </div>

      {/* Task 1.2: Category tabs */}
      <div className="relative z-10 w-full mb-5">
        <div className="flex items-center gap-1 border-b border-white/[0.04] pb-px">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`relative px-3 py-2 text-[11px] uppercase tracking-[0.08em] font-semibold transition-colors ${
                activeTab === cat
                  ? "text-white/85"
                  : "text-white/30 hover:text-white/55"
              }`}
            >
              {cat}
              {activeTab === cat && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-full"
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Task 1.3: Horizontal suggestion rows */}
      <div className="relative z-10 w-full space-y-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {filteredSuggestions.map((chip) => (
              <button
                key={chip.label}
                onClick={() => onSuggestionClick(chip.desc)}
                className="group w-full flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] px-4 py-3 text-left transition-all duration-200 hover:translate-x-1"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/[0.06] ring-1 ring-accent/[0.08] group-hover:bg-accent/10 transition-colors">
                  <chip.icon className="h-4 w-4 text-accent/50 group-hover:text-accent/70 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white/65 group-hover:text-white/90 transition-colors">
                      {chip.label}
                    </span>
                    {chip.badge && (
                      <span className="text-[9px] uppercase tracking-wider font-bold text-accent/60 bg-accent/[0.08] px-1.5 py-0.5 rounded-full">
                        {chip.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/25 group-hover:text-white/40 transition-colors">
                    {chip.desc}
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-white/0 group-hover:text-white/25 transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Task 1.4: Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="relative z-10 w-full mt-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-white/[0.04]" />
            <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-white/15">Recent</span>
            <div className="h-px flex-1 bg-white/[0.04]" />
          </div>
          <div className="space-y-1.5">
            {recentSessions.map((session) => {
              const lastMsg = session.messages?.[session.messages.length - 1];
              const isDeployed = session.step === "deployed";
              return (
                <Link
                  key={session.id}
                  href={`/dashboard/chat/${session.id}`}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.02] transition-colors"
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      isDeployed
                        ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]"
                        : "bg-amber-400/60"
                    }`}
                  />
                  <span className="text-[13px] text-white/40 group-hover:text-white/65 truncate transition-colors">
                    {session.chatTitle}
                  </span>
                  {lastMsg?.timestamp && (
                    <span className="ml-auto text-[10px] font-mono text-white/12 shrink-0">
                      {new Date(lastMsg.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
