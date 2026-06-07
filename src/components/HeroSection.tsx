"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, useScroll, useSpring, useTransform, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp, Mic } from "lucide-react";
const HeroScene = dynamic(() => import("@/components/HeroScene"), { ssr: false });

import { LoginModal } from "@/components/auth/LoginModal";
import type { AuthenticatedUser } from "@/lib/automation";
import { MAX_INITIAL_PROMPT_CHARS, truncateText } from "@/lib/ai/context-limits";

const promptExamples = [
  "Send WhatsApp message when someone fills my form",
  "Automatically reply to new leads with email",
  "Save form data to Google Sheets and notify me",
];

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export default function HeroSection({
  user,
  allowAnonymousSubmit = false,
}: {
  user: AuthenticatedUser | null;
  allowAnonymousSubmit?: boolean;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [prompt, setPrompt] = useState("");
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const heightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const { scrollY } = useScroll();
  const heroYRaw = useTransform(scrollY, reduceMotion ? [0, 1] : [0, 280, 700], reduceMotion ? [0, 0] : [0, -16, -40]);
  const heroOpacityRaw = useTransform(scrollY, reduceMotion ? [0, 1] : [0, 600], reduceMotion ? [1, 1] : [1, 0.94]);
  const heroY = useSpring(heroYRaw, {
    stiffness: reduceMotion ? 1000 : 88,
    damping: reduceMotion ? 100 : 24,
    mass: reduceMotion ? 1 : 0.55,
  });
  const heroOpacity = useSpring(heroOpacityRaw, {
    stiffness: reduceMotion ? 1000 : 90,
    damping: reduceMotion ? 100 : 24,
    mass: reduceMotion ? 1 : 0.55,
  });

  const adjustPromptHeight = useEffectEvent(() => {
    const element = promptRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 260)}px`;
  });

  useEffect(() => {
    if (heightTimerRef.current) clearTimeout(heightTimerRef.current);
    heightTimerRef.current = setTimeout(() => adjustPromptHeight(), 60);
    return () => {
      if (heightTimerRef.current) clearTimeout(heightTimerRef.current);
    };
  }, [prompt]);

  useEffect(() => {
    if (prompt.trim().length > 0) return;
    const interval = setInterval(() => {
      setExampleIndex((current) => (current + 1) % promptExamples.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [prompt]);

  const handleSubmit = () => {
    if (!prompt.trim()) return;

    if (!user && !allowAnonymousSubmit) {
      setShowAuthModal(true);
      return;
    }

    const chatId = Math.random().toString(36).substring(7);
    const safePrompt = truncateText(prompt.trim(), MAX_INITIAL_PROMPT_CHARS);
    const params = new URLSearchParams({ prompt: safePrompt });
    router.push(`/dashboard/chat/${chatId}?${params.toString()}`);
  };

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const win = window as SpeechWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;

    let startText = promptRef.current?.value || "";
    if (startText.trim()) startText = startText.trim() + " ";

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) startText += finalTranscript + " ";
      setPrompt(startText + interimTranscript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (err) {
      console.error(err);
    }
  };

  const hasPrompt = prompt.trim().length > 0;
  const canSubmit = prompt.trim().length > 0;

  return (
    <div className="relative w-full">
      <section
        id="home"
        className="relative flex min-h-screen items-center overflow-hidden pb-10 pt-24 md:pb-14"
      >
        <HeroScene isPromptFocused={isPromptFocused} />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-4xl text-center">
            {/* ── Headline ── */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="mx-auto max-w-4xl text-[3.3rem] font-semibold leading-[1.05] tracking-[-0.06em] text-foreground sm:text-[4.4rem] lg:text-[5.4rem]">
                {user ? (
                  <>
                    Ready to build automation,<br />
                    <span className="text-accent">{user.name || "User"}</span>
                  </>
                ) : (
                  <>
                    <span className="text-accent">Describe it.</span><br />We Build it.
                  </>
                )}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[1.02rem] leading-8 text-foreground/62 sm:text-lg">
                Describe your workflow and get a ready-to-run automation.
              </p>
            </motion.div>

            {/* ── Floating Composer Card ── */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: reduceMotion ? 1 : 1.012, y: reduceMotion ? 0 : -3 }}
              transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative mx-auto my-10 max-w-[600px] cursor-text"
              onClick={() => promptRef.current?.focus()}
            >
              <div className="relative">
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-8 top-10 h-20 w-20 rounded-full bg-accent/[0.05] blur-3xl"
                />
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-8 right-10 h-24 w-24 rounded-full bg-white/60 blur-3xl"
                />

                <div className="rounded-[16px] bg-[#0a0a0a] p-1.5 text-left shadow-[0_24px_50px_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.1)] transition-[box-shadow,transform] duration-300 ease-out group-hover:shadow-[0_32px_60px_rgba(79,142,247,0.2),0_16px_32px_rgba(28,28,28,0.12)]">
                  <div
                    className={`relative isolate overflow-hidden rounded-[16px] border border-white/10 px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out sm:px-5 sm:py-4.5 group-hover:border-white/20 group-hover:shadow-[0_18px_42px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.06)]`}
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[linear-gradient(180deg,#1c1c1c_0%,#0a0a0a_100%)]" />
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/15 blur-[1px]" />

                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-[16px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      animate={
                        reduceMotion
                          ? undefined
                          : {
                              background: hasPrompt
                                ? ["radial-gradient(circle at top, rgba(79,142,247,0.2), transparent 55%)"]
                                : [
                                    "radial-gradient(circle at top, rgba(79,142,247,0.05), transparent 45%)",
                                    "radial-gradient(circle at top, rgba(79,142,247,0.15), transparent 50%)",
                                    "radial-gradient(circle at top, rgba(79,142,247,0.05), transparent 45%)",
                                  ],
                            }
                      }
                      transition={hasPrompt ? {} : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <div className="relative">
                      {!prompt ? (
                        <div className="pointer-events-none absolute inset-0 text-[1rem] leading-[1.55] sm:text-[1.05rem] overflow-hidden">
                          <AnimatePresence mode="popLayout">
                            <motion.div
                              key={exampleIndex}
                              initial={false}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                              className="absolute inset-0 text-white/40"
                            >
                              {promptExamples[exampleIndex]}
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      ) : null}

                      <textarea
                        ref={promptRef}
                        rows={1}
                        value={prompt}
                        onFocus={() => setIsPromptFocused(true)}
                        onBlur={() => setIsPromptFocused(false)}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            if (canSubmit) handleSubmit();
                          }
                        }}
                        className="prompt-textarea min-h-[72px] w-full resize-none border-none bg-transparent text-[1rem] leading-[1.55] text-white outline-none sm:min-h-[78px] sm:text-[1.05rem]"
                      />
                    </div>

                    {/* Bottom bar */}
                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3.5">
                      <p className="text-[0.7rem] font-medium tracking-[0.02em] text-white/30 hidden sm:block">
                        Press Enter to generate
                      </p>

                      <div className="flex items-center gap-2.5 ml-auto">
                        <motion.button
                          onClick={toggleListening}
                          type="button"
                          aria-label={isListening ? "Stop listening" : "Start dictation"}
                          whileTap={{ scale: 0.94 }}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out z-10 ${
                            isListening
                              ? "bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse"
                              : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <Mic className="h-4 w-4" />
                        </motion.button>

                        <motion.button
                          onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                          disabled={!canSubmit}
                          aria-label="Send automation prompt"
                          whileTap={canSubmit && !reduceMotion ? { scale: 0.94, rotate: 8 } : undefined}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out z-10 ${
                            canSubmit
                              ? "bg-accent text-white shadow-[0_8px_18px_rgba(79,142,247,0.3)] hover:scale-[1.05] hover:bg-[#5c95fb]"
                              : "bg-white/10 text-white/30 opacity-80 border border-white/5"
                          }`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Sign-in Modal for unauthenticated anonymous attempts */}
      <LoginModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        nextUrl={`/dashboard/chat/new?prompt=${encodeURIComponent(truncateText(prompt.trim(), MAX_INITIAL_PROMPT_CHARS))}`}
      />
    </div>
  );
}
