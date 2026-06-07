"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Zap, Wrench, Search, Cpu, Send } from "lucide-react";
import type { UIMessage } from "ai";

type AgentStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "done";
  icon: React.ReactNode;
  startedAt?: number;
};

interface AgentActivityPanelProps {
  aiMessages: UIMessage[];
  isGenerating: boolean;
  thinkingMode?: "requirements" | "building";
}

function buildStepsFromMessages(
  messages: UIMessage[],
  isGenerating: boolean,
  thinkingMode: "requirements" | "building",
): AgentStep[] {
  const hasUserMessage = messages.some((m) => m.role === "user");
  const hasAssistant = messages.some((m) => m.role === "assistant");
  const hasToolCall = messages.some((m) =>
    (m.parts || []).some((p) => {
      const part = p as { type?: string };
      return part.type?.startsWith("tool-");
    }),
  );

  if (!hasUserMessage) return [];

  const steps: AgentStep[] = [];

  if (thinkingMode === "requirements") {
    steps.push({
      id: "analyze",
      label: "Analyzing request",
      icon: <Search className="h-3.5 w-3.5" />,
      status: isGenerating ? "active" : hasAssistant ? "done" : "pending",
    });
    steps.push({
      id: "clarify",
      label: "Identifying missing details",
      icon: <Wrench className="h-3.5 w-3.5" />,
      status: isGenerating ? (steps[0].status === "done" ? "active" : "pending") : hasAssistant ? "done" : "pending",
    });
    steps.push({
      id: "respond",
      label: "Generating clarification",
      icon: <Send className="h-3.5 w-3.5" />,
      status: !isGenerating && hasAssistant ? "done" : "pending",
    });
  } else {
    steps.push({
      id: "analyze",
      label: "Analyzing workflow intent",
      icon: <Search className="h-3.5 w-3.5" />,
      status: isGenerating || hasAssistant ? "done" : "pending",
    });
    steps.push({
      id: "plan",
      label: "Planning automation structure",
      icon: <Cpu className="h-3.5 w-3.5" />,
      status: isGenerating ? "active" : hasAssistant ? "done" : "pending",
    });
    steps.push({
      id: "tool",
      label: "Building workflow graph",
      icon: <Wrench className="h-3.5 w-3.5" />,
      status: !isGenerating && hasToolCall ? "done" : isGenerating && hasAssistant ? "active" : "pending",
    });
    steps.push({
      id: "respond",
      label: "Writing response",
      icon: <Send className="h-3.5 w-3.5" />,
      status: !isGenerating && hasAssistant ? "done" : "pending",
    });
  }

  // Promote one step to "active" if generating but none is marked active yet
  if (isGenerating && !steps.some((s) => s.status === "active")) {
    const firstPending = steps.find((s) => s.status === "pending");
    if (firstPending) firstPending.status = "active";
  }

  return steps;
}

function StepIcon({ status, icon }: { status: AgentStep["status"]; icon: React.ReactNode }) {
  if (status === "done") {
    return (
      <span style={{ color: "#4ade80" }}>
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (status === "active") {
    return (
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        style={{ display: "inline-flex", color: "var(--cc-accent)" }}
      >
        <Loader2 className="h-3.5 w-3.5" />
      </motion.span>
    );
  }
  return (
    <span style={{ color: "var(--cc-text-3)", opacity: 0.4 }}>
      {icon}
    </span>
  );
}

export function AgentActivityPanel({
  aiMessages,
  isGenerating,
  thinkingMode = "building",
}: AgentActivityPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const prevGenerating = useRef(isGenerating);

  // Auto-expand when a new generation starts
  useEffect(() => {
    if (isGenerating && !prevGenerating.current) {
      setIsCollapsed(false);
    }
    prevGenerating.current = isGenerating;
  }, [isGenerating]);

  const steps = buildStepsFromMessages(aiMessages, isGenerating, thinkingMode);
  const isActive = isGenerating;
  const allDone = steps.length > 0 && steps.every((s) => s.status === "done");

  if (steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="cc-agent-panel"
      style={{
        border: "1px solid var(--cc-border)",
        borderRadius: 12,
        background: "var(--cc-bg-raised)",
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderBottom: isCollapsed ? "none" : "1px solid var(--cc-border-subtle)",
        }}
      >
        <span style={{ display: "flex", color: isActive ? "var(--cc-accent)" : allDone ? "#4ade80" : "var(--cc-text-3)" }}>
          {isActive ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-flex" }}
            >
              <Zap className="h-3.5 w-3.5" />
            </motion.span>
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: isActive ? "var(--cc-accent)" : allDone ? "#4ade80" : "var(--cc-text-3)",
          flex: 1,
          textAlign: "left",
        }}>
          Agent Activity
        </span>
        <span style={{ fontSize: 10, color: "var(--cc-text-3)" }}>
          {isCollapsed ? "▾" : "▴"}
        </span>
      </button>

      {/* Steps */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.2 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {/* Connector line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    <StepIcon status={step.status} icon={step.icon} />
                    {i < steps.length - 1 && (
                      <div style={{
                        width: 1,
                        height: 16,
                        background: step.status === "done" ? "rgba(74,222,128,0.3)" : "var(--cc-border)",
                        marginTop: 2,
                      }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: 12,
                    color: step.status === "done"
                      ? "var(--cc-text-1)"
                      : step.status === "active"
                      ? "var(--cc-accent)"
                      : "var(--cc-text-3)",
                    fontWeight: step.status === "active" ? 500 : 400,
                    paddingBottom: i < steps.length - 1 ? 16 : 0,
                  }}>
                    {step.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
