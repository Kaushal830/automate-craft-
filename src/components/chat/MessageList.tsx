"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, CheckCircle2, Copy, Pencil, Zap } from "lucide-react";
import type { UIMessage } from "ai";
import type { Message } from "@/store/chat-store";
import { AiMessage } from "./AiMessage";

/**
 * Legacy in-chat cards (FormCard, IntegrationCard, EngineAnalysisCard,
 * ReadyCard, ProgressCard, ThinkingIndicator) were deleted during the
 * workspace-native refactor. Phase 1 keeps the props surface backward-
 * compatible and removes all dead render branches that referenced those
 * components. Phase 2 will drop the `messages` (Zustand) loop entirely
 * once useChat becomes the canonical source.
 */

type UIMessagePart = UIMessage["parts"][number];
type TextPart = Extract<UIMessagePart, { type: "text" }>;

interface MessageListProps {
  messages: Message[];
  aiMessages: UIMessage[];
  isGenerating: boolean;
  hoveredMsgId: string | null;
  copiedId: string | null;
  onHoverMsg: (id: string | null) => void;
  onCopy: (id: string, text: string) => void;
  onEdit: (text: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const thinkingPhases = [
  "Analyzing your request...",
  "Understanding intent...",
  "Building workflow...",
  "Generating response...",
];

function isTextPart(part: UIMessagePart): part is TextPart {
  return part.type === "text";
}

function getUiMessageText(message: UIMessage) {
  return message.parts.filter(isTextPart).map((part) => part.text).join("");
}

function hasLegacyToolInvocations(message: UIMessage) {
  const legacyMessage = message as UIMessage & { toolInvocations?: unknown };
  return Array.isArray(legacyMessage.toolInvocations) && legacyMessage.toolInvocations.length > 0;
}

function getUiMessageTimestamp(message: UIMessage) {
  const value = (message as UIMessage & { createdAt?: Date | string | number }).createdAt;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return new Date(value).getTime();
  return undefined;
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ── AI Avatar (Claude bolt mark) ── */
function AiAvatar({ isActive = false }: { isActive?: boolean }) {
  return (
    <div className={`cc-ai-mark${isActive ? " is-breath" : ""}`}>
      <Zap className="h-3.5 w-3.5" />
    </div>
  );
}

/* ── Streaming text with word-by-word reveal ── */
function StreamContent({ content, timestamp }: { content: string; timestamp?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const isNew = Date.now() - (timestamp || 0) < 2000;
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!isNew || prefersReduced) {
      setDisplayed(content);
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      index += 2;
      if (index > content.length) index = content.length;
      setDisplayed(content.slice(0, index));
      if (index === content.length) {
        setIsStreaming(false);
        return;
      }

      const char = content[index - 1] || "";
      const delay = char === "." || char === "!" || char === "?" ? 60 : char === "," || char === ";" || char === ":" ? 40 : char === "\n" ? 70 : Math.max(10, 16 - Math.floor(index / 80));
      timeoutId = setTimeout(tick, delay);
    };

    timeoutId = setTimeout(tick, 14);
    return () => clearTimeout(timeoutId);
  }, [content, timestamp]);

  return (
    <div className="whitespace-pre-wrap">
      {displayed}
      {isStreaming && <span className="cc-caret" />}
    </div>
  );
}

/* ── Thinking indicator (Claude-style dots + shimmer) ── */
function ThinkingCard() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % thinkingPhases.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  return (
    <div className="cc-msg cc-msg--ai cc-msg--thinking">
      <AiAvatar isActive />
      <div className="cc-msg__body">
        <div className="flex items-center gap-3" style={{ fontSize: 14 }}>
          <div className="cc-dots">
            <span /><span /><span />
          </div>
          <AnimatePresence mode="wait">
            <motion.span
              key={phaseIndex}
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="cc-thinking-text"
            >
              {thinkingPhases[phaseIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── System notice ── */
function SystemNotice({ label }: { label: string }) {
  const isError = /error|failed|rate limit|credits/i.test(label);

  return (
    <div className={`cc-system-notice${isError ? " cc-system-notice--error" : " cc-system-notice--success"}`} role="status">
      <div style={{
        width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center", flexShrink: 0,
        background: isError ? "rgba(251,191,36,0.12)" : "rgba(74,222,128,0.12)",
        color: isError ? "#fbbf24" : "#4ade80",
      }}>
        {isError ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      </div>
      <p style={{ fontSize: 13, color: isError ? "#fbbf24" : "#4ade80", fontWeight: 500 }}>{label}</p>
    </div>
  );
}

/* ── User message action buttons ── */
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.12 }}
          className="flex items-center gap-0.5"
          style={{ borderRadius: 6, border: "1px solid var(--cc-border)", background: "var(--cc-bg-raised)", padding: "2px 4px" }}
        >
          <button
            onClick={() => onCopy(msgId, content)}
            className="cc-msg__copy"
            style={{ opacity: 1 }}
            title="Copy"
            type="button"
          >
            {copiedId === msgId ? <Check className="h-3 w-3" style={{ color: "#4ade80" }} /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={() => onEdit(content)}
            className="cc-msg__copy"
            style={{ opacity: 1 }}
            title="Edit"
            type="button"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
  messagesEndRef,
}: MessageListProps) {
  const lastAiMessage = aiMessages[aiMessages.length - 1];

  return (
    <LayoutGroup>
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <React.Fragment key={msg.id}>
            <motion.div
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* ── User messages (legacy Zustand path; Phase 2 removes) ── */}
              {msg.role === "user" && (
                <div
                  className="cc-msg cc-msg--user"
                  onMouseEnter={() => onHoverMsg(msg.id)}
                  onMouseLeave={() => onHoverMsg(null)}
                >
                  <div className="flex flex-col items-end gap-1">
                    <div className="cc-msg__body">
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1.5 mr-1">
                      <MessageActions
                        msgId={msg.id}
                        content={msg.content}
                        isVisible={hoveredMsgId === msg.id}
                        copiedId={copiedId}
                        onCopy={onCopy}
                        onEdit={onEdit}
                      />
                      {msg.timestamp && (
                        <span style={{ fontFamily: "var(--cc-mono)", fontSize: 10, color: "var(--cc-text-3)" }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── AI text messages (legacy Zustand path; Phase 2 removes) ── */}
              {msg.role === "ai" && msg.content && (
                <div className="cc-msg cc-msg--ai">
                  <AiAvatar />
                  <div className="cc-msg__body">
                    <div className="cc-msg__text">
                      <StreamContent content={msg.content} timestamp={msg.timestamp} />
                    </div>
                    {msg.timestamp && (
                      <span style={{ display: "block", paddingLeft: 1, marginTop: 6, fontFamily: "var(--cc-mono)", fontSize: 10, color: "var(--cc-text-3)" }}>
                        {formatTime(msg.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Thinking + system notices collapse to SystemNotice ── */}
              {(msg.role === "thinking" || msg.role === "system") && msg.content && (
                <SystemNotice label={msg.content} />
              )}
            </motion.div>
          </React.Fragment>
        ))}
      </AnimatePresence>

      {/* ── AI SDK streaming messages (canonical source) ── */}
      {aiMessages
        .filter((message) => message.role === "assistant" || message.role === "user")
        .map((message) => {
          if (message.role === "user") {
            const textContent = getUiMessageText(message);
            if (textContent === "__system_test_passed__") return null;

            return (
              <motion.div
                layout
                key={message.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className="cc-msg cc-msg--user"
                  onMouseEnter={() => onHoverMsg(message.id)}
                  onMouseLeave={() => onHoverMsg(null)}
                >
                  <div className="flex flex-col items-end gap-1">
                    <div className="cc-msg__body">{textContent}</div>
                    <MessageActions
                      msgId={message.id}
                      content={textContent}
                      isVisible={hoveredMsgId === message.id}
                      copiedId={copiedId}
                      onCopy={onCopy}
                      onEdit={onEdit}
                    />
                  </div>
                </div>
              </motion.div>
            );
          }

          const textContent = getUiMessageText(message);
          if (!textContent && !hasLegacyToolInvocations(message)) return null;

          return (
            <motion.div
              layout
              key={message.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              data-assistant-state={isGenerating && message.id === lastAiMessage?.id ? "streaming" : "resolved"}
            >
              <AiMessage
                content={textContent}
                isStreaming={isGenerating && message.id === lastAiMessage?.id}
                timestamp={getUiMessageTimestamp(message)}
              />
            </motion.div>
          );
        })}

      {/* ── Thinking card when waiting for first token ── */}
      {isGenerating && lastAiMessage?.role !== "assistant" && <ThinkingCard />}

      <div ref={messagesEndRef} className="h-4" />
    </LayoutGroup>
  );
}
