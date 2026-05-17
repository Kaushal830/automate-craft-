"use client";

import React, { useEffect, useRef } from "react";
import { Paperclip, X, Square, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled: boolean;
  isPanelOpen: boolean;
  isCanvasVisible: boolean;
  attachedFiles: File[];
  onRemoveFile: (name: string) => void;
  onFileAttach: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Context-aware placeholder (Task 2.3) */
  placeholder?: string;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  isGenerating,
  disabled,
  isPanelOpen,
  isCanvasVisible,
  attachedFiles,
  onRemoveFile,
  onFileAttach,
  fileInputRef,
  textareaRef,
  placeholder,
}: ComposerProps) {
  const hasContent = value.trim().length > 0 || attachedFiles.length > 0;

  /* Auto-resize textarea */
  const prevHeight = useRef<number>(52);
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    const scrollHeight = Math.min(textareaRef.current.scrollHeight, 180);
    textareaRef.current.style.height = `${scrollHeight}px`;
    prevHeight.current = scrollHeight;
  }, [value, textareaRef]);

  const defaultPlaceholder = disabled
    ? "Engine is processing..."
    : placeholder ?? "What would you like to build?";

  return (
    <form
      onSubmit={onSubmit}
      data-chat-form
      className={`chat-composer-surface w-full flex flex-col gap-2 rounded-2xl border px-5 py-3.5 transition-all duration-300 pointer-events-auto backdrop-blur-2xl
        ${isPanelOpen && isCanvasVisible ? "max-w-full" : "max-w-3xl"}
        ${
          disabled
            ? "opacity-50 border-white/[0.06] bg-[#111214]/80"
            : isGenerating
              ? "border-accent/20 bg-[#111214]/95"
              : "border-white/[0.08] bg-[#111214]/95 focus-within:border-[rgba(59,130,246,0.2)] focus-within:bg-[#13151a]/95"
        }
      `}
      style={{
        /* Task 2.1: 3-layer shadow system */
        boxShadow: disabled
          ? "0 1px 2px rgba(0,0,0,0.2)"
          : "0 1px 2px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)",
        transition: "box-shadow 300ms ease-out, border-color 200ms ease-out, background-color 150ms ease-out",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={defaultPlaceholder}
        disabled={disabled}
        rows={1}
        className="prompt-textarea caret-accent w-full min-h-[44px] max-h-[180px] resize-none bg-transparent text-[14px] leading-relaxed text-white/95 outline-none placeholder:text-white/25 disabled:cursor-not-allowed"
        aria-label="Automation prompt"
      />

      {/* Bottom Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Model badge (Task 2.2: display only for now) */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/[0.05] bg-white/[0.02] select-none">
            <span className="text-[10px] font-mono text-white/35">GPT-4o</span>
          </div>
          <span className="hidden rounded-md border border-accent/[0.08] bg-accent/[0.04] px-2 py-0.5 text-[10px] font-medium text-accent/60 sm:inline-flex">
            5 credits
          </span>

          <div className="w-px h-4 bg-white/[0.06] mx-0.5" />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/25 hover:bg-white/[0.04] hover:text-white/45 transition-all"
            aria-label="Attach file"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={onFileAttach}
            multiple
          />

          {/* Attached files */}
          {attachedFiles.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] text-[11px] px-2 py-1 rounded-md text-white/50"
            >
              <span className="truncate max-w-[100px]">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemoveFile(file.name)}
                className="hover:text-white text-white/25"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Stop / Send toggle (Task 2.4: animated transition) */}
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.button
                key="stop"
                type="button"
                onClick={onStop}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 hover:bg-white/[0.1] hover:text-white/90 transition-all hover:scale-[1.02] active:scale-[0.96]"
                aria-label="Stop generating"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                type="submit"
                disabled={!hasContent}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.1 }}
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 overflow-hidden ${
                  !hasContent
                    ? "bg-white/[0.03] text-white/10 border border-white/[0.04]"
                    : "bg-white text-black shadow-[0_2px_10px_rgba(255,255,255,0.2)] hover:shadow-[0_4px_16px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.96]"
                }`}
                aria-label="Send message"
              >
                <ArrowUp className="h-4 w-4 stroke-[2.5]" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </form>
  );
}
