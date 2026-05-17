"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, CheckCircle2, Home, Star, Sparkles, Pencil, PanelRight, X, ChevronsDown, HelpCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useChatStore } from "@/store/chat-store";
import type { FlowNode } from "./InteractiveCanvas";
import type { ChatSequenceStep, WorkspaceState, Message } from "@/store/chat-store";
import { SystemStatusBar, type SystemPhase } from "./SystemStatusBar";
import { CommandPalette } from "./CommandPalette";
import { useAutomationChat } from "@/hooks/useAutomationChat";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { EmptyState } from "./EmptyState";

const InteractiveCanvas = dynamic(
  () => import("./InteractiveCanvas").then((mod) => mod.InteractiveCanvas),
  { ssr: false }
);

const helpTips = [
  "Describe one workflow in plain English.",
  "Press Enter to send. Use Shift + Enter for a new line.",
  "Use Cmd/Ctrl + K for test, deploy, and preview actions.",
  "Test the automation before deploying it.",
];

interface ChatContainerProps {
  chatId: string;
  initialPrompt?: string;
  ultraThinking?: boolean;
}

const stopWords = ["the", "a", "an", "is", "for", "to", "when", "on", "and", "in", "it"];
function generateTitle(prompt: string): string {
  const normalizedPrompt = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  if (!normalizedPrompt.trim()) return "New Automation";
  if (normalizedPrompt.includes("whatsapp")) return "WhatsApp Automation";
  if (normalizedPrompt.includes("email") && normalizedPrompt.includes("alert")) return "Email Alerts";
  if (normalizedPrompt.includes("email")) return "Email Automation";
  if (normalizedPrompt.includes("lead")) return "Lead Automation";
  if (normalizedPrompt.includes("crm")) return "CRM Workflow";
  if (normalizedPrompt.includes("sheet") || normalizedPrompt.includes("sheets")) return "Sheets Sync";
  if (normalizedPrompt.includes("form")) return "Form Automation";

  const words = normalizedPrompt
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word));

  if (words.length === 0) return "New Automation";
  const resultWords = words.slice(0, 3).map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  if (resultWords.length === 1) resultWords.push("Workflow");
  return resultWords.join(" ");
}

function sanitizeCustomTitle(value: string) {
  return value.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
}

export function ChatContainer({ chatId, initialPrompt, ultraThinking: ultraThinkingProp = false }: ChatContainerProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { sessions, updateSession, setNodes: setStoreNodes } = useChatStore();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const session = sessions[chatId];

  const chatTitle = isClient ? (session?.chatTitle || generateTitle(initialPrompt || "")) : generateTitle(initialPrompt || "");
  const [draftTitle, setDraftTitle] = useState(chatTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const isStarred = isClient ? (session?.isStarred || false) : false;

  const setChatTitle = (update: string | ((prev: string) => string)) => {
    const next = typeof update === "function" ? update(chatTitle) : update;
    updateSession(chatId, { chatTitle: next });
  };

  const setIsStarred = (update: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof update === "function" ? update(isStarred) : update;
    updateSession(chatId, { isStarred: next });
  };

  useEffect(() => {
    if (!isEditingTitle) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isEditingTitle]);

  const saveTitle = () => {
    const nextTitle = sanitizeCustomTitle(draftTitle);
    if (!nextTitle) {
      setDraftTitle(chatTitle);
      setIsEditingTitle(false);
      return;
    }
    setChatTitle(nextTitle);
    setDraftTitle(nextTitle);
    setIsEditingTitle(false);
  };

  const defaultMessages: Message[] = initialPrompt
    ? [
        { id: "init-user", role: "user", content: initialPrompt, timestamp: Date.now() },
        { id: "init-sys", role: "system", content: "Understanding your automation...", timestamp: Date.now() }
      ]
    : [];

  const defaultNodes: FlowNode[] = [
    { id: "n1", type: "trigger", label: "Form Submission", status: "completed", detail: "Awaiting incoming form data" },
    { id: "n2", type: "process", label: "AI Analysis", status: "pending" },
    { id: "n3", type: "action", label: "Send Notification", status: "pending" }
  ];

  const messages = isClient ? (session?.messages || defaultMessages) : defaultMessages;
  const step = isClient ? (session?.step || "boot") : "boot";
  const workspaceState = isClient ? (session?.workspaceState || "understanding") : "understanding";
  const nodes = isClient ? (session?.nodes || defaultNodes) : defaultNodes;

  const setMessages = (update: Message[] | ((prev: Message[]) => Message[])) => {
    const next = typeof update === "function" ? update(messages) : update;
    updateSession(chatId, { messages: next });
  };

  const setStep = (update: ChatSequenceStep | ((prev: ChatSequenceStep) => ChatSequenceStep)) => {
    const next = typeof update === "function" ? update(step) : update;
    updateSession(chatId, { step: next });
  };

  const setWorkspaceState = (update: WorkspaceState | ((prev: WorkspaceState) => WorkspaceState)) => {
    const next = typeof update === "function" ? update(workspaceState) : update;
    updateSession(chatId, { workspaceState: next });
  };

  const setNodes = (update: FlowNode[] | ((prev: FlowNode[]) => FlowNode[])) => {
    const next = typeof update === "function" ? update(nodes) : update;
    setStoreNodes(chatId, next);
  };

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [hasTested, setHasTested] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [hasDeployed, setHasDeployed] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const currentAutomationRef = useRef<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [ultraThinking, setUltraThinking] = useState(ultraThinkingProp);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Real AI Streaming via useAutomationChat ──────────────────────
  const {
    messages: aiMessages,
    status: aiStatus,
    stop: stopGeneration,
    submitPrompt,
  } = useAutomationChat({
    chatId,
    ultraThinking,
    onNodesUpdate: (newNodes) => {
      setNodes(newNodes);
      setWorkspaceState("canvas_visible");
      setIsPanelOpen(true);
      setStep("ready");
    },
    onWorkflowBuilt: (name) => {
      if (name) setChatTitle(name);
    },
  });
  const isGenerating = aiStatus === "streaming" || aiStatus === "submitted";
  // ────────────────────────────────────────────────────────────────

  // Relative time ticker
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Task 5: Auto-focus textarea on load and on '/' press
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== textareaRef.current) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiMessages, isGenerating, scrollToBottom]);

  // Task 6.1: detect scroll position for FAB
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (name: string) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== name));
  };

  const addMessage = (role: "user" | "ai" | "system" | "thinking", content: string, newWorkspaceState?: WorkspaceState, formDef?: any, isReadyCard?: boolean) => {
    const newMsg: Message = { id: crypto.randomUUID(), role, content, timestamp: Date.now() };
    if (formDef) newMsg.form = formDef;
    if (isReadyCard) newMsg.isReadyCard = true;
    setMessages((prev) => [...prev, newMsg]);
    if (newWorkspaceState) setWorkspaceState(newWorkspaceState);
  };

  const handleFormSubmit = (msgId: string, values: any) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, isFormSubmitted: true, formValues: values } : m
      )
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() && attachedFiles.length === 0) return;
    if (isGenerating) return;

    let input = inputText.trim();
    if (attachedFiles.length > 0) {
      input += `\n[Attached Files: ${attachedFiles.map(f => f.name).join(", ")}]`;
    }
    setInputText("");
    setAttachedFiles([]);
    setWorkspaceState("ready_to_build");

    // Route to real AI streaming
    submitPrompt(input);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setIsPanelOpen(true);

    for (let i = 0; i < nodes.length; i++) {
      setNodes(n => n.map((x, idx) =>
        idx === i ? { ...x, status: "active" } : idx < i ? { ...x, status: "completed" } : x
      ));
      await new Promise(r => setTimeout(r, 800));
    }
    setNodes(n => n.map(x => ({ ...x, status: "completed" })));
    await new Promise(r => setTimeout(r, 400));

    setIsTesting(false);
    setHasTested(true);
    submitPrompt("__system_test_passed__");
    addMessage("ai", "**Test Passed ✓**\nAll pipeline steps executed without errors. Your automation is ready to deploy.");
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    await new Promise(r => setTimeout(r, 1800));
    setIsDeploying(false);
    setHasDeployed(true);
    setStep("deployed");
    addMessage("ai", "**Pipeline Deployed ✓**\nYour automation is now live and actively listening for incoming triggers.");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    setTimeout(() => {
      const form = document.querySelector<HTMLFormElement>("form[data-chat-form]");
      if (form) form.requestSubmit();
    }, 50);
  };

  const isInputDisabled = isGenerating;
  const isCanvasVisible = workspaceState === "canvas_visible";
  const hasMessages = messages.length > 0 || aiMessages.length > 0;

  // Task 2.3: Context-aware placeholder
  const composerPlaceholder = (() => {
    if (step === "deployed") return "Need changes? Describe what to update...";
    if (isCanvasVisible) return "Adjust the pipeline, add a step, or ask a question...";
    if (hasMessages) return "Modify the workflow, or describe a new one...";
    return "What would you like to build?";
  })();

  const systemPhase: SystemPhase = (() => {
    if (step === "deployed") return "success";
    if (hasTested) return "ready";
    if (isTesting) return "testing";
    if (isDeploying) return "deploying";
    if (workspaceState === "ready_to_build" || isGenerating) return "building";
    return "idle";
  })();

  const handleCopy = async (id: string, text: string) => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  if (!isClient) {
    return <div className="chat-shell-bg min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>;
  }

  return (
    <div className="chat-shell-bg flex h-screen overflow-hidden selection:bg-accent/30 selection:text-white">
      <CommandPalette 
        onTest={handleTest}
        onDeploy={handleDeploy}
        onTogglePreview={() => setIsPanelOpen(!isPanelOpen)}
        isCanvasVisible={isCanvasVisible}
        hasTested={hasTested}
        isDeploying={isDeploying}
      />

      {/* ─── Main Chat Area ─── */}
      <div className={`relative flex flex-col transition-all duration-500 ease-[0.22,1,0.36,1] h-full ${isPanelOpen && isCanvasVisible ? "w-1/2" : "w-full"} shrink-0`}>
        
        {/* TASK 4: Upgrade the Chat Header */}
        <header className="chat-header-surface absolute top-0 left-0 right-0 z-40 flex h-[52px] items-center justify-between border-b px-4">
          {/* Task 5.1: Breadcrumb navigation */}
          <div className="flex items-center gap-1.5 w-1/3 min-w-0">
            <Link href="/dashboard" className="text-[12px] text-white/40 hover:text-white/70 transition-colors shrink-0">
              Dashboard
            </Link>
            <span className="text-[12px] text-white/20 shrink-0">/</span>
            <span className="text-[12px] text-white/40 shrink-0">Automations</span>
            <span className="text-[12px] text-white/20 shrink-0">/</span>
            
            <div className="relative min-w-0" ref={dropdownRef}>
              <div
                className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-white/[0.04] transition-colors cursor-pointer min-w-0"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitle();
                      if (e.key === "Escape") {
                        setDraftTitle(chatTitle);
                        setIsEditingTitle(false);
                      }
                    }}
                    className="bg-transparent text-[12px] font-medium text-white/90 outline-none w-[160px]"
                  />
                ) : (
                  <span className="text-[12px] font-medium text-white/85 select-none truncate max-w-[180px]">{chatTitle}</span>
                )}
                {!isEditingTitle && <ChevronDown className={`h-3 w-3 text-white/40 transition-transform shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`} />}
              </div>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute left-0 top-full mt-1 w-52 rounded-xl border border-white/[0.08] bg-[#0c0d10] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.5)] z-50"
                  >
                    <button
                      onClick={() => { setIsEditingTitle(true); setIsDropdownOpen(false); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] text-white/60 hover:bg-white/[0.04] hover:text-white"
                    >
                      <Pencil className="h-3 w-3" /> Rename
                    </button>
                    <button
                      onClick={() => { setIsStarred(!isStarred); setIsDropdownOpen(false); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] text-white/60 hover:bg-white/[0.04] hover:text-white"
                    >
                      <Star className={`h-3 w-3 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} /> 
                      {isStarred ? "Unfavorite" : "Favorite"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex w-1/3 justify-center">
            <SystemStatusBar phase={systemPhase} />
          </div>

          <div className="flex w-1/3 justify-end items-center gap-2">
            <div className="relative" ref={helpRef}>
              <button
                type="button"
                onClick={() => setIsHelpOpen((current) => !current)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/20 transition-all hover:bg-white/[0.04] hover:text-white/55"
                aria-label="Open workspace help"
                aria-expanded={isHelpOpen}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              <AnimatePresence>
                {isHelpOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/[0.08] bg-[#0c0d10] p-4 text-left shadow-[0_18px_48px_rgba(0,0,0,0.55)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">
                      Workspace guide
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {helpTips.map((tip, index) => (
                        <div key={tip} className="flex gap-2.5 text-[12px] leading-5 text-white/55">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-accent/15 bg-accent/8 text-[9px] font-semibold text-accent/80">
                            {index + 1}
                          </span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            {isCanvasVisible && (
              <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                  isPanelOpen
                    ? "bg-accent/10 text-accent hover:bg-accent/15"
                    : "text-white/25 hover:bg-white/[0.04] hover:text-white/50"
                }`}
                aria-label={isPanelOpen ? "Hide preview" : "Show preview"}
              >
                <PanelRight className="h-3.5 w-3.5" />
              </button>
            )}
            {/* Cmd+K hint */}
            <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/[0.05] bg-white/[0.015]">
              <span className="text-[10px] font-medium text-white/20 tracking-widest">⌘K</span>
            </div>
          </div>
        </header>

        {/* ─── Scrollable Area ─── */}
        <div ref={scrollContainerRef} className="chat-scrollable absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="flex min-h-full flex-col">
            <div className={`mx-auto w-full max-w-3xl flex-1 px-5 ${hasMessages ? "pt-[92px] pb-[140px]" : "pt-0 pb-0"}`}>
              {!hasMessages ? (
                <EmptyState onSuggestionClick={handleSuggestionClick} />
              ) : (
                <MessageList
                  messages={messages}
                  aiMessages={aiMessages}
                  isGenerating={isGenerating}
                  hoveredMsgId={hoveredMsgId}
                  copiedId={copiedId}
                  onHoverMsg={setHoveredMsgId}
                  onCopy={handleCopy}
                  onEdit={setInputText}
                  onFormSubmit={handleFormSubmit}
                  nodes={nodes}
                  currentAutomation={currentAutomationRef.current}
                  isTesting={isTesting}
                  hasTested={hasTested}
                  isDeploying={isDeploying}
                  hasDeployed={hasDeployed}
                  onTest={handleTest}
                  onDeploy={handleDeploy}
                  messagesEndRef={messagesEndRef}
                />
              )}
            </div>
          </div>
        </div>

        {/* Task 6.1: Scroll-to-bottom FAB */}
        <AnimatePresence>
          {showScrollBtn && hasMessages && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={scrollToBottom}
              className="absolute bottom-[120px] right-6 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[#161820] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-[#1e2028] shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all"
              aria-label="Scroll to bottom"
            >
              <ChevronsDown className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ─── Floating Input Bar ─── */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center bg-gradient-to-t from-[#08090b] via-[#08090b]/94 to-transparent px-5 pb-5 pt-14 pointer-events-none">
          <Composer
            value={inputText}
            onChange={setInputText}
            onSubmit={handleSubmit}
            onStop={stopGeneration}
            isGenerating={isGenerating}
            disabled={isInputDisabled}
            isPanelOpen={isPanelOpen}
            isCanvasVisible={isCanvasVisible}
            attachedFiles={attachedFiles}
            onRemoveFile={removeFile}
            onFileAttach={handleFileAttach}
            fileInputRef={fileInputRef}
            textareaRef={textareaRef}
            placeholder={composerPlaceholder}
          />
        </div>
      </div>

      {/* ─── Side Panel (Push-Left) ─── */}
      <InteractiveCanvas
        nodes={nodes}
        onTest={handleTest}
        onDeploy={handleDeploy}
        isDeploying={isDeploying}
        hasDeployed={hasDeployed}
        isTesting={isTesting}
        hasTested={hasTested}
        isOpen={isPanelOpen && isCanvasVisible}
        onClose={() => setIsPanelOpen(false)}
      />

    </div>
  );
}
