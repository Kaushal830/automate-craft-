"use client";

import { useState, useRef, useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp, Mic, Paperclip, Sparkles,
  MessageSquare, Mail, BarChart3, FileSpreadsheet,
  Bell, RefreshCw, Calendar, Webhook,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
const HeroScene = dynamic(() => import("@/components/HeroScene"), { ssr: false });
import { DISPLAY_NAME_KEY } from "@/components/dashboard/ProfileModal";

/* LOGIC EXPLAINED:
This dashboard hero already had rich animation, but some transitions did not respect
reduced-motion preferences. This fix preserves the same experience for most users
while making motion instant or static for people who prefer less movement.
*/

/* ─── rotating placeholder examples ─── */
const promptExamples = [
  "Send WhatsApp message on new leads",
  "Save form data to Google Sheets",
  "Notify me when payment is received",
  "Follow up with leads after 24 hours",
  "Sync CRM contacts to my email list",
];

/* ─── 8 quick-start templates ─── */
const templates = [
  {
    icon: MessageSquare,
    title: "WhatsApp Lead Alerts",
    prompt: "When a new form is submitted, send a WhatsApp message to my team with the lead details",
    color: "#10b981",
  },
  {
    icon: Mail,
    title: "Email Follow-Up",
    prompt: "When someone signs up, send them a welcome email and schedule a follow-up in 3 days",
    color: "#3b82f6",
  },
  {
    icon: BarChart3,
    title: "CRM Sync Pipeline",
    prompt: "Sync new form submissions to HubSpot CRM and create a new deal for each lead",
    color: "#8b5cf6",
  },
  {
    icon: FileSpreadsheet,
    title: "Sheets Data Logger",
    prompt: "Log every form submission into a Google Sheet with timestamp, name, email, and message",
    color: "#f59e0b",
  },
  {
    icon: Bell,
    title: "Payment Notifications",
    prompt: "When a payment is received via Razorpay, send me a Slack notification with the amount and customer name",
    color: "#ec4899",
  },
  {
    icon: RefreshCw,
    title: "Contact List Sync",
    prompt: "Whenever a new contact is added to my CRM, sync them to my Mailchimp email list",
    color: "#14b8a6",
  },
  {
    icon: Calendar,
    title: "Meeting Reminder",
    prompt: "Send a WhatsApp and email reminder 1 hour before each scheduled meeting to all attendees",
    color: "#f97316",
  },
  {
    icon: Webhook,
    title: "Webhook Router",
    prompt: "When a webhook event arrives, parse the payload and forward it to the correct Slack channel based on event type",
    color: "#a855f7",
  },
];

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

function createChatId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().slice(0, 8);
  return `${performance.now().toString(36).replace(".", "")}`.slice(0, 8);
}

/* ════════════════════════════════════════════════════════════
   Main page component
════════════════════════════════════════════════════════════ */
export default function DashboardHomeClient({ firstName }: { firstName: string | null }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [prompt, setPrompt] = useState("");
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [ultraThinking, setUltraThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const heightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── live display name from localStorage (updated by ProfileModal) ── */
  const [displayName, setDisplayName] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(DISPLAY_NAME_KEY) || firstName;
    }
    return firstName;
  });

  useEffect(() => {
    // Sync when the ProfileModal saves a new name (same tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISPLAY_NAME_KEY) setDisplayName(e.newValue || firstName);
    };
    window.addEventListener("storage", onStorage);

    // Also poll localStorage once on mount in case it was set before this effect ran
    const stored = localStorage.getItem(DISPLAY_NAME_KEY);
    if (stored) setDisplayName(stored);

    return () => window.removeEventListener("storage", onStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── auto-resize textarea ── */
  const adjustHeight = useEffectEvent(() => {
    const el = promptRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  });

  useEffect(() => {
    if (heightTimerRef.current) clearTimeout(heightTimerRef.current);
    heightTimerRef.current = setTimeout(adjustHeight, 60);
    return () => { if (heightTimerRef.current) clearTimeout(heightTimerRef.current); };
  }, [prompt]);

  /* ── rotate placeholder examples ── */
  useEffect(() => {
    if (prompt.trim().length > 0) return;
    const id = setInterval(() => setExampleIndex((i) => (i + 1) % promptExamples.length), 3500);
    return () => clearInterval(id);
  }, [prompt]);

  /* ── file attach ── */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) setPrompt((prev) => prev + `\n\n[Attached: ${file.name}]\n${text}\n`);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  /* ── voice ── */
  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) { recognitionRef.current?.stop(); return; }
    const win = window as SpeechWindow;
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Use Chrome or Edge."); return; }
    const r = new SR();
    recognitionRef.current = r;
    r.continuous = true;
    r.interimResults = true;
    let base = prompt.trim() ? prompt.trim() + " " : "";
    r.onstart = () => setIsListening(true);
    r.onresult = (ev) => {
      let final = ""; let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript;
        else interim += ev.results[i][0].transcript;
      }
      if (final) base += final + " ";
      setPrompt(base + interim);
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    try { r.start(); } catch {}
  };

  /* ── submit ── */
  const handleSubmit = () => {
    if (!prompt.trim()) return;
    const chatId = createChatId();
    const params = new URLSearchParams({ prompt: prompt.trim() });
    if (ultraThinking) params.set("ultra", "1");
    router.push(`/dashboard/chat/${chatId}?${params.toString()}`);
  };

  /* ── template click: paste into prompt box, focus, don't navigate ── */
  const handleTemplateClick = (t: typeof templates[0]) => {
    setPrompt(t.prompt);
    setActiveTemplate(t.title);
    // focus textarea after state update
    setTimeout(() => {
      promptRef.current?.focus();
      // move cursor to end
      const el = promptRef.current;
      if (el) { el.selectionStart = el.selectionEnd = el.value.length; }
    }, 30);
  };

  const hasPrompt = prompt.trim().length > 0;
  const canSubmit = hasPrompt;

  return (
    <div className="relative w-full">
      <HeroScene isPromptFocused={isPromptFocused} />

      <section className="relative flex min-h-screen items-center overflow-hidden pb-10 pt-24 md:pb-14">
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-4xl text-center">

            {/* ── Heading ── */}
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="mx-auto max-w-4xl text-[3.3rem] font-semibold leading-[0.94] tracking-[-0.04em] text-foreground sm:text-[4.4rem] lg:text-[5.4rem]">
                {displayName ? (
                  <>Ready to build<br />Automation,<br /><span className="text-accent">{displayName.split(" ")[0]}</span></>
                ) : (
                  <>Describe your<br /><span className="text-accent">automation</span></>
                )}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[1.02rem] leading-8 text-white/50 sm:text-lg">
                Describe what you need and we&apos;ll generate it for you.
              </p>
            </motion.div>

            {/* ── Premium Prompt Box ── */}
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.85,
                delay: reduceMotion ? 0 : 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group relative mx-auto my-10 max-w-[600px] cursor-text"
              onClick={() => promptRef.current?.focus()}
            >
              <div className="relative">
                <div aria-hidden="true" className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-56 w-full rounded-full bg-accent/5 blur-[80px]" />
                <div className="rounded-[16px] bg-[#0a0a0a] p-1.5 text-left shadow-[0_24px_50px_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.1)] transition-[box-shadow,transform] duration-300 ease-out group-hover:shadow-[0_0_80px_rgba(79,142,247,0.12),0_32px_60px_rgba(79,142,247,0.1),0_16px_32px_rgba(28,28,28,0.12)]">
                  <div className={`relative isolate overflow-hidden rounded-[16px] border px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out sm:px-5 sm:py-4.5 ${
                    hasPrompt
                      ? "border-accent/50 shadow-[0_0_0_4px_rgba(59,130,246,0.2),0_16px_34px_rgba(59,130,246,0.15)] scale-[1.01]"
                      : isPromptFocused
                      ? "border-accent/40 shadow-[0_0_0_3px_rgba(59,130,246,0.1),0_16px_34px_rgba(0,0,0,0.4)] scale-[1.005]"
                      : "border-white/10 group-hover:border-white/20"
                  }`}>
                    <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[linear-gradient(180deg,#1c1c1c_0%,#0a0a0a_100%)]" />
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/15 blur-[1px]" />
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-[16px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      animate={{ background: hasPrompt ? ["radial-gradient(circle at top, rgba(59,130,246,0.2), transparent 55%)"] : ["radial-gradient(circle at top, rgba(59,130,246,0.05), transparent 45%)", "radial-gradient(circle at top, rgba(59,130,246,0.15), transparent 50%)", "radial-gradient(circle at top, rgba(59,130,246,0.05), transparent 45%)"] }}
                      transition={
                        hasPrompt || reduceMotion
                          ? {}
                          : { duration: 4, repeat: Infinity, ease: "easeInOut" }
                      }
                    />

                    {/* textarea */}
                    <div className="relative">
                      {!prompt && (
                        <div className="pointer-events-none absolute inset-0 text-[1rem] leading-[1.55] sm:text-[1.05rem] overflow-hidden">
                          <AnimatePresence mode="popLayout">
                            <motion.div key={exampleIndex} initial={{ opacity: 0, x: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduceMotion ? 0 : -18 }} transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 text-white/40">
                              {promptExamples[exampleIndex]}
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      )}
                      <textarea
                        ref={promptRef}
                        rows={1}
                        value={prompt}
                        onFocus={() => setIsPromptFocused(true)}
                        onBlur={() => setIsPromptFocused(false)}
                        onChange={(e) => {
                          setPrompt(e.target.value);
                          // deselect template if user edits
                          if (activeTemplate) setActiveTemplate(null);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (canSubmit) handleSubmit(); } }}
                        className="prompt-textarea caret-accent min-h-[72px] w-full resize-none border-none bg-transparent text-[1rem] leading-[1.55] text-white outline-none sm:min-h-[78px] sm:text-[1.05rem]"
                      />
                    </div>

                    {/* toolbar */}
                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3.5">
                      <div className="flex items-center gap-2.5">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv,.json,.md" />
                        <motion.button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} type="button" aria-label="Attach file" whileTap={reduceMotion ? undefined : { scale: 0.94 }} className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out z-10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white">
                          <Paperclip className="h-4 w-4" />
                        </motion.button>
                        <div className="relative z-20 flex items-center">
                          <button type="button" data-static-hover onClick={(e) => { e.stopPropagation(); setUltraThinking((v) => !v); }} aria-label="Toggle Ultra Thinking" aria-pressed={ultraThinking} className={`inline-flex h-9 items-center gap-2 rounded-full border px-2.5 text-[12px] font-semibold transition-all duration-200 ${ultraThinking ? "border-accent/25 bg-accent/10 text-white shadow-[0_0_18px_rgba(59,130,246,0.14)]" : "border-white/8 bg-white/5 text-white/58"}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${ultraThinking ? "bg-accent/18 text-accent" : "bg-white/8 text-white/48"}`}><Sparkles className="h-3 w-3" /></span>
                            <span>Ultra Thinking</span>
                            <span className={`relative h-5 w-9 rounded-full p-[2px] transition-colors duration-200 ${ultraThinking ? "bg-accent/80" : "bg-white/16"}`}>
                              <motion.span className="block h-4 w-4 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.28)]" animate={{ x: ultraThinking ? 16 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }} />
                            </span>
                          </button>
                        </div>
                        <p className="text-[0.7rem] font-medium tracking-[0.02em] text-white/30 hidden sm:block ml-1">Press Enter to generate</p>
                      </div>
                      <div className="flex items-center gap-2.5 ml-auto">
                        <motion.button onClick={toggleListening} type="button" aria-label={isListening ? "Stop listening" : "Start dictation"} whileTap={reduceMotion ? undefined : { scale: 0.94 }} className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out z-10 ${isListening ? "bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"}`}>
                          <Mic className="h-4 w-4" />
                        </motion.button>
                        <motion.button onClick={(e) => { e.stopPropagation(); handleSubmit(); }} disabled={!canSubmit} aria-label="Send automation prompt" whileTap={canSubmit && !reduceMotion ? { scale: 0.94, rotate: 8 } : undefined} className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out z-10 ${canSubmit ? "bg-accent text-white shadow-[0_8px_18px_rgba(79,142,247,0.3)] hover:scale-[1.05] hover:bg-[#5c95fb]" : "bg-white/10 text-white/30 opacity-80 border border-white/5"}`}>
                          <ArrowUp className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Quick Start Template Chips ── */}
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduceMotion ? 0 : 0.22,
                duration: reduceMotion ? 0 : 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mx-auto max-w-[640px]"
            >
              {/* label */}
              <p className="mb-3 text-center text-[10.5px] font-semibold uppercase tracking-[0.22em] text-white/22">
                Quick Start
              </p>

              {/* horizontal scrollable chip strip */}
              <div className="relative">
                {/* left fade */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
                {/* right fade */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[#0a0a0a] to-transparent" />

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none px-1" style={{ scrollbarWidth: "none" }}>
                  {templates.map((t, tIdx) => {
                    const Icon = t.icon;
                    const isActive = activeTemplate === t.title;
                    return (
                      <motion.button
                        key={t.title}
                        type="button"
                        onClick={() => handleTemplateClick(t)}
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: reduceMotion ? 0 : 0.35,
                          delay: reduceMotion ? 0 : 0.3 + tIdx * 0.04,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="group relative flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-left transition-all duration-200"
                        style={{
                          borderColor: isActive ? `${t.color}60` : "rgba(255,255,255,0.08)",
                          background: isActive ? `${t.color}14` : "rgba(255,255,255,0.03)",
                          boxShadow: isActive ? `0 0 16px ${t.color}25` : "none",
                          color: isActive ? t.color : "rgba(255,255,255,0.5)",
                        }}
                        onMouseEnter={(e) => {
                          if (isActive) return;
                          const btn = e.currentTarget as HTMLButtonElement;
                          btn.style.borderColor = `${t.color}40`;
                          btn.style.background = `${t.color}0a`;
                          btn.style.color = "rgba(255,255,255,0.8)";
                        }}
                        onMouseLeave={(e) => {
                          if (isActive) return;
                          const btn = e.currentTarget as HTMLButtonElement;
                          btn.style.borderColor = "rgba(255,255,255,0.08)";
                          btn.style.background = "rgba(255,255,255,0.03)";
                          btn.style.color = "rgba(255,255,255,0.5)";
                        }}
                      >
                        {/* icon dot */}
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                          style={{ background: `${t.color}20`, color: t.color }}
                        >
                          <Icon className="h-2.5 w-2.5" />
                        </span>

                        {/* label */}
                        <span className="whitespace-nowrap text-[12px] font-medium">
                          {t.title}
                        </span>

                        {/* active check */}
                        {isActive && (
                          <motion.span
                            initial={{ scale: reduceMotion ? 1 : 0 }}
                            animate={{ scale: 1 }}
                            className="ml-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold"
                            style={{ background: t.color, color: "#000" }}
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* hint when a template is active */}
              <AnimatePresence>
                {activeTemplate && (
                  <motion.p
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                    transition={{ duration: reduceMotion ? 0 : 0.25 }}
                    className="mt-3 text-center text-[11.5px] text-white/35"
                  >
                    ✏️ Edit the prompt above or press{" "}
                    <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/50">
                      Enter
                    </kbd>{" "}
                    to generate
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

          </div>
        </motion.div>
      </section>
    </div>
  );
}
