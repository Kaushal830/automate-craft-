"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import NextImage from "next/image";
import { Mic, MicOff, Paperclip, X, Square, ArrowUp, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ACCEPTED_FILE_TYPES,
  MAX_IMAGE_COUNT,
  getFileCategory,
  getDocumentIcon,
  formatFileSize,
  createImageThumbnail,
} from "@/lib/file-utils";

/* ── Slash commands ── */
const SLASH_COMMANDS = [
  { cmd: "/test", desc: "Run workflow test" },
  { cmd: "/deploy", desc: "Deploy to production" },
  { cmd: "/clear", desc: "Clear conversation" },
  { cmd: "/status", desc: "Show execution status" },
  { cmd: "/help", desc: "List available commands" },
];

/* ── Thumbnail cache (per session) ─────────────────────────────── */
const thumbCache = new Map<string, string>();
function ThumbImg({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(thumbCache.get(file.name + file.size) ?? null);

  useEffect(() => {
    const key = file.name + file.size;
    if (thumbCache.has(key)) {
      setSrc(thumbCache.get(key)!);
      return;
    }
    let cancelled = false;
    createImageThumbnail(file, 80).then((thumb) => {
      if (cancelled) return;
      thumbCache.set(key, thumb);
      setSrc(thumb);
    }).catch(() => { /* silently fall back to icon */ });
    return () => { cancelled = true; };
  }, [file]);

  if (!src) return <ImageIcon className="h-5 w-5 text-white/30" />;
  return (
    <NextImage
      src={src}
      alt={file.name}
      width={40}
      height={40}
      unoptimized
      className="h-10 w-10 rounded object-cover"
      draggable={false}
    />
  );
}

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
  onFileDrop: (files: File[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
  fileErrors: string[];
  onDismissError: (idx: number) => void;
  onSlashCommand?: (cmd: string) => void;
  /** Prompt history for ↑ key navigation (most recent first) */
  promptHistory?: string[];
}

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  isGenerating,
  disabled,
  attachedFiles,
  onRemoveFile,
  onFileAttach,
  onFileDrop,
  fileInputRef,
  textareaRef,
  placeholder,
  fileErrors,
  onDismissError,
  onSlashCommand,
  promptHistory = [],
}: ComposerProps) {
  const hasContent = value.trim().length > 0 || attachedFiles.length > 0;
  const modelLabel = process.env.NEXT_PUBLIC_CHAT_MODEL_LABEL || "GPT-4o";
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [slashIdx, setSlashIdx] = useState(0);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const dragCounter = useRef(0);

  const MAX_CHARS = 4000;
  const charCount = value.length;
  const charPct = charCount / MAX_CHARS;
  const charColor = charPct >= 0.95 ? "#f87171" : charPct >= 0.8 ? "#fbbf24" : "var(--cc-text-3)";

  // Detect Speech Recognition support
  useEffect(() => {
    const hasSR = typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setHasSpeechSupport(hasSR);
  }, []);

  // Voice input handler
  const toggleVoice = useCallback(() => {
    if (!hasSpeechSupport) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onChange(value ? `${value} ${transcript}` : transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [hasSpeechSupport, isListening, value, onChange]);

  const imageCount = attachedFiles.filter((f) => getFileCategory(f) === "image").length;
  const docCount = attachedFiles.filter((f) => getFileCategory(f) === "document").length;

  /* ── Slash command filtering ── */
  const slashFilter = value.startsWith("/") ? value.toLowerCase() : "";
  const filteredSlash = slashFilter
    ? SLASH_COMMANDS.filter((s) => s.cmd.startsWith(slashFilter))
    : SLASH_COMMANDS;

  useEffect(() => {
    setShowSlash(value.startsWith("/") && !value.includes(" "));
    setSlashIdx(0);
  }, [value]);

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
    ? "Processing request..."
    : placeholder ?? "What would you like to build?";

  /* ── Drag-and-drop handlers ───────────────────────────────────── */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOver(false);
      if (e.dataTransfer.files?.length) {
        onFileDrop(Array.from(e.dataTransfer.files));
      }
    },
    [onFileDrop]
  );

  const handleSlashSelect = (cmd: string) => {
    onChange("");
    setShowSlash(false);
    onSlashCommand?.(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    /* Slash command navigation */
    if (showSlash && filteredSlash.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIdx((prev) => (prev + 1) % filteredSlash.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIdx((prev) => (prev - 1 + filteredSlash.length) % filteredSlash.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSlashSelect(filteredSlash[slashIdx].cmd);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSlash(false);
        return;
      }
    }

    /* Prompt history navigation with ↑/↓ when input is empty */
    if (!showSlash && promptHistory.length > 0) {
      if (e.key === "ArrowUp" && value === "") {
        e.preventDefault();
        const nextIdx = Math.min(historyIdx + 1, promptHistory.length - 1);
        setHistoryIdx(nextIdx);
        onChange(promptHistory[nextIdx] ?? "");
        return;
      }
      if (e.key === "ArrowDown" && historyIdx >= 0) {
        e.preventDefault();
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        onChange(nextIdx < 0 ? "" : (promptHistory[nextIdx] ?? ""));
        return;
      }
    }

    /* Normal Enter = submit */
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setHistoryIdx(-1);
      onSubmit();
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      data-chat-form
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`cc-input-wrap ${isDragOver ? "!border-[var(--cc-accent-border)]" : ""} ${disabled ? "opacity-70" : ""}`}
      style={{ position: "relative" }}
    >
      {/* ── Slash command menu ── */}
      <AnimatePresence>
        {showSlash && filteredSlash.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.1 }}
            className="cc-slash-menu"
          >
            {filteredSlash.map((s, i) => (
              <div
                key={s.cmd}
                className={`cc-slash-item${i === slashIdx ? " is-active" : ""}`}
                onClick={() => handleSlashSelect(s.cmd)}
                onMouseEnter={() => setSlashIdx(i)}
              >
                <span className="cc-slash-item__cmd">{s.cmd}</span>
                <span className="cc-slash-item__desc">{s.desc}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="composer-drag-overlay"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--cc-accent-dim)", border: "1px solid var(--cc-accent-border)" }}>
                <Paperclip className="h-5 w-5" style={{ color: "var(--cc-accent)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--cc-accent)" }}>
                Drop files to attach
              </span>
              <span style={{ fontSize: 11, color: "var(--cc-text-3)" }}>
                Images & documents up to 10 MB
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File error toasts */}
      <AnimatePresence>
        {fileErrors.map((err, idx) => (
          <motion.div
            key={`err-${idx}-${err.slice(0, 20)}`}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2 rounded-lg px-3 py-2"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: 11, color: "rgba(248,113,113,0.9)", margin: "8px 14px 0" }}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{err}</span>
            <button
              type="button"
              onClick={() => onDismissError(idx)}
              style={{ color: "rgba(248,113,113,0.5)" }}
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Attached files preview strip */}
      <AnimatePresence>
        {attachedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="attachment-preview-strip"
            style={{ margin: "8px 14px 0" }}
          >
            {attachedFiles.map((file) => {
              const cat = getFileCategory(file);
              return (
                <motion.div
                  key={file.name + file.size}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="attachment-preview-chip"
                  title={`${file.name} — ${formatFileSize(file.size)}`}
                >
                  <div className="attachment-preview-icon">
                    {cat === "image" ? (
                      <ThumbImg file={file} />
                    ) : (
                      <span className="text-lg leading-none">
                        {getDocumentIcon(file)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <span className="truncate text-[11px] font-medium max-w-[120px]" style={{ color: "var(--cc-text-1)" }}>
                      {file.name}
                    </span>
                    <span style={{ fontSize: 9, color: "var(--cc-text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(file.name)}
                    className="attachment-remove-btn"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Textarea */}
      <div className="cc-input-wrap__top">
        <textarea
          ref={textareaRef}
          className="prompt-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={defaultPlaceholder}
          disabled={disabled}
          rows={1}
          aria-label="Automation prompt"
        />
      </div>

      {/* Bottom bar */}
      <div className="cc-input-wrap__bot">
        <div className="cc-input-wrap__left">
          {/* Model badge */}
          <div className="cc-ibtn" style={{ cursor: "default", gap: 6 }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#4ade80", boxShadow: "0 0 6px rgba(74,222,128,0.6)" }} />
            {modelLabel}
          </div>

          {/* Attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="cc-ibtn"
            aria-label="Attach file"
            title="Attach images or documents (max 10 images, 10 MB each)"
          >
            <Paperclip className="h-3.5 w-3.5" />
            {attachedFiles.length > 0 && (
              <span style={{ fontFamily: "var(--cc-mono)", fontSize: 10 }}>
                {imageCount > 0 && (
                  <span className="flex items-center gap-0.5">
                    <ImageIcon className="h-2.5 w-2.5" />
                    {imageCount}/{MAX_IMAGE_COUNT}
                  </span>
                )}
                {imageCount > 0 && docCount > 0 && <span style={{ color: "var(--cc-text-3)", margin: "0 2px" }}>·</span>}
                {docCount > 0 && (
                  <span className="flex items-center gap-0.5">
                    <FileText className="h-2.5 w-2.5" />
                    {docCount}
                  </span>
                )}
              </span>
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={onFileAttach}
            multiple
            accept={ACCEPTED_FILE_TYPES}
          />

          {/* Voice input button */}
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={toggleVoice}
              className="cc-ibtn"
              aria-label={isListening ? "Stop recording" : "Voice input"}
              title={isListening ? "Click to stop recording" : "Click to speak"}
              style={isListening ? { color: "#f87171", borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)" } : {}}
            >
              {isListening ? (
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ display: "inline-flex" }}
                >
                  <MicOff className="h-3.5 w-3.5" />
                </motion.span>
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>

        <div className="cc-input-wrap__right">
          {/* Character counter */}
          {charCount > 0 && (
            <span
              style={{
                fontFamily: "var(--cc-mono)",
                fontSize: 10,
                color: charColor,
                opacity: charPct < 0.5 ? 0.5 : 1,
                transition: "color 0.2s",
                minWidth: 36,
                textAlign: "right",
              }}
            >
              {charCount > 999 ? `${(charCount / 1000).toFixed(1)}k` : charCount}
            </span>
          )}

          {/* Send / Stop button */}
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
                className="cc-send-btn is-stop"
                aria-label="Stop generating"
              >
                <Square className="h-3 w-3" style={{ fill: "currentColor" }} />
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
                className={`cc-send-btn${hasContent ? " is-active" : ""}`}
                aria-label="Send message"
              >
                <ArrowUp className="h-4 w-4" style={{ strokeWidth: 2.5 }} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </form>
  );
}
