"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square, Slash, Zap } from "lucide-react";

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */
const PLACEHOLDERS = [
  "Send WhatsApp to new leads from your CRM…",
  "Save Typeform responses to Google Sheets…",
  "Notify Slack when a HubSpot deal closes…",
  "Create Notion page for each Calendly booking…",
  "Email confirmation when Stripe payment succeeds…",
  "Assign Trello card when Jira ticket is created…",
] as const;

const CHIPS = [
  { emoji: "⚡", label: "Lead → WhatsApp", prompt: "Send a WhatsApp message to new leads added to my CRM." },
  { emoji: "📊", label: "Form → Sheets", prompt: "Save new Typeform responses into a Google Sheet." },
  { emoji: "💬", label: "Deal → Slack", prompt: "Send a Slack notification when a deal is closed won in HubSpot." },
  { emoji: "📓", label: "Booking → Notion", prompt: "Create a new Notion page whenever a Calendly booking is made." },
] as const;

/* ────────────────────────────────────────────
   Props
   ──────────────────────────────────────────── */
interface InputComposerProps {
  onSend: (text: string) => void;
  isGenerating: boolean;
  onStop: () => void;
  showChips: boolean;
  creditsUsed?: number;
  creditsTotal?: number;
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */
export function InputComposer({
  onSend,
  isGenerating,
  onStop,
  showChips,
  creditsUsed = 8,
  creditsTotal = 10,
}: InputComposerProps) {
  const [input, setInput] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [currentPlaceholder, setCurrentPlaceholder] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [slashTooltip, setSlashTooltip] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Typewriter placeholder ── */
  useEffect(() => {
    if (isFocused || input.length > 0) {
      setCurrentPlaceholder("Describe your automation workflow…");
      return;
    }

    let charIndex = 0;
    let timeout: NodeJS.Timeout;
    const targetText = PLACEHOLDERS[placeholderIndex];

    const type = () => {
      if (charIndex < targetText.length) {
        setCurrentPlaceholder(targetText.slice(0, charIndex + 1));
        charIndex++;
        timeout = setTimeout(type, 45);
      } else {
        timeout = setTimeout(erase, 2000);
      }
    };

    const erase = () => {
      if (charIndex > 0) {
        setCurrentPlaceholder(targetText.slice(0, charIndex - 1));
        charIndex--;
        timeout = setTimeout(erase, 18);
      } else {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
      }
    };

    type();
    return () => clearTimeout(timeout);
  }, [placeholderIndex, isFocused, input]);

  /* ── Auto-resize ── */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 24), 120)}px`;
  }, [input]);

  /* ── Handlers ── */
  const handleSubmit = useCallback(() => {
    if (!input.trim() || isGenerating) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, isGenerating, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleChipClick = useCallback(
    (prompt: string) => {
      setInput(prompt);
      setTimeout(() => {
        onSend(prompt);
        setInput("");
      }, 400);
    },
    [onSend]
  );

  const creditPercent = Math.round((creditsUsed / creditsTotal) * 100);

  return (
    <div className="w-full max-w-3xl mx-auto pb-5 px-4">
      {/* Chips */}
      {showChips && (
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {CHIPS.map((chip, i) => (
            <button
              key={chip.label}
              onClick={() => handleChipClick(chip.prompt)}
              className="group flex items-center gap-1.5 rounded-full border border-[var(--build-border)] bg-white/[0.02] px-3.5 py-1.5 text-[12px] font-medium text-[var(--build-text-tertiary)] transition-all duration-200 hover:border-[var(--build-accent)]/40 hover:text-[var(--build-accent)] hover:bg-[var(--build-accent-soft)] hover:scale-[1.03] hover:shadow-[0_2px_12px_var(--build-accent-glow)] active:scale-[0.96] animate-fade-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="text-[13px]">{chip.emoji}</span>
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Composer Box */}
      <div
        className={`relative flex items-end gap-1.5 rounded-2xl border p-2 transition-all duration-300 ${
          isFocused
            ? "border-[var(--build-accent)]/50 bg-[var(--build-surface)] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_var(--build-accent)]"
            : "border-[var(--build-border)] bg-[var(--build-surface)] shadow-[0_-4px_40px_rgba(0,0,0,0.2)] hover:border-[var(--build-border-hover)]"
        }`}
      >
        <div className="relative">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--build-text-tertiary)] bg-white/[0.02]">
            <Zap className="h-4 w-4" />
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={currentPlaceholder}
          disabled={isGenerating}
          rows={1}
          className="max-h-[120px] min-h-[24px] w-full resize-none bg-transparent py-2 text-[15px] text-[var(--build-text-primary)] placeholder:text-[var(--build-text-tertiary)] outline-none disabled:cursor-not-allowed disabled:opacity-50"
          style={{ lineHeight: "24px" }}
        />

        {/* Send / Stop Button */}
        <div className="flex flex-col items-center gap-0.5">
          {isGenerating ? (
            <button
              onClick={onStop}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[var(--build-text-secondary)] transition-all hover:bg-red-500/15 hover:text-red-400 active:scale-[0.93]"
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 active:scale-[0.93] ${
                input.trim()
                  ? "bg-[var(--build-accent)] text-white shadow-[0_0_12px_var(--build-accent-glow)] hover:brightness-110"
                  : "bg-white/[0.04] text-[var(--build-text-tertiary)]"
              }`}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-end px-1">
        {/* Credits micro-bar */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--build-accent)] transition-all duration-500"
              style={{ width: `${creditPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--build-text-tertiary)] tabular-nums font-medium tracking-wide">
            {creditsUsed}/{creditsTotal} CREDITS
          </span>
        </div>
      </div>
    </div>
  );
}
