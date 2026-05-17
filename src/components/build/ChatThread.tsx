"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Copy, RefreshCcw, Edit2, Share2, Zap, Check, ArrowRight, Link2, ChevronDown } from "lucide-react";
import { AutomationMessage, AutomationBlueprint } from "@/types/automation";

/* ────────────────────────────────────────────
   Constants — outside component to avoid re-creation
   ──────────────────────────────────────────── */
const THINKING_STATUSES = [
  "Analyzing request...",
  "Building workflow...",
  "Connecting integrations...",
  "Ready to deploy",
] as const;

const FOLLOW_UP_SUGGESTIONS = [
  "Add error handling",
  "Connect more apps",
  "Test this workflow",
] as const;

/* ────────────────────────────────────────────
   Utilities
   ──────────────────────────────────────────── */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ────────────────────────────────────────────
   Word Streaming Hook
   ──────────────────────────────────────────── */
function useWordStream(text: string, isStreaming: boolean) {
  const [displayed, setDisplayed] = useState(isStreaming ? "" : text);
  const [isDone, setIsDone] = useState(!isStreaming);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayed(text);
      setIsDone(true);
      return;
    }

    setIsDone(false);
    const words = text.split(" ");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(words.slice(0, i + 1).join(" "));
      i++;
      if (i >= words.length) {
        clearInterval(interval);
        setIsDone(true);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [text, isStreaming]);

  return { displayed, isDone };
}

/* ────────────────────────────────────────────
   Markdown Renderer (safe)
   ──────────────────────────────────────────── */
function renderMarkdown(text: string) {
  if (!text) return null;
  const blocks = text.split("\n\n");

  return blocks.map((block, idx) => {
    // Bullet list
    if (block.startsWith("- ")) {
      const items = block.split("\n").filter((i) => i.startsWith("- ")).map((i) => i.slice(2));
      return (
        <ul key={idx} className="list-none pl-0 my-3 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] text-[var(--build-text-secondary)]">
              <span className="mt-2 h-1 w-1 rounded-full bg-[var(--build-accent)] shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: escapeHtml(item).replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--build-text-primary)] font-medium">$1</strong>') }} />
            </li>
          ))}
        </ul>
      );
    }
    // Code block
    if (block.startsWith("```")) {
      const lines = block.split("\n");
      const code = lines.slice(1, lines.length - 1).join("\n");
      return (
        <pre key={idx} className="bg-white/[0.03] border border-[var(--build-border)] p-3.5 rounded-lg text-[12px] font-mono my-3 overflow-x-auto text-[var(--build-text-secondary)]">
          <code>{code}</code>
        </pre>
      );
    }
    // Paragraph
    return (
      <p
        key={idx}
        className="my-2 text-[14px] leading-[1.7] text-[var(--build-text-secondary)]"
        dangerouslySetInnerHTML={{
          __html: escapeHtml(block).replace(
            /\*\*(.*?)\*\*/g,
            '<strong class="text-[var(--build-text-primary)] font-medium">$1</strong>'
          ),
        }}
      />
    );
  });
}

/* ────────────────────────────────────────────
   Blueprint Card (System UI)
   ──────────────────────────────────────────── */
function BlueprintCard({ blueprint, onConnect }: { blueprint: AutomationBlueprint; onConnect?: () => void }) {
  return (
    <div className="mt-2 w-full flex flex-col gap-4 animate-fade-slide-up">
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-emerald-500" />
        <span className="text-[14px] font-medium text-[var(--build-text-primary)]">Pipeline generated successfully</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {/* Trigger Block */}
        <div className="flex flex-col gap-2 p-4 rounded-xl border border-[var(--build-border)] bg-[var(--build-surface-raised)] relative overflow-hidden z-10">
          <div className="absolute top-0 left-0 w-1 h-full bg-sky-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-500">Trigger</span>
          <span className="text-[14px] font-medium text-[var(--build-text-primary)]">{blueprint.trigger}</span>
        </div>

        <div className="hidden md:flex absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 items-center justify-center h-8 w-8 rounded-full bg-[var(--build-surface)] border border-[var(--build-border)]">
          <ArrowRight className="h-4 w-4 text-[var(--build-text-tertiary)]" />
        </div>

        {/* Steps Block */}
        <div className="flex flex-col gap-2 p-4 rounded-xl border border-[var(--build-border)] bg-[var(--build-surface-raised)] relative overflow-hidden z-10">
          <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-violet-500">Steps</span>
          <div className="flex flex-col gap-1.5">
            {blueprint.actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] text-[var(--build-text-secondary)]">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-[9px] font-bold">{i + 1}</span>
                <span className="truncate">{action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:flex absolute left-2/3 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 items-center justify-center h-8 w-8 rounded-full bg-[var(--build-surface)] border border-[var(--build-border)]">
          <ArrowRight className="h-4 w-4 text-[var(--build-text-tertiary)]" />
        </div>

        {/* Output Block */}
        <div className="flex flex-col gap-2 p-4 rounded-xl border border-[var(--build-border)] bg-[var(--build-surface-raised)] relative overflow-hidden z-10">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Output</span>
          <span className="text-[14px] font-medium text-[var(--build-text-primary)]">{blueprint.output}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between p-4 rounded-xl border border-[var(--build-border)] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[var(--build-text-tertiary)] font-medium">Required Apps:</span>
          <div className="flex items-center gap-2">
            {blueprint.integrations.map((app) => (
              <span key={app.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-[var(--build-border)] text-[12px] font-medium text-[var(--build-text-secondary)]">
                <span>{app.icon}</span>
                {app.name}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <span className="text-amber-400 text-[12px] font-medium bg-amber-400/10 px-2 py-1 rounded-md">~{blueprint.estimatedCost} credits</span>
          <button
            onClick={onConnect}
            className="flex items-center gap-2 rounded-lg bg-[var(--build-accent)] px-4 py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
          >
            <Link2 className="h-4 w-4" />
            Connect & Deploy
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Action Toolbar (floating glass pill)
   ──────────────────────────────────────────── */
function ActionToolbar({ visible }: { visible: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const actions = [
    { icon: copied ? Check : Copy, label: copied ? "Copied" : "Copy", onClick: handleCopy },
    { icon: RefreshCcw, label: "Regenerate", onClick: () => {} },
    { icon: Edit2, label: "Edit prompt", onClick: () => {} },
    { icon: Share2, label: "Share", onClick: () => {} },
  ];

  return (
    <div
      className={`flex items-center gap-0.5 mt-2 px-1 py-0.5 rounded-lg bg-[var(--build-surface-raised)]/80 backdrop-blur-sm border border-[var(--build-border)] transition-all duration-200 w-fit ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
      }`}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="group relative p-1.5 rounded-md text-[var(--build-text-tertiary)] hover:text-[var(--build-text-primary)] hover:bg-white/[0.06] transition-all"
        >
          <action.icon className="h-3.5 w-3.5" />
          {/* Tooltip */}
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--build-surface-raised)] border border-[var(--build-border)] text-[var(--build-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   Follow-up Suggestion Chips
   ──────────────────────────────────────────── */
function FollowUpChips({ onSuggestionClick }: { onSuggestionClick?: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3 ml-11">
      {FOLLOW_UP_SUGGESTIONS.map((suggestion, i) => (
        <button
          key={suggestion}
          onClick={() => onSuggestionClick?.(suggestion)}
          className="rounded-full border border-[var(--build-border)] bg-white/[0.02] px-3 py-1 text-[11px] font-medium text-[var(--build-text-tertiary)] transition-all duration-200 hover:border-[var(--build-accent)]/40 hover:text-[var(--build-accent)] hover:bg-[var(--build-accent-soft)] hover:scale-[1.02] active:scale-[0.97] animate-fade-slide-up"
          style={{ animationDelay: `${300 + i * 60}ms` }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   AI Message (System Output)
   ──────────────────────────────────────────── */
function AiMessage({
  msg,
  isLast,
  onActivateBlueprint,
  onSuggestionClick,
}: {
  msg: AutomationMessage;
  isLast: boolean;
  onActivateBlueprint?: (id: string) => void;
  onSuggestionClick?: (text: string) => void;
}) {
  const { displayed, isDone } = useWordStream(msg.content, !!msg.isStreaming);

  return (
    <div className="mb-8 animate-fade-slide-up w-full">
      {/* Blueprint card (after streaming completes) */}
      {!msg.isStreaming && isDone && msg.blueprint ? (
        <div className="w-full">
          <BlueprintCard
            blueprint={msg.blueprint}
            onConnect={() => onActivateBlueprint?.(msg.id)}
          />
        </div>
      ) : (
        <div className="flex w-full gap-3 group">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--build-accent)]/10 text-[var(--build-accent)]">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 max-w-[85%] pt-1">
            <div className="text-[14px] text-[var(--build-text-secondary)]">
              {renderMarkdown(displayed)}
              {msg.isStreaming && !isDone && (
                <span className="inline-block w-[2px] h-[14px] bg-[var(--build-accent)] ml-1 animate-pulse align-middle" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Follow-up chips */}
      {isLast && isDone && !msg.isStreaming && msg.blueprint && (
        <div className="mt-4">
          <FollowUpChips onSuggestionClick={onSuggestionClick} />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   User Message
   ──────────────────────────────────────────── */
function UserMessage({ msg }: { msg: AutomationMessage }) {
  const [showTime, setShowTime] = useState(false);

  return (
    <div className="flex w-full justify-end mb-6 animate-fade-slide-up">
      <div
        className="flex max-w-[70%] flex-col items-end"
        onMouseEnter={() => setShowTime(true)}
        onMouseLeave={() => setShowTime(false)}
      >
        <div className="rounded-xl bg-[var(--build-surface-raised)] border border-[var(--build-border)] px-4 py-3 text-[14px] text-[var(--build-text-primary)] font-medium shadow-sm">
          {msg.content}
        </div>
        <div
          className={`mt-1.5 text-[10px] text-[var(--build-text-tertiary)] transition-all duration-200 ${
            showTime ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
          }`}
        >
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Generating / Thinking State
   ──────────────────────────────────────────── */
function GeneratingState() {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % THINKING_STATUSES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex w-full items-center justify-center py-6 mb-4 animate-fade-slide-up">
      <div className="flex flex-col items-center gap-4">
        {/* Progress Spinner */}
        <div className="relative flex items-center justify-center h-12 w-12">
          <svg className="animate-spin h-full w-full text-[var(--build-accent)]/20" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <Zap className="absolute h-4 w-4 text-[var(--build-accent)]" />
        </div>
        
        {/* Status Text */}
        <div className="text-[13px] font-medium text-[var(--build-text-primary)] tracking-wide animate-pulse">
          {THINKING_STATUSES[statusIdx]}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Empty State Hero (with Trust Signals)
   ──────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full pt-4 pb-12 w-full">
      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--build-surface-raised)] border border-[var(--build-border)] mb-4 shadow-sm">
          <Zap className="h-6 w-6 text-[var(--build-text-primary)]" />
        </div>

        <h1 className="text-[24px] font-semibold text-[var(--build-text-primary)] mb-2 tracking-tight">
          AutomateCraft Command Center
        </h1>
        <p className="text-[14px] text-[var(--build-text-tertiary)] text-center max-w-[420px] mb-12">
          Describe your process, and the system will instantly build and deploy the automation pipeline.
        </p>

        {/* Trust Signals: Use Cases */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[var(--build-border)] bg-[var(--build-surface)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sky-500 font-semibold text-[12px] uppercase tracking-wider">Use Case</span>
            </div>
            <p className="text-[14px] text-[var(--build-text-primary)] font-medium mb-1">Lead Management</p>
            <p className="text-[13px] text-[var(--build-text-tertiary)]">&quot;When a HubSpot deal closes, notify Slack and create a Notion project.&quot;</p>
          </div>
          
          <div className="p-4 rounded-xl border border-[var(--build-border)] bg-[var(--build-surface)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-emerald-500 font-semibold text-[12px] uppercase tracking-wider">Use Case</span>
            </div>
            <p className="text-[14px] text-[var(--build-text-primary)] font-medium mb-1">Customer Support</p>
            <p className="text-[13px] text-[var(--build-text-tertiary)]">&quot;Route Zendesk tickets to specific Discord channels based on priority.&quot;</p>
          </div>
        </div>

        {/* Trust Signals: Social Proof */}
        <div className="w-full mt-8 p-5 rounded-xl border border-[var(--build-border)] bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-white/[0.1] flex items-center justify-center text-[12px] font-bold text-[var(--build-text-primary)] border border-white/[0.05]">
              SJ
            </div>
            <div>
              <p className="text-[13px] italic text-[var(--build-text-secondary)] mb-2">&quot;AutomateCraft reduced our manual data entry time by 90%. We deployed our first pipeline in minutes without touching any code.&quot;</p>
              <p className="text-[12px] font-semibold text-[var(--build-text-primary)]">Sarah Jenkins, Ops Lead</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Main ChatThread Component
   ──────────────────────────────────────────── */
interface ChatThreadProps {
  messages: AutomationMessage[];
  isGenerating: boolean;
  onActivateBlueprint?: (msgId: string) => void;
  onSuggestionClick?: (text: string) => void;
}

export function ChatThread({ messages, isGenerating, onActivateBlueprint, onSuggestionClick }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const lastAiIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "ai") return i;
    }
    return -1;
  })();

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Top scroll shadow */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[var(--build-bg)] to-transparent z-10 pointer-events-none" />

      {/* Bottom scroll shadow */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[var(--build-bg)] to-transparent z-10 pointer-events-none" />

      <div className="h-full overflow-y-auto px-6 py-12 build-scrollbar">
        <div className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {messages.map((msg, i) =>
                msg.role === "user" ? (
                  <UserMessage key={msg.id} msg={msg} />
                ) : (
                  <AiMessage
                    key={msg.id}
                    msg={msg}
                    isLast={i === lastAiIdx && !isGenerating}
                    onActivateBlueprint={onActivateBlueprint}
                    onSuggestionClick={onSuggestionClick}
                  />
                )
              )}
              {isGenerating && <GeneratingState />}
            </>
          )}
          <div ref={endRef} className="h-4" />
        </div>
      </div>
    </div>
  );
}
