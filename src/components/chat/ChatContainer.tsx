"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ChevronsDown,
  HelpCircle,
  LayoutGrid,
  PanelRight,
  Pencil,
  Star,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useChatStore } from "@/store/chat-store";
import type { FlowNode } from "./InteractiveCanvas";
import type { ChatSequenceStep, WorkspaceState } from "@/store/chat-store";
import { SystemStatusBar, type SystemPhase } from "./SystemStatusBar";
import { CommandPalette } from "./CommandPalette";
import { useAutomationChat } from "@/hooks/useAutomationChat";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { EmptyState } from "./EmptyState";
import { getFileCategory, processFiles, validateFile } from "@/lib/file-utils";

const InteractiveCanvas = dynamic(
  () => import("./InteractiveCanvas").then((mod) => mod.InteractiveCanvas),
  { ssr: false },
);

const helpTips = [
  "Describe one workflow in plain English.",
  "Press Enter to send. Use Shift + Enter for a new line.",
  "Use Cmd/Ctrl + K for test, deploy, and preview actions.",
  "Test the automation before deploying it.",
];

/* ── Templates (connected to suggestion system) ── */
const STARTER_TEMPLATES = [
  {
    title: "Email Follow-up",
    desc: "Automate my email follow-up workflow after form submissions",
    icons: ["📧", "🔄"],
    meta: "2 steps · Email + Forms",
    prompt: "Automate my email follow-up workflow",
  },
  {
    title: "Sheets → CRM Sync",
    desc: "Sync new Google Sheets rows to CRM contacts automatically",
    icons: ["📊", "💼"],
    meta: "3 steps · Sheets + CRM",
    prompt: "Sync Google Sheets data to my CRM",
  },
  {
    title: "Form Alert Pipeline",
    desc: "Send instant alerts via email and Slack when forms are submitted",
    icons: ["📋", "🔔"],
    meta: "2 steps · Forms + Notifications",
    prompt: "Send alerts when a form is submitted",
  },
  {
    title: "WhatsApp Leads",
    desc: "Route WhatsApp messages to your lead pipeline with AI triage",
    icons: ["💬", "🎯"],
    meta: "3 steps · WhatsApp + AI",
    prompt: "Connect WhatsApp to my lead pipeline",
  },
  {
    title: "Slack Digest Bot",
    desc: "Summarize daily activity across tools and post to Slack",
    icons: ["💬", "📊"],
    meta: "3 steps · Multi-source + Slack",
    prompt: "Create a daily Slack digest summarizing activity across my tools",
  },
  {
    title: "Invoice Processor",
    desc: "Extract data from uploaded invoices and log to accounting",
    icons: ["🧾", "💰"],
    meta: "2 steps · AI + Accounting",
    prompt: "Build an invoice processing automation that extracts data and logs to accounting",
  },
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

/**
 * Ephemeral system notice (test/deploy confirmations, provider errors).
 * Lives only in ChatContainer's local state — not persisted, not part of
 * the model conversation. Distinct from user/assistant messages, which are
 * owned exclusively by useChat (canonical message source).
 */
type Notice = {
  id: string;
  content: string;
  timestamp: number;
  kind: "info" | "error";
};

function isErrorNotice(content: string): boolean {
  return /not enough credits|ai provider error|request failed|failed to fetch|error/i.test(content);
}

export function ChatContainer({
  chatId,
  initialPrompt,
  ultraThinking: ultraThinkingProp = false,
}: ChatContainerProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAutomationRef = useRef<{ trigger?: string; action?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoSubmitted = useRef(false);

  // ── Transient UI state (not persisted) ─────────────────────────
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [inputText, setInputText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // ── Persisted workspace state (chat-store, per chatId) ─────────
  const { sessions, updateSession, setNodes: setStoreNodes } = useChatStore();
  const session = sessions[chatId];

  const defaultNodes: FlowNode[] = [
    { id: "n1", type: "trigger", label: "Form Submission", status: "completed", detail: "Awaiting incoming form data" },
    { id: "n2", type: "process", label: "AI Analysis", status: "pending" },
    { id: "n3", type: "action", label: "Send Notification", status: "pending" },
  ];

  // SSR-safe reads: defaults during pre-hydration, real session after.
  const chatTitle = isClient
    ? session?.chatTitle || generateTitle(initialPrompt || "")
    : generateTitle(initialPrompt || "");
  const [draftTitle, setDraftTitle] = useState(chatTitle);
  const isStarred = isClient ? session?.isStarred ?? false : false;
  const step = isClient ? session?.step ?? "boot" : "boot";
  const workspaceState = isClient ? session?.workspaceState ?? "understanding" : "understanding";
  const nodes = isClient ? session?.nodes ?? defaultNodes : defaultNodes;
  const isPanelOpen = isClient ? session?.panelOpen ?? false : false;
  const panelWidthPct = isClient ? session?.panelWidthPct ?? 50 : 50;
  const isTesting = isClient ? session?.isTesting ?? false : false;
  const hasTested = isClient ? session?.hasTested ?? false : false;
  const isDeploying = isClient ? session?.isDeploying ?? false : false;
  const hasDeployed = isClient ? session?.hasDeployed ?? false : false;
  // Ultra-thinking: URL param overrides stored value on first mount; persisted thereafter.
  const ultraThinking = isClient ? session?.ultraThinking ?? ultraThinkingProp : ultraThinkingProp;
  const autoSubmittedAt = isClient ? session?.autoSubmittedAt ?? null : null;

  // ── Workspace setters (route through updateSession for updatedAt) ──
  const setIsPanelOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const value = typeof next === "function" ? next(isPanelOpen) : next;
      updateSession(chatId, { panelOpen: value });
    },
    [chatId, isPanelOpen, updateSession],
  );
  const setIsTesting = useCallback(
    (value: boolean) => updateSession(chatId, { isTesting: value }),
    [chatId, updateSession],
  );
  const setHasTested = useCallback(
    (value: boolean) => updateSession(chatId, { hasTested: value }),
    [chatId, updateSession],
  );
  const setIsDeploying = useCallback(
    (value: boolean) => updateSession(chatId, { isDeploying: value }),
    [chatId, updateSession],
  );
  const setHasDeployed = useCallback(
    (value: boolean) => updateSession(chatId, { hasDeployed: value }),
    [chatId, updateSession],
  );

  // Ephemeral system notices (test/deploy confirmations, provider errors).
  // Not persisted, not part of model conversation. Distinct from user/assistant
  // messages which are owned by useChat (canonical source).
  const [notices, setNotices] = useState<Notice[]>([]);

  const pushNotice = useCallback((content: string, kind?: Notice["kind"]) => {
    const normalized = content.trim();
    if (!normalized) return;
    const timestamp = Date.now();
    const resolvedKind: Notice["kind"] = kind ?? (isErrorNotice(normalized) ? "error" : "info");
    setNotices((prev) => {
      // Dedupe: drop if same content + kind within last 2s
      const dup = prev.some(
        (n) =>
          n.content === normalized &&
          n.kind === resolvedKind &&
          timestamp - n.timestamp < 2000,
      );
      return dup
        ? prev
        : [...prev, { id: crypto.randomUUID(), content: normalized, timestamp, kind: resolvedKind }];
    });
  }, []);

  const clearErrorNotices = useCallback(() => {
    setNotices((prev) => prev.filter((n) => n.kind !== "error"));
  }, []);

  const setChatTitle = (update: string | ((prev: string) => string)) => {
    const next = typeof update === "function" ? update(chatTitle) : update;
    updateSession(chatId, { chatTitle: next });
  };

  const setIsStarred = (update: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof update === "function" ? update(isStarred) : update;
    updateSession(chatId, { isStarred: next });
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
    const latestNodes = useChatStore.getState().sessions[chatId]?.nodes || defaultNodes;
    const next = typeof update === "function" ? update(latestNodes) : update;
    setStoreNodes(chatId, next);
  };

  const {
    messages: aiMessages,
    status: aiStatus,
    stop: stopGeneration,
    submitPrompt,
  } = useAutomationChat({
    chatId,
    ultraThinking,
    onNodesUpdate: (newNodes) => {
      const triggerNode = newNodes.find((node) => node.type === "trigger");
      const actionNode = newNodes.find((node) => node.type === "action");
      currentAutomationRef.current = {
        trigger: triggerNode?.label,
        action: actionNode?.label,
      };
      setNodes(newNodes);
      setWorkspaceState("canvas_visible");
      setIsPanelOpen(true);
      setStep("ready");
    },
    onWorkflowBuilt: (name) => {
      // Successful build supersedes prior provider errors.
      clearErrorNotices();
      if (name) setChatTitle(name);
    },
    onErrorMessage: (message) => {
      pushNotice(message || "The AI request failed. Check the console/server logs.", "error");
      setWorkspaceState("understanding");
    },
  });

  const isGenerating = aiStatus === "streaming" || aiStatus === "submitted";
  const hasAssistantResponse = aiMessages.some((message) => message.role === "assistant");

  // Once an assistant response arrives, drop stale error notices older than 30s
  // so transient errors don't linger above a successful generation.
  const visibleNotices = hasAssistantResponse
    ? notices.filter((n) => n.kind !== "error" || Date.now() - n.timestamp < 30000)
    : notices;

  const isCanvasVisible = workspaceState === "canvas_visible";
  const hasMessages = visibleNotices.length > 0 || aiMessages.length > 0;
  const isInputDisabled = isGenerating;

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

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isEditingTitle) setDraftTitle(chatTitle);
  }, [chatTitle, isEditingTitle]);

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

  useEffect(() => {
    if (!isEditingTitle) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isEditingTitle]);

  /**
   * Auto-submit initial prompt — guarded by persisted `autoSubmittedAt` so
   * React StrictMode double-mount, Fast Refresh, and route revisits don't
   * trigger duplicate LLM calls (which would double-bill credits).
   *
   * The previous in-memory `useRef` guard reset on every fresh mount.
   * The persisted guard reset on every fresh mount UNTIL React re-rendered
   * with the new value (race between Zustand set() and React render).
   *
   * Fix: read `autoSubmittedAt` from `useChatStore.getState()` directly
   * inside the effect — this returns the live Zustand value, bypassing the
   * stale render snapshot. Also write before submitPrompt to close the
   * window where two near-simultaneous effects both see null.
   */
  useEffect(() => {
    if (!isClient || !initialPrompt) return;
    if (hasAutoSubmitted.current) return;
    // Live read — not the React-render-captured value.
    const liveSession = useChatStore.getState().sessions[chatId];
    if (liveSession?.autoSubmittedAt != null) return;
    // Set the persistent guard BEFORE firing the request so a parallel
    // mount sees the non-null timestamp on its getState() check.
    hasAutoSubmitted.current = true;
    updateSession(chatId, {
      autoSubmittedAt: Date.now(),
      ultraThinking: ultraThinkingProp,
    });
    submitPrompt(initialPrompt);
  }, [isClient, initialPrompt, chatId, updateSession, submitPrompt, ultraThinkingProp]);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowScrollBtn((current) => current);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
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

  /**
   * Split-panel resize.
   *
   * Drag the divider between chat pane and side panel to change their
   * relative widths. Clamped to [30%, 70%] panel width. Persisted to
   * Zustand per chatId so the user's choice survives reloads.
   *
   * Implementation: mousedown captures starting cursor X and the main
   * container width; global mousemove updates panelWidthPct on the
   * store; mouseup ends the drag. Mouse cursor is forced to col-resize
   * during drag via body class to prevent flicker over child elements.
   */
  const mainGridRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef<{
    startX: number;
    startPct: number;
    containerWidth: number;
  } | null>(null);

  const onResizeStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const container = mainGridRef.current;
      if (!container) return;
      resizeStateRef.current = {
        startX: e.clientX,
        startPct: panelWidthPct,
        containerWidth: container.getBoundingClientRect().width,
      };
      setIsResizing(true);
    },
    [panelWidthPct],
  );

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const st = resizeStateRef.current;
      if (!st || st.containerWidth <= 0) return;
      const deltaPx = e.clientX - st.startX;
      const deltaPct = (deltaPx / st.containerWidth) * 100;
      // Panel sits on the right — dragging the handle LEFT enlarges it.
      const nextPct = Math.max(30, Math.min(70, st.startPct - deltaPct));
      updateSession(chatId, { panelWidthPct: nextPct });
    };
    const onUp = () => {
      setIsResizing(false);
      resizeStateRef.current = null;
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing, chatId, updateSession]);

  /**
   * Streaming-safe auto-scroll.
   *
   * Anchor only when the user is already near the bottom (within 120px).
   * If the user scrolled up to read earlier content, never yank them back
   * mid-stream. The "scroll to bottom" FAB lets them re-anchor manually.
   *
   * `stickToBottomRef` is the single source of truth for scroll intent:
   *   - true after a user sends a message (force-stick once)
   *   - true while user is near bottom
   *   - false the moment they scroll up past the threshold
   */
  const STICK_THRESHOLD_PX = 120;
  const stickToBottomRef = useRef(true);

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    stickToBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Anchor on new content only when user intent is "stick to bottom".
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: isGenerating ? "auto" : "smooth" });
  }, [notices, aiMessages, isGenerating]);

  // Track scroll position → update FAB + scroll intent.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const near = distFromBottom < STICK_THRESHOLD_PX;
      stickToBottomRef.current = near;
      setShowScrollBtn(distFromBottom > 200);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

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

  const addValidatedFiles = useCallback((incoming: File[]) => {
    setAttachedFiles((prev) => {
      let currentImageCount = prev.filter((file) => getFileCategory(file) === "image").length;
      const errors: string[] = [];
      const accepted: File[] = [];

      for (const file of incoming) {
        if (prev.some((existing) => existing.name === file.name) || accepted.some((existing) => existing.name === file.name)) {
          errors.push(`"${file.name}" is already attached.`);
          continue;
        }

        const result = validateFile(file, currentImageCount);
        if (!result.valid) {
          errors.push(result.error!);
          continue;
        }

        if (getFileCategory(file) === "image") currentImageCount++;
        accepted.push(file);
      }

      if (errors.length > 0) {
        setFileErrors((current) => [...current, ...errors]);
        setTimeout(() => {
          setFileErrors((current) => current.slice(errors.length));
        }, 5000);
      }

      return [...prev, ...accepted];
    });
  }, []);

  const handleFileAttach = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addValidatedFiles(Array.from(e.target.files));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addValidatedFiles],
  );

  const handleFileDrop = useCallback(
    (files: File[]) => {
      addValidatedFiles(files);
    },
    [addValidatedFiles],
  );

  const dismissFileError = useCallback((idx: number) => {
    setFileErrors((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const removeFile = (name: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.name !== name));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && attachedFiles.length === 0) || isGenerating) return;

    const input = inputText.trim();
    const filesToProcess = [...attachedFiles];

    setInputText("");
    setAttachedFiles([]);
    setFileErrors([]);
    setWorkspaceState("ready_to_build");
    // User just sent — re-stick to bottom regardless of previous scroll position.
    stickToBottomRef.current = true;

    if (filesToProcess.length > 0) {
      try {
        const processed = await processFiles(filesToProcess);
        await submitPrompt(input, processed);
      } catch (err) {
        console.error("[ChatContainer] File processing error:", err);
        if (!input) {
          pushNotice("File processing failed. Please try a smaller or supported file.", "error");
          setWorkspaceState("understanding");
          return;
        }
        await submitPrompt(input);
      }
    } else {
      await submitPrompt(input);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setIsPanelOpen(true);

    for (let i = 0; i < nodes.length; i++) {
      setNodes((currentNodes) =>
        currentNodes.map((node, idx) =>
          idx === i ? { ...node, status: "active" } : idx < i ? { ...node, status: "completed" } : node,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, status: "completed" })));
    await new Promise((resolve) => setTimeout(resolve, 400));

    setIsTesting(false);
    setHasTested(true);
    pushNotice("Test passed. All pipeline steps executed without errors.", "info");
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    setIsDeploying(false);
    setHasDeployed(true);
    setStep("deployed");
    pushNotice("Pipeline deployed. Your automation is now live.", "info");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    setTimeout(() => {
      const form = document.querySelector<HTMLFormElement>("form[data-chat-form]");
      form?.requestSubmit();
    }, 50);
  };

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

  const handleEditMessage = (text: string) => {
    setInputText(text);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  /* ── Slash command handler ── */
  const handleSlashCommand = useCallback(
    (cmd: string) => {
      switch (cmd) {
        case "/test":
          if (isCanvasVisible && !isTesting && !hasTested) handleTest();
          break;
        case "/deploy":
          if (hasTested && !isDeploying && !hasDeployed) handleDeploy();
          break;
        case "/clear":
          setNotices([]);
          // Reset workspace lifecycle but keep title/starred.
          updateSession(chatId, {
            workspaceState: "understanding",
            step: "boot",
            isTesting: false,
            hasTested: false,
            isDeploying: false,
            hasDeployed: false,
            panelOpen: false,
            autoSubmittedAt: null,
          });
          hasAutoSubmitted.current = false;
          break;
        case "/status":
          pushNotice(`Status: ${systemPhase} · ${nodes.length} nodes · ${step}`, "info");
          break;
        case "/help":
          pushNotice(
            "Available commands: /test (run test), /deploy (deploy workflow), /clear (reset conversation), /status (show status), /help (show commands)",
            "info",
          );
          break;
        default:
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCanvasVisible, isTesting, hasTested, isDeploying, hasDeployed, systemPhase, nodes.length, step],
  );

  if (!isClient) {
    return (
      <div className="cc-chat flex min-h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--cc-accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="cc-chat w-full h-full flex flex-col selection:bg-[var(--cc-accent)]/30 selection:text-white">
      <CommandPalette
        onTest={handleTest}
        onDeploy={handleDeploy}
        onTogglePreview={() => setIsPanelOpen((current) => !current)}
        isCanvasVisible={isCanvasVisible}
        hasTested={hasTested}
        isDeploying={isDeploying}
      />

      {/* ── Templates Modal ── */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="cc-templates-overlay"
            onClick={() => setShowTemplates(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="cc-templates-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cc-templates-hd">
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--cc-text-0)" }}>
                    Workflow Templates
                  </div>
                  <div style={{ fontSize: 12, color: "var(--cc-text-2)", marginTop: 2 }}>
                    Start from a proven automation pattern
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="cc-panel__close"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="cc-templates-grid">
                {STARTER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.title}
                    className="cc-tcard"
                    onClick={() => {
                      setShowTemplates(false);
                      handleSuggestionClick(tpl.prompt);
                    }}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 14 }}>{tpl.icons.join(" ")}</span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--cc-text-0)", marginTop: 4 }}>
                      {tpl.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--cc-text-2)", lineHeight: 1.5 }}>
                      {tpl.desc}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--cc-text-3)", fontFamily: "var(--cc-mono)" }}>
                      {tpl.meta}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="cc-app">
        {/* ── Header ── */}
        <header className="cc-header">
          <div className="cc-header__left">
            <div className="cc-proj-wrap" ref={dropdownRef}>
              {isEditingTitle ? (
                <div className="flex h-8 items-center rounded-lg" style={{ border: "1px solid var(--cc-border)", background: "var(--cc-bg-input)", padding: "0 8px" }}>
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
                    className="w-full min-w-0 bg-transparent text-[13px] font-semibold outline-none"
                    style={{ color: "var(--cc-text-0)" }}
                  />
                </div>
              ) : (
                <button
                  className={`cc-proj-trigger${isDropdownOpen ? " is-open" : ""}`}
                  onClick={() => setIsDropdownOpen((current) => !current)}
                  type="button"
                  aria-expanded={isDropdownOpen}
                >
                  <span className="truncate max-w-[48vw]">{chatTitle}</span>
                  <ChevronDown className="cc-chev h-3.5 w-3.5" />
                </button>
              )}

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="cc-proj-menu"
                  >
                    <button
                      onClick={() => {
                        setIsEditingTitle(true);
                        setIsDropdownOpen(false);
                      }}
                      className="cc-proj-menu__item"
                      type="button"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Rename
                    </button>
                    <button
                      onClick={() => {
                        setIsStarred(!isStarred);
                        setIsDropdownOpen(false);
                      }}
                      className="cc-proj-menu__item"
                      type="button"
                    >
                      <Star className={`h-3.5 w-3.5 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
                      {isStarred ? "Unfavorite" : "Favorite"}
                    </button>
                    <div style={{ height: 1, background: "var(--cc-border-subtle)", margin: "4px 6px" }} />
                    <button
                      onClick={() => {
                        setShowTemplates(true);
                        setIsDropdownOpen(false);
                      }}
                      className="cc-proj-menu__item"
                      type="button"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" /> Browse Templates
                    </button>
                    <Link
                      href="/dashboard"
                      className="cc-proj-menu__item"
                    >
                      <ArrowRight className="h-3.5 w-3.5" /> Dashboard
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="cc-header__right">
            <SystemStatusBar phase={systemPhase} />

            <div className="relative" ref={helpRef}>
              <button
                type="button"
                onClick={() => setIsHelpOpen((current) => !current)}
                className="cc-hbtn"
                aria-label="Open workspace help"
                aria-expanded={isHelpOpen}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              <AnimatePresence>
                {isHelpOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="cc-proj-menu"
                    style={{ left: "auto", right: 0, width: 286 }}
                  >
                    <div style={{ padding: "8px 10px 4px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cc-text-3)" }}>
                      Workspace guide
                    </div>
                    {helpTips.map((tip, index) => (
                      <div key={tip} className="flex gap-2.5 px-2.5 py-1.5" style={{ fontSize: 12, color: "var(--cc-text-1)" }}>
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ border: "1px solid var(--cc-border)", fontSize: 10, color: "var(--cc-text-3)" }}>
                          {index + 1}
                        </span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {isCanvasVisible && (
              <button
                onClick={() => setIsPanelOpen((current) => !current)}
                className={`cc-hbtn ${isPanelOpen ? "!border-[var(--cc-accent-border)] !bg-[var(--cc-accent-dim)] !text-[var(--cc-accent)]" : ""}`}
                aria-label={isPanelOpen ? "Hide preview" : "Show preview"}
                type="button"
              >
                <PanelRight className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="hidden sm:flex cc-hbtn" style={{ fontFamily: "var(--cc-mono)", fontSize: 10, color: "var(--cc-text-3)", cursor: "default" }}>
              ⌘K
            </div>
          </div>
        </header>

        {/* ── Main grid ── */}
        <div
          ref={mainGridRef}
          className={`cc-main${isPanelOpen && isCanvasVisible ? " has-panel" : ""}`}
          style={
            isPanelOpen && isCanvasVisible
              ? { gridTemplateColumns: `${100 - panelWidthPct}% 6px ${panelWidthPct}%` }
              : undefined
          }
        >
          {/* ── Chat pane ── */}
          <div className="cc-chat-pane">
            <div
              ref={scrollContainerRef}
              className="cc-chat__scroll"
              role="log"
              aria-label="Conversation workspace"
            >
              <div className="cc-chat__msgs">
                {!hasMessages ? (
                  <EmptyState
                    onSuggestionClick={handleSuggestionClick}
                    onShowTemplates={() => setShowTemplates(true)}
                  />
                ) : (
                  <MessageList
                    aiMessages={aiMessages}
                    notices={visibleNotices}
                    isGenerating={isGenerating}
                    hoveredMsgId={hoveredMsgId}
                    copiedId={copiedId}
                    onHoverMsg={setHoveredMsgId}
                    onCopy={handleCopy}
                    onEdit={handleEditMessage}
                    messagesEndRef={messagesEndRef}
                  />
                )}
              </div>
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {showScrollBtn && hasMessages && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => scrollToBottom("smooth")}
                  className="cc-hbtn"
                  style={{ position: "absolute", bottom: 100, right: 20, zIndex: 40, borderRadius: "50%", width: 36, height: 36, display: "grid", placeItems: "center" }}
                  aria-label="Scroll to bottom"
                  type="button"
                >
                  <ChevronsDown className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* ── Bottom input area ── */}
            <div className="cc-chat__bottom">
              {/* Agent status bar */}
              {isGenerating && (
                <div className="cc-status-bar">
                  <div className="cc-status-bar__dot" />
                  <span className="cc-status-bar__text">Agent is running…</span>
                </div>
              )}

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
                onFileDrop={handleFileDrop}
                fileInputRef={fileInputRef}
                textareaRef={textareaRef}
                placeholder={composerPlaceholder}
                fileErrors={fileErrors}
                onDismissError={dismissFileError}
                onSlashCommand={handleSlashCommand}
              />
            </div>
          </div>

          {/* ── Resize handle ── */}
          {isPanelOpen && isCanvasVisible && (
            <div
              className={`cc-resize-handle${isResizing ? " is-dragging" : ""}`}
              onMouseDown={onResizeStart}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panel"
              aria-valuenow={Math.round(panelWidthPct)}
              aria-valuemin={30}
              aria-valuemax={70}
            />
          )}

          {/* ── Side panel ── */}
          {isPanelOpen && isCanvasVisible && (
            <aside className="cc-panel">
              <InteractiveCanvas
                nodes={nodes}
                onTest={handleTest}
                onDeploy={handleDeploy}
                isDeploying={isDeploying}
                hasDeployed={hasDeployed}
                isTesting={isTesting}
                hasTested={hasTested}
                isOpen={true}
                onClose={() => setIsPanelOpen(false)}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
