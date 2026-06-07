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
  "Automatically follow up with every new lead within 5 minutes.",
  "Send my team a WhatsApp alert whenever a high-value lead arrives.",
  "Qualify inbound leads and push serious prospects into my CRM.",
  "Notify my sales team instantly when a customer books a demo.",
  "Generate a weekly finance summary and send it to Slack.",
  "Sync my Shopify orders to Google Sheets and notify warehouse.",
  "Create a HubSpot deal when a lead signs a contract.",
  "Transcribe incoming support calls and log summaries in Zendesk.",
  "Draft an SEO-optimized blog post and save it to WordPress.",
  "Monitor competitor pricing changes and alert me via email.",
  "Categorize incoming emails and auto-reply to common questions.",
  "Send a personalized welcome email when a user subscribes.",
  "Generate custom onboarding documents for new enterprise clients.",
  "Extract invoice details and log them into my accounting software.",
  "Route urgent support tickets to the on-call engineer's WhatsApp.",
  "Analyze customer feedback and generate a weekly sentiment report.",
  "Identify churn-risk users and alert account managers in Slack.",
  "Pull daily ad spend from Meta and push it to Google Sheets.",
  "Auto-assign inbound leads based on geography and industry.",
  "Draft a personalized LinkedIn outreach message for new signups.",
  "Trigger a re-engagement email sequence for inactive users.",
  "Send a daily summary of high-priority Jira issues.",
  "Sync new Stripe subscriptions to my CRM and Slack.",
  "Create an invoice and email it to the client upon project completion.",
  "Schedule a follow-up meeting after every product demo.",
  "Send an SMS reminder 24 hours before an upcoming appointment.",
  "Alert the dev team if website performance drops below threshold.",
  "Translate support queries into English before routing them.",
  "Cross-reference customer data to identify upsell opportunities.",
  "Generate a personalized sales proposal based on lead data."
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
    // Pause rotation if the user has typed anything OR if the input is focused
    if (prompt.trim().length > 0 || isPromptFocused) return;
    const id = setInterval(() => setExampleIndex((i) => (i + 1) % promptExamples.length), 4000);
    return () => clearInterval(id);
  }, [prompt, isPromptFocused]);

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
                      ? "border-white/20 shadow-[0_16px_34px_rgba(0,0,0,0.25)] scale-[1.01]"
                      : isPromptFocused
                      ? "border-white/20 shadow-[0_16px_34px_rgba(0,0,0,0.4)] scale-[1.005]"
                      : "border-white/10 group-hover:border-white/20"
                  }`}>
                    <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[linear-gradient(180deg,#1c1c1c_0%,#0a0a0a_100%)]" />
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/15 blur-[1px]" />
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-[16px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      animate={{ background: hasPrompt ? ["radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%)"] : ["radial-gradient(circle at top, rgba(255,255,255,0.03), transparent 45%)", "radial-gradient(circle at top, rgba(255,255,255,0.06), transparent 50%)", "radial-gradient(circle at top, rgba(255,255,255,0.03), transparent 45%)"] }}
                      transition={
                        hasPrompt || reduceMotion
                          ? {}
                          : { duration: 4, repeat: Infinity, ease: "easeInOut" }
                      }
                    />

                    {/* textarea */}
                    <div className="relative">
                      {!prompt && (
                        <div className="pointer-events-none absolute inset-0 h-[1.55em] text-[1rem] leading-[1.55] sm:text-[1.05rem] overflow-hidden">
                          <AnimatePresence mode="popLayout">
                            <motion.div 
                              key={exampleIndex} 
                              initial={{ opacity: 0, y: "100%", filter: "blur(2px)" }} 
                              animate={{ opacity: 1, y: "0%", filter: "blur(0px)" }} 
                              exit={{ opacity: 0, y: "-100%", filter: "blur(2px)" }} 
                              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} 
                              className="absolute inset-0 text-white/40"
                            >
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

            {/* ── Quick Start Templates — Minimal Pills ── */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduceMotion ? 0 : 0.22,
                duration: reduceMotion ? 0 : 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mx-auto mt-5 flex max-w-[700px] flex-wrap items-center justify-center gap-3 px-4"
            >
              {templates.slice(0, 5).map((t, tIdx) => {
                // Since this old component uses Lucide icons instead of iconComponent, we get t.icon
                const IconComp = t.icon;
                return (
                  <motion.button
                    key={t.title}
                    type="button"
                    onClick={() => handleTemplateClick(t)}
                    whileTap={{ scale: reduceMotion ? 1 : 0.97 }}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: reduceMotion ? 0 : 0.3 + tIdx * 0.05,
                    }}
                    className="group flex items-center gap-2 rounded-[12px] border border-white/5 bg-[#151515] px-3.5 py-2 text-[13px] font-medium text-white/50 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-[#1f1f1f] hover:text-white/90 hover:shadow-lg"
                  >
                    <span className="flex items-center justify-center text-white/30 transition-colors group-hover:text-white/70">
                      <IconComp size={15} />
                    </span>
                    <span>{t.title}</span>
                  </motion.button>
                );
              })}
            </motion.div>

          </div>
        </motion.div>
      </section>
    </div>
  );
}
