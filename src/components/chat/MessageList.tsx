"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import Image from "next/image";
import { Check, Copy, Pencil, BrainCircuit } from "lucide-react";
import type { Message } from "@/store/chat-store";
import type { FlowNode } from "./InteractiveCanvas";
import { AiMessage } from "./AiMessage";
import { FormCard } from "./FormCard";
import { ProgressCard } from "./ProgressCard";
import { ReadyCard } from "./ReadyCard";
import { EngineAnalysisCard } from "./EngineAnalysisCard";
import { IntegrationCard, IntegrationCardSubmitted } from "./IntegrationCard";
import { ThinkingIndicator } from "./ThinkingIndicator";
import type { UIMessage } from "@ai-sdk/react";

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ── AI Avatar ── */
function AiAvatar({ isActive = false }: { isActive?: boolean }) {
  return (
    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-accent/10 shadow-[0_0_12px_rgba(59,130,246,0.08)]">
      <Image
        src="/logo-new.png"
        alt="AI"
        width={18}
        height={18}
        className="object-contain"
        style={{ width: "auto", height: "auto" }}
      />
      {isActive && (
        <motion.div
          className="absolute -inset-0.5 rounded-lg border border-accent/25"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

/* ── Typewriter for legacy Zustand messages ── */
function StreamContent({ content, timestamp }: { content: string; timestamp?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const isNew = Date.now() - (timestamp || 0) < 2000;
    const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isNew || prefersReduced) {
      setDisplayed(content);
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    let index = 0;

    const tick = () => {
      index += 2;
      if (index > content.length) index = content.length;
      setDisplayed(content.slice(0, index));
      if (index === content.length) {
        setIsStreaming(false);
        return;
      }
      const char = content[index - 1] || "";
      let delay: number;
      if (char === "." || char === "!" || char === "?") delay = 60;
      else if (char === "," || char === ";" || char === ":") delay = 40;
      else if (char === "\n") delay = 70;
      else delay = Math.max(10, 16 - Math.floor(index / 80));
      setTimeout(tick, delay);
    };

    const t = setTimeout(tick, 14);
    return () => clearTimeout(t);
  }, [content, timestamp]);

  return (
    <div className="whitespace-pre-wrap">
      {displayed}
      {isStreaming && (
        <span
          className="inline-block ml-0.5 align-middle rounded-[1px]"
          style={{
            width: "2px",
            height: "16px",
            background: "linear-gradient(180deg, #3b82f6, #60a5fa)",
            boxShadow: "0 0 8px rgba(59,130,246,0.4)",
            animation: "cursor-blink 0.8s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}

/* ── Turn Separator (Task 3.3) ── */
function TurnSeparator({ timestamp }: { timestamp?: number }) {
  return (
    <div className="flex items-center gap-3 my-4 select-none">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.04]" />
      {timestamp && (
        <span className="text-[10px] font-mono text-white/12 shrink-0">
          {formatTime(timestamp)}
        </span>
      )}
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.04]" />
    </div>
  );
}

/* ── Thinking Card (Task 4.1) ── */
function ThinkingCard() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phases = [
    "Analyzing your request...",
    "Understanding intent...",
    "Building workflow...",
    "Generating response...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % phases.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [phases.length]);

  return (
    <div className="mb-2 flex gap-3">
      <div className="pt-1.5 shrink-0">
        <AiAvatar isActive />
      </div>
      <div className="flex-1 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-accent/[0.03] border border-accent/10 px-4 py-3 overflow-hidden relative"
        >
          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/[0.04] to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/[0.08] ring-1 ring-accent/[0.1]">
              <BrainCircuit className="h-3 w-3 text-accent/60" />
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key={phaseIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-[13px] font-medium text-white/60"
              >
                {phases[phaseIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
          {/* Indeterminate bar */}
          <div className="relative h-[2px] mt-3 rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 w-1/3 rounded-full"
              style={{ background: "linear-gradient(90deg, #3b82f6, #60a5fa)" }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Hover Action Bar (Task 3.4) ── */
function MessageActions({
  msgId,
  content,
  isVisible,
  copiedId,
  onCopy,
  onEdit,
}: {
  msgId: string;
  content: string;
  isVisible: boolean;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onEdit: (text: string) => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 2 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-0.5 rounded-lg bg-[#161820] border border-white/[0.08] px-1 py-0.5 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
        >
          <button
            onClick={() => onCopy(msgId, content)}
            className="flex items-center justify-center h-6 w-6 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            title="Copy"
          >
            {copiedId === msgId ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
          <button
            onClick={() => onEdit(content)}
            className="flex items-center justify-center h-6 w-6 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MessageListProps {
  messages: Message[];
  aiMessages: UIMessage[];
  isGenerating: boolean;
  hoveredMsgId: string | null;
  copiedId: string | null;
  onHoverMsg: (id: string | null) => void;
  onCopy: (id: string, text: string) => void;
  onEdit: (text: string) => void;
  onFormSubmit: (id: string, values: any) => void;
  nodes: FlowNode[];
  currentAutomation: any;
  isTesting: boolean;
  hasTested: boolean;
  isDeploying: boolean;
  hasDeployed: boolean;
  onTest: () => void;
  onDeploy: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({
  messages,
  aiMessages,
  isGenerating,
  hoveredMsgId,
  copiedId,
  onHoverMsg,
  onCopy,
  onEdit,
  onFormSubmit,
  nodes,
  currentAutomation,
  isTesting,
  hasTested,
  isDeploying,
  hasDeployed,
  onTest,
  onDeploy,
  messagesEndRef,
}: MessageListProps) {
  /* Task 3.3: determine gap between messages based on conversation turns */
  const getMessageGap = (currentMsg: Message, index: number): string => {
    const nextMsg = messages[index + 1];
    if (!nextMsg) return "mb-2";
    // Same speaker in sequence: tight gap
    if (currentMsg.role === nextMsg.role) return "mb-2";
    // User → AI: tight (same turn)
    if (currentMsg.role === "user" && nextMsg.role === "ai") return "mb-2";
    // AI → User (new turn): separator gap
    if (currentMsg.role === "ai" && nextMsg.role === "user") return "mb-0";
    return "mb-4";
  };

  const shouldShowSeparator = (currentMsg: Message, index: number): boolean => {
    const prevMsg = messages[index - 1];
    if (!prevMsg) return false;
    // Show separator before user message that follows an AI message (new turn)
    if (currentMsg.role === "user" && prevMsg.role === "ai") return true;
    return false;
  };

  return (
    <LayoutGroup>
      <AnimatePresence initial={false}>
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id}>
            {/* Turn separator */}
            {shouldShowSeparator(msg, index) && (
              <TurnSeparator timestamp={msg.timestamp} />
            )}

            <motion.div
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={`${getMessageGap(msg, index)} ${
                msg.role === "user" ? "flex justify-end" : msg.role === "system" ? "flex justify-center" : ""
              }`}
            >
              {/* ── USER MESSAGE (Task 3.1: flat bg, no gradient, no top highlight) ── */}
              {msg.role === "user" && (
                <div
                  className="relative max-w-[70%] group/user"
                  onMouseEnter={() => onHoverMsg(msg.id)}
                  onMouseLeave={() => onHoverMsg(null)}
                >
                  <div className="rounded-2xl rounded-tr-sm bg-[#1e2028] border border-white/[0.08] px-5 py-3.5 text-[14px] leading-relaxed text-white/90 whitespace-pre-wrap shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                    {msg.content}
                  </div>

                  {/* Hover actions (Task 3.4: pill container) */}
                  <div className="flex items-center justify-end gap-1.5 mt-1 mr-1">
                    <MessageActions
                      msgId={msg.id}
                      content={msg.content}
                      isVisible={hoveredMsgId === msg.id}
                      copiedId={copiedId}
                      onCopy={onCopy}
                      onEdit={onEdit}
                    />
                    {msg.timestamp && (
                      <span className="text-[10px] font-mono text-white/12 select-none">
                        {formatTime(msg.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── AI MESSAGE (Zustand legacy) ── */}
              {msg.role === "ai" && (
                <div className="w-full flex gap-3">
                  <div className="pt-1.5 shrink-0">
                    <AiAvatar />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Unified Integration Card (Analysis + Form) */}
                    {msg.engineCards && msg.form && !msg.isFormSubmitted && (
                      <IntegrationCard
                        trigger={msg.engineCards.trigger}
                        action={msg.engineCards.action}
                        fields={msg.form.fields}
                        onSubmit={(values) => onFormSubmit(msg.id, values)}
                        timestamp={msg.timestamp}
                      />
                    )}

                    {/* Submitted state */}
                    {msg.engineCards && msg.form && msg.isFormSubmitted && (
                      <IntegrationCardSubmitted
                        trigger={msg.engineCards.trigger}
                        action={msg.engineCards.action}
                        values={msg.formValues}
                        fields={msg.form.fields}
                      />
                    )}

                    {/* Analysis-only */}
                    {msg.engineCards && !msg.form && (
                      <EngineAnalysisCard
                        trigger={msg.engineCards.trigger}
                        action={msg.engineCards.action}
                        setupFields={msg.engineCards.setupFields}
                        timestamp={msg.timestamp}
                      />
                    )}

                    {/* Standalone form */}
                    {!msg.engineCards && msg.form && !msg.isFormSubmitted && (
                      <div className="mt-3">
                        <FormCard
                          title={msg.form.title}
                          description={msg.form.description}
                          fields={msg.form.fields}
                          onSubmit={(values) => onFormSubmit(msg.id, values)}
                        />
                      </div>
                    )}

                    {/* AI text content */}
                    {msg.content && (
                      <div className="relative rounded-2xl rounded-tl-sm bg-white/[0.025] border border-white/[0.06] border-l-2 border-l-accent/20 px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.15)]">
                        <div className="text-[14px] leading-[1.75] text-white/80">
                          <StreamContent content={msg.content} timestamp={msg.timestamp} />
                        </div>
                      </div>
                    )}

                    {/* Timestamp below AI container */}
                    {msg.timestamp && (
                      <span className="pl-1 block text-[10px] font-mono text-white/12 mt-1.5 select-none">
                        {formatTime(msg.timestamp)}
                      </span>
                    )}

                    {/* Ready Card */}
                    {msg.isReadyCard && (
                      <div className="mt-3">
                        <ReadyCard
                          title="Automation ready"
                          description="Workflow built — review, test, and deploy below"
                          trigger={
                            currentAutomation?.trigger ??
                            nodes.find((node) => node.type === "trigger")?.label
                          }
                          action={
                            currentAutomation?.action ??
                            nodes.find((node) => node.type === "action")?.label
                          }
                          explanation={`When ${
                            currentAutomation?.trigger ?? "a trigger fires"
                          }, the system will automatically ${(
                            currentAutomation?.action ?? "execute the configured action"
                          ).toLowerCase()}.`}
                          isTesting={isTesting}
                          hasTested={hasTested}
                          isDeploying={isDeploying}
                          hasDeployed={hasDeployed}
                          onTest={onTest}
                          onDeploy={onDeploy}
                          onModify={() => {
                            const input = document.querySelector("textarea");
                            if (input) input.focus();
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── THINKING STATE (Zustand legacy) ── */}
              {msg.role === "thinking" && (
                <motion.div
                  className="w-full flex gap-3"
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="pt-1 shrink-0">
                    <AiAvatar isActive />
                  </div>
                  <div className="flex-1 min-w-0">
                    <ProgressCard steps={msg.content.split("\n")} />
                  </div>
                </motion.div>
              )}

              {/* ── SYSTEM MESSAGES ── */}
              {msg.role === "system" &&
                (msg.content.toLowerCase().includes("building your automation") ||
                msg.content.toLowerCase().includes("applying configuration") ? (
                  <div className="w-full">
                    <ThinkingIndicator label={msg.content} variant="card" />
                  </div>
                ) : (
                  <ThinkingIndicator label={msg.content} variant="pill" />
                ))}
            </motion.div>
          </React.Fragment>
        ))}
      </AnimatePresence>

      {/* ── REAL AI STREAMING MESSAGES (from useAutomationChat) ── */}
      {aiMessages
        .filter((m) => m.role === "assistant" || m.role === "user")
        .map((m) => {
          if (m.role === "user") {
            const textContent = Array.isArray((m as any).parts)
              ? (m as any).parts
                  .filter((p: any) => p.type === "text")
                  .map((p: any) => p.text)
                  .join("")
              : (m as any).content ?? "";

            if (textContent === "__system_test_passed__") return null;

            return (
              <motion.div
                layout
                key={m.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="mb-2 flex justify-end"
              >
                <div
                  className="relative max-w-[70%] group/user"
                  onMouseEnter={() => onHoverMsg(m.id)}
                  onMouseLeave={() => onHoverMsg(null)}
                >
                  <div className="rounded-2xl rounded-tr-sm bg-[#1e2028] border border-white/[0.06] px-5 py-3.5 text-[14px] leading-relaxed text-white/85 whitespace-pre-wrap shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                    {textContent}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1 mr-1">
                    <MessageActions
                      msgId={m.id}
                      content={textContent}
                      isVisible={hoveredMsgId === m.id}
                      copiedId={copiedId}
                      onCopy={onCopy}
                      onEdit={onEdit}
                    />
                  </div>
                </div>
              </motion.div>
            );
          }

          if (m.role === "assistant") {
            const textContent = Array.isArray((m as any).parts)
              ? (m as any).parts
                  .filter((p: any) => p.type === "text")
                  .map((p: any) => p.text)
                  .join("")
              : (m as any).content ?? "";
            
            if (!textContent && !(m as any).toolInvocations?.length) return null;

            return (
              <motion.div layout key={m.id} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
                <AiMessage
                  content={textContent}
                  isStreaming={isGenerating && m.id === aiMessages[aiMessages.length - 1]?.id}
                  timestamp={(m as any).createdAt?.getTime?.()}
                />
              </motion.div>
            );
          }

          return null;
        })}

      {/* ── Thinking card (Task 4.1: structured progress, not dots) ── */}
      {isGenerating && aiMessages[aiMessages.length - 1]?.role !== "assistant" && (
        <ThinkingCard />
      )}

      <div ref={messagesEndRef} className="h-4" />
    </LayoutGroup>
  );
}
