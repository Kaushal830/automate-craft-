"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  GitBranch,
  Pencil,
  PlayCircle,
  RefreshCw,
  Rocket,
  ThumbsDown,
  ThumbsUp,
  Workflow,
  Zap,
} from "lucide-react";
import type { UIMessage } from "ai";
import { AiMessage } from "./AiMessage";
import { ClarificationCard } from "./ClarificationCard";
import { QuickReplies } from "./QuickReplies";

/**
 * Single canonical message source: AI SDK `useChat`.
 *
 * `aiMessages` is the conversation (user + assistant). `notices` is a
 * separate stream of ephemeral system feedback (test/deploy confirmations,
 * provider errors) owned by ChatContainer's local state — never persisted,
 * never sent to the model.
 *
 * Legacy Zustand `messages: Message[]` field was removed in Phase 2.
 */

export type Notice = {
  id: string;
  content: string;
  timestamp: number;
  kind: "info" | "error";
};

type UIMessagePart = UIMessage["parts"][number];
type TextPart = Extract<UIMessagePart, { type: "text" }>;
type ThinkingMode = "requirements" | "building";
type WorkflowCardNode = {
  id?: string;
  type?: "trigger" | "process" | "action";
  label?: string;
  detail?: string;
};
type WorkflowOutput = {
  nodes?: unknown;
  workflowName?: unknown;
  summary?: unknown;
};
type WorkflowToolPart = {
  type?: string;
  toolName?: string;
  state?: string;
  output?: unknown;
};
type LegacyToolCall = {
  toolName?: string;
  result?: unknown;
};

const COLLAPSE_THRESHOLD = 12; // collapse messages when count exceeds this

interface MessageListProps {
  aiMessages: UIMessage[];
  notices: Notice[];
  isGenerating: boolean;
  hoveredMsgId: string | null;
  copiedId: string | null;
  onHoverMsg: (id: string | null) => void;
  onCopy: (id: string, text: string) => void;
  onEdit: (text: string) => void;
  onRegenerate?: () => void;
  onFeedback?: (messageId: string, rating: 1 | -1) => void;
  onQuickReply?: (text: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  thinkingMode?: ThinkingMode;
  feedbackLog?: Array<{ messageId: string; rating: 1 | -1 }>;
}

const buildThinkingPhases = [
  "Analyzing workflow intent...",
  "Planning automation structure...",
  "Mapping execution steps...",
  "Connecting workflow nodes...",
  "Validating trigger conditions...",
  "Preparing deployment logic...",
  "Optimizing execution flow...",
  "Generating automation pipeline...",
  "Verifying integrations...",
  "Streaming response...",
];

const requirementThinkingPhases = [
  "Analyzing missing requirements...",
  "Checking integration details...",
  "Identifying unresolved fields...",
  "Preparing clarification questions...",
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

function isWorkflowOutput(value: unknown): value is WorkflowOutput {
  return typeof value === "object" && value !== null;
}

function readWorkflowOutput(message: UIMessage): WorkflowOutput | null {
  const legacyCalls = (message as UIMessage & { toolInvocations?: unknown }).toolInvocations;
  if (Array.isArray(legacyCalls)) {
    const legacyResult = (legacyCalls as LegacyToolCall[]).find(
      (call) => call.toolName === "buildWorkflow" && isWorkflowOutput(call.result),
    )?.result;
    if (isWorkflowOutput(legacyResult)) return legacyResult;
  }

  for (const part of message.parts || []) {
    const toolPart = part as WorkflowToolPart;
    const isBuildWorkflow =
      toolPart.type === "tool-buildWorkflow" ||
      (toolPart.type === "dynamic-tool" && toolPart.toolName === "buildWorkflow");

    if (isBuildWorkflow && toolPart.state === "output-available" && isWorkflowOutput(toolPart.output)) {
      return toolPart.output;
    }
  }

  return null;
}

function readWorkflowNodes(output: WorkflowOutput): WorkflowCardNode[] {
  if (!Array.isArray(output.nodes)) return [];

  return output.nodes
    .filter((node): node is WorkflowCardNode => typeof node === "object" && node !== null)
    .slice(0, 6);
}

function getUiMessageTimestamp(message: UIMessage) {
  const value = (message as UIMessage & { createdAt?: Date | string | number }).createdAt;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return new Date(value).getTime();
  return undefined;
}

/* ── AI Avatar (Claude bolt mark) ── */
function AiAvatar({ isActive = false }: { isActive?: boolean }) {
  return (
    <div className={`cc-ai-mark${isActive ? " is-breath" : ""}`}>
      <Zap className="h-3.5 w-3.5" />
    </div>
  );
}

/* ── Thinking indicator (Claude-style dots + shimmer) ── */
function getThinkingPhases(mode: ThinkingMode) {
  return mode === "requirements" ? requirementThinkingPhases : buildThinkingPhases;
}

function useThinkingPhase(enabled = true, phases = buildThinkingPhases) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!enabled) {
      setPhaseIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % phases.length);
    }, 1900);

    return () => clearInterval(interval);
  }, [enabled, phases]);

  return {
    label: phases[phaseIndex % phases.length],
    phaseIndex,
    reducedMotion,
  };
}

function ThinkingCard({ mode }: { mode: ThinkingMode }) {
  const { label, phaseIndex, reducedMotion } = useThinkingPhase(true, getThinkingPhases(mode));

  return (
    <div className="cc-msg cc-msg--ai cc-msg--thinking">
      <AiAvatar isActive />
      <div className="cc-msg__body">
        <div className="cc-thinking-shell" aria-live="polite">
          <div className="cc-activity-row">
            <div className="cc-dots" aria-hidden="true">
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
                {label}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="cc-thinking-lines" aria-hidden="true">
            <span className="cc-skeleton-line cc-skeleton-line--wide" />
            <span className="cc-skeleton-line cc-skeleton-line--mid" />
            <span className="cc-skeleton-line cc-skeleton-line--short" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── System notice ── */
function SystemNotice({ label }: { label: string }) {
  const isError = /error|failed|rate limit|credits/i.test(label);
  const title = isError ? "Action needed" : "Workspace update";

  return (
    <div className={`cc-system-notice${isError ? " cc-system-notice--error" : " cc-system-notice--success"}`} role="status">
      <div className="cc-system-notice__icon">
        {isError ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      </div>
      <div className="cc-system-notice__copy">
        <span className="cc-system-notice__title">{title}</span>
        <p>{label}</p>
      </div>
    </div>
  );
}

function WorkflowResultCard({ output }: { output: WorkflowOutput }) {
  const nodes = readWorkflowNodes(output);
  const workflowName =
    typeof output.workflowName === "string" && output.workflowName.trim()
      ? output.workflowName.trim()
      : "Automation workflow";
  const summary =
    typeof output.summary === "string" && output.summary.trim()
      ? output.summary.trim()
      : nodes.map((node) => node.label).filter(Boolean).join(" -> ");
  const completedCount = nodes.length;

  if (nodes.length === 0 && !summary) return null;

  return (
    <div className="cc-workflow-card" role="group" aria-label="Generated workflow summary">
      <div className="cc-workflow-card__header">
        <div className="cc-workflow-card__mark">
          <Workflow className="h-4 w-4" />
        </div>
        <div>
          <div className="cc-workflow-card__eyebrow">Workflow generated</div>
          <h3>{workflowName}</h3>
        </div>
        <span className="cc-workflow-card__badge">{completedCount} step{completedCount === 1 ? "" : "s"}</span>
      </div>

      {summary && <p className="cc-workflow-card__summary">{summary}</p>}

      {nodes.length > 0 && (
        <div className="cc-workflow-steps">
          {nodes.map((node, index) => (
            <div key={node.id || `${node.label}-${index}`} className="cc-workflow-step">
              <div className={`cc-workflow-step__icon cc-workflow-step__icon--${node.type || "process"}`}>
                {node.type === "trigger" ? (
                  <Zap className="h-3.5 w-3.5" />
                ) : node.type === "action" ? (
                  <Rocket className="h-3.5 w-3.5" />
                ) : (
                  <GitBranch className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="cc-workflow-step__copy">
                <span className="cc-workflow-step__kind">{node.type || "process"}</span>
                <strong>{node.label || `Step ${index + 1}`}</strong>
                {node.detail && <p>{node.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="cc-workflow-card__footer">
        <button type="button"><PlayCircle className="h-3.5 w-3.5" /> Run a test</button>
        <button type="button"><Workflow className="h-3.5 w-3.5" /> Review flow</button>
        <button type="button"><Rocket className="h-3.5 w-3.5" /> Deploy when ready</button>
      </div>
    </div>
  );
}

/* ── Message action buttons ── */
function MessageActionButton({
  label,
  copied,
  onClick,
  icon,
}: {
  label: string;
  copied?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`cc-msg-action-btn${copied ? " is-copied" : ""}`}
      onClick={onClick}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
    >
      {copied ? <Check className="h-3 w-3" /> : icon}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

/* ── AI Feedback Buttons ── */
function FeedbackButtons({
  messageId,
  isVisible,
  currentRating,
  onFeedback,
}: {
  messageId: string;
  isVisible: boolean;
  currentRating?: 1 | -1;
  onFeedback?: (id: string, rating: 1 | -1) => void;
}) {
  const [submitted, setSubmitted] = useState<1 | -1 | null>(currentRating ?? null);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.12 }}
          className="flex items-center gap-0.5 mt-1.5"
          style={{ borderRadius: 6, border: "1px solid var(--cc-border)", background: "var(--cc-bg-raised)", padding: "2px 4px" }}
        >
          <button
            type="button"
            title="Good response"
            className="cc-msg__copy"
            style={{ opacity: 1, color: submitted === 1 ? "#4ade80" : undefined }}
            onClick={() => {
              setSubmitted(1);
              onFeedback?.(messageId, 1);
            }}
          >
            <ThumbsUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Poor response"
            className="cc-msg__copy"
            style={{ opacity: 1, color: submitted === -1 ? "#f87171" : undefined }}
            onClick={() => {
              setSubmitted(-1);
              onFeedback?.(messageId, -1);
            }}
          >
            <ThumbsDown className="h-3 w-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MessageList({
  aiMessages,
  notices,
  isGenerating,
  hoveredMsgId,
  copiedId,
  onHoverMsg,
  onCopy,
  onEdit,
  onRegenerate,
  onFeedback,
  onQuickReply,
  messagesEndRef,
  thinkingMode = "building",
  feedbackLog = [],
}: MessageListProps) {
  const [showAll, setShowAll] = useState(false);
  const lastAiMessage = aiMessages[aiMessages.length - 1];
  const { label: activeThinkingLabel } = useThinkingPhase(
    isGenerating,
    getThinkingPhases(thinkingMode),
  );

  const visibleMessages = (() => {
    const filtered = aiMessages.filter(
      (message) => message.role === "assistant" || message.role === "user",
    );
    if (filtered.length <= COLLAPSE_THRESHOLD || showAll) return filtered;
    return filtered.slice(-(COLLAPSE_THRESHOLD));
  })();

  const hiddenCount = aiMessages.filter(
    (m) => m.role === "assistant" || m.role === "user",
  ).length - visibleMessages.length;

  return (
    <LayoutGroup>
      {/* ── Collapse indicator ── */}
      {hiddenCount > 0 && !showAll && (
        <motion.button
          type="button"
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowAll(true)}
          className="flex items-center gap-2 w-full justify-center py-2 rounded-lg"
          style={{
            fontSize: 12,
            color: "var(--cc-text-3)",
            border: "1px dashed var(--cc-border)",
            background: "transparent",
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Show {hiddenCount} earlier message{hiddenCount !== 1 ? "s" : ""}
        </motion.button>
      )}
      {showAll && (
        <motion.button
          type="button"
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowAll(false)}
          className="flex items-center gap-2 w-full justify-center py-2 rounded-lg"
          style={{
            fontSize: 12,
            color: "var(--cc-text-3)",
            border: "1px dashed var(--cc-border)",
            background: "transparent",
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Collapse earlier messages
        </motion.button>
      )}

      {/* ── AI SDK conversation (canonical) ── */}
      {visibleMessages
        .map((message, msgIndex) => {
          /* Same-role grouping: reduce gap when previous message has same role */
          const prevMsg = msgIndex > 0 ? visibleMessages[msgIndex - 1] : null;
          const isSameRoleGroup = prevMsg && prevMsg.role === message.role;

          if (message.role === "user") {
            const textContent = getUiMessageText(message);
            if (textContent === "__system_test_passed__") return null;

            /* User avatar initial from message text */
            const avatarInitial = textContent.trim().charAt(0).toUpperCase() || "U";

            return (
              <motion.div
                layout
                key={message.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={isSameRoleGroup ? "cc-msg-group-same" : undefined}
              >
                <div className="cc-msg cc-msg--user">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-start gap-2.5">
                      <div className="cc-msg__body">{textContent}</div>
                      <div className="cc-user-avatar" aria-hidden="true">{avatarInitial}</div>
                    </div>
                    <div className="cc-msg-actions cc-msg-actions--user">
                      <MessageActionButton
                        label="Edit"
                        icon={<Pencil className="h-3 w-3" />}
                        onClick={() => onEdit(textContent)}
                      />
                      <MessageActionButton
                        label="Copy"
                        copied={copiedId === message.id}
                        icon={<Copy className="h-3 w-3" />}
                        onClick={() => onCopy(message.id, textContent)}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }

          const textContent = getUiMessageText(message);
          const workflowOutput = readWorkflowOutput(message);
          const isActiveAssistant = isGenerating && message.id === lastAiMessage?.id;
          if (!textContent && !workflowOutput && !hasLegacyToolInvocations(message) && !isActiveAssistant) return null;

          const isClarification = 
            textContent.includes("I need a few implementation details before I build this workflow:") || 
            textContent.includes("Answer these and I will generate the workflow.");

          if (isClarification) {
            const messageIndex = aiMessages.findIndex(m => m.id === message.id);
            const hasSubsequentUserMessage = aiMessages.slice(messageIndex + 1).some(m => m.role === "user");

            return (
              <motion.div
                layout
                key={message.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                data-assistant-state={isGenerating && message.id === lastAiMessage?.id ? "streaming" : "resolved"}
              >
                <div className="cc-msg cc-msg--ai">
                  <div className="cc-ai-mark">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <div className="cc-msg__body">
                    <ClarificationCard content={textContent} isAnswered={hasSubsequentUserMessage} />
                    {onQuickReply && (
                      <QuickReplies
                        content={textContent}
                        onSelect={onQuickReply}
                        isAnswered={hasSubsequentUserMessage}
                      />
                    )}
                    <div className="cc-msg-actions cc-msg-actions--ai">
                      <MessageActionButton
                        label="Copy"
                        copied={copiedId === message.id}
                        icon={<Copy className="h-3 w-3" />}
                        onClick={() => onCopy(message.id, textContent)}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }

          const isLastAssistant = message.id === lastAiMessage?.id && lastAiMessage?.role === "assistant";
          const msgFeedback = feedbackLog.find((f) => f.messageId === message.id);
          const workflowSummary =
            typeof workflowOutput?.summary === "string" ? workflowOutput.summary : "";
          const copyText = [textContent, workflowSummary].filter(Boolean).join("\n\n");

          return (
            <motion.div
              layout
              key={message.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={isSameRoleGroup ? "cc-msg-group-same" : undefined}
              data-assistant-state={isGenerating && message.id === lastAiMessage?.id ? "streaming" : "resolved"}
              onMouseEnter={() => onHoverMsg(message.id)}
              onMouseLeave={() => onHoverMsg(null)}
            >
              <AiMessage
                content={textContent}
                isStreaming={isActiveAssistant}
                thinkingLabel={activeThinkingLabel}
                timestamp={getUiMessageTimestamp(message)}
              />
              {workflowOutput && (
                <div style={{ marginLeft: 36, marginTop: textContent ? 8 : 0 }}>
                  <WorkflowResultCard output={workflowOutput} />
                </div>
              )}
              {/* Feedback + Regenerate row */}
              <div
                className="flex items-center gap-2"
                style={{ marginLeft: 36, marginTop: workflowOutput ? 8 : -4, marginBottom: 4 }}
              >
                <div className="cc-msg-actions cc-msg-actions--ai">
                  <MessageActionButton
                    label="Copy"
                    copied={copiedId === message.id}
                    icon={<Copy className="h-3 w-3" />}
                    onClick={() => onCopy(message.id, copyText || "Workflow generated.")}
                  />
                </div>
                <FeedbackButtons
                  messageId={message.id}
                  isVisible={hoveredMsgId === message.id && !isGenerating}
                  currentRating={msgFeedback?.rating}
                  onFeedback={onFeedback}
                />
                {isLastAssistant && !isGenerating && onRegenerate && hoveredMsgId === message.id && (
                  <AnimatePresence>
                    <motion.button
                      type="button"
                      title="Regenerate response"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.12 }}
                      className="cc-msg__copy flex items-center gap-1"
                      style={{
                        opacity: 1,
                        border: "1px solid var(--cc-border)",
                        background: "var(--cc-bg-raised)",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: 11,
                        color: "var(--cc-text-2)",
                      }}
                      onClick={onRegenerate}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Regenerate
                    </motion.button>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          );
        })}

      {/* ── Thinking card when waiting for first token ── */}
      {isGenerating && lastAiMessage?.role !== "assistant" && <ThinkingCard mode={thinkingMode} />}

      {/* ── Ephemeral system notices (test/deploy/errors) ── */}
      <AnimatePresence initial={false}>
        {notices.map((notice) => (
          <motion.div
            key={notice.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <SystemNotice label={notice.content} />
          </motion.div>
        ))}
      </AnimatePresence>

      <div ref={messagesEndRef} className="h-4" />
    </LayoutGroup>
  );
}
