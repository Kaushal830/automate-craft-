"use client";

import React from "react";
import { Workflow, FileSpreadsheet, Mail, Zap, LayoutGrid } from "lucide-react";
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

export function EmptyState({ onSuggestionClick, onShowTemplates }: EmptyStateProps) {
  const { sessions } = useChatStore();

  /* Recent sessions — Phase 2 removed message persistence so we can no longer
   * sort by last-message timestamp. Insertion order from Object.entries is
   * stable in modern engines; deployed sessions float to the top.
   * Phase 3 will add `updatedAt` to ChatSession for proper ordering. */
  const recentSessions = Object.entries(sessions)
    .map(([id, session]) => ({ id, ...session }))
    .filter((s) => s.chatTitle)
    .sort((a, b) => {
      const aDeployed = a.step === "deployed" ? 1 : 0;
      const bDeployed = b.step === "deployed" ? 1 : 0;
      return bDeployed - aDeployed;
    })
    .slice(0, 3);

  return (
    <div className="cc-welcome">
      {/* Icon */}
      <div className="cc-welcome__icon">
        <Zap className="h-7 w-7" />
      </div>

      {/* Title */}
      <h3 className="cc-welcome__title">What would you like to build?</h3>

      {/* Subtitle */}
      <p className="cc-welcome__sub">
        Describe a workflow in plain English, or start from a template below.
      </p>

      {/* Starter cards grid */}
      <div className="cc-welcome__cards">
        {SUGGESTIONS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => onSuggestionClick(chip.prompt)}
            className="cc-welcome__card"
            type="button"
          >
            <div className="cc-welcome__card-head">
              <div className="cc-welcome__card-icon">
                <chip.icon className="h-3.5 w-3.5" />
              </div>
              <span className="cc-welcome__card-title">{chip.label}</span>
            </div>
            <span className="cc-welcome__card-body">{chip.desc}</span>
          </button>
        ))}
      </div>

      {/* Templates button */}
      {onShowTemplates && (
        <button
          onClick={onShowTemplates}
          className="cc-sugg-chip"
          style={{ marginTop: 18 }}
          type="button"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Browse all templates
        </button>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div style={{ width: "100%", marginTop: 28, borderTop: "1px solid var(--cc-border)", paddingTop: 20 }}>
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
        </div>
      )}
    </div>
  );
}
