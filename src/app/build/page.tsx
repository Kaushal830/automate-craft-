"use client";

import { useState, useEffect, useReducer, useRef, useCallback } from "react";
import { Moon, Sun, Edit3, Zap } from "lucide-react";
import { AutomationSidebar } from "@/components/build/AutomationSidebar";
import { ChatThread } from "@/components/build/ChatThread";
import { InputComposer } from "@/components/build/InputComposer";
import { AutomationPreview } from "@/components/build/AutomationPreview";
import { AutomationSession, AutomationMessage } from "@/types/automation";

/* ────────────────────────────────────────────
   State Management
   ──────────────────────────────────────────── */
type State = {
  sessions: AutomationSession[];
  activeSessionId: string | null;
};

type Action =
  | { type: "LOAD_SESSIONS"; payload: AutomationSession[] }
  | { type: "CREATE_SESSION"; payload: AutomationSession }
  | { type: "SET_ACTIVE"; payload: string }
  | { type: "UPDATE_TITLE"; payload: { id: string; title: string } }
  | { type: "ADD_MESSAGE"; payload: { sessionId: string; message: AutomationMessage } }
  | { type: "UPDATE_MESSAGE"; payload: { sessionId: string; message: AutomationMessage } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_SESSIONS":
      return { ...state, sessions: action.payload, activeSessionId: action.payload[0]?.id || null };
    case "CREATE_SESSION":
      return { ...state, sessions: [action.payload, ...state.sessions], activeSessionId: action.payload.id };
    case "SET_ACTIVE":
      return { ...state, activeSessionId: action.payload };
    case "UPDATE_TITLE":
      return {
        ...state,
        sessions: state.sessions.map((s) => (s.id === action.payload.id ? { ...s, title: action.payload.title } : s)),
      };
    case "ADD_MESSAGE":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.sessionId ? { ...s, messages: [...s.messages, action.payload.message] } : s
        ),
      };
    case "UPDATE_MESSAGE":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.sessionId
            ? { ...s, messages: s.messages.map((m) => (m.id === action.payload.message.id ? action.payload.message : m)) }
            : s
        ),
      };
    default:
      return state;
  }
}

/* ────────────────────────────────────────────
   Status Indicator
   ──────────────────────────────────────────── */
function StatusBadge({ isGenerating }: { isGenerating: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
      isGenerating
        ? "border-[var(--build-accent)]/20 bg-[var(--build-accent-soft)]"
        : "border-[var(--build-border)] bg-white/[0.02]"
    }`}>
      <div className={`h-1.5 w-1.5 rounded-full transition-colors ${
        isGenerating ? "bg-[var(--build-accent)] animate-pulse" : "bg-emerald-500"
      }`} />
      <span className={`text-[11px] font-medium transition-colors ${
        isGenerating ? "text-[var(--build-accent)]" : "text-[var(--build-text-tertiary)]"
      }`}>
        {isGenerating ? "Building…" : "Ready"}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────
   Mock AI Responses — varied based on keywords
   ──────────────────────────────────────────── */
function getMockResponse(prompt: string): { content: string; blueprint: AutomationMessage["blueprint"] } {
  const lower = prompt.toLowerCase();

  if (lower.includes("whatsapp") || lower.includes("lead") || lower.includes("crm")) {
    return {
      content: "",
      blueprint: {
        trigger: "New lead added (CRM)",
        actions: ["Extract contact details", "Send WhatsApp message"],
        output: "Personalized WhatsApp message sent to lead",
        integrations: [
          { id: "hubspot", name: "HubSpot", icon: "🔶", connected: false },
          { id: "whatsapp", name: "WhatsApp Business", icon: "💬", connected: false },
        ],
        estimatedCost: 3,
      },
    };
  }

  if (lower.includes("slack") || lower.includes("deal") || lower.includes("notification")) {
    return {
      content: "",
      blueprint: {
        trigger: "Deal closed-won (HubSpot)",
        actions: ["Format deal summary", "Post to Slack channel"],
        output: "Rich Slack message posted to sales channel",
        integrations: [
          { id: "hubspot", name: "HubSpot", icon: "🔶", connected: false },
          { id: "slack", name: "Slack", icon: "💬", connected: false },
        ],
        estimatedCost: 2,
      },
    };
  }

  if (lower.includes("notion") || lower.includes("booking") || lower.includes("calendly")) {
    return {
      content: "",
      blueprint: {
        trigger: "New booking (Calendly)",
        actions: ["Parse booking details", "Create Notion page"],
        output: "Structured Notion page created in meeting database",
        integrations: [
          { id: "calendly", name: "Calendly", icon: "📅", connected: false },
          { id: "notion", name: "Notion", icon: "📓", connected: false },
        ],
        estimatedCost: 2,
      },
    };
  }

  // Default: Typeform → Sheets
  return {
    content: "",
    blueprint: {
      trigger: "New form submission (Typeform)",
      actions: ["Format response data", "Create spreadsheet row (Google Sheets)"],
      output: "New row added to Google Sheet",
      integrations: [
        { id: "typeform", name: "Typeform", icon: "📝", connected: false },
        { id: "gsheets", name: "Google Sheets", icon: "📊", connected: false },
      ],
      estimatedCost: 2,
    },
  };
}

/* ────────────────────────────────────────────
   Main Page
   ──────────────────────────────────────────── */
export default function BuildPage() {
  const [state, dispatch] = useReducer(reducer, { sessions: [], activeSessionId: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true); // dark-first
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  /* ── Initialize ── */
  useEffect(() => {
    // Always dark for /build — set the class
    document.documentElement.classList.add("dark");

    // Sidebar
    const storedSidebar = localStorage.getItem("buildSidebarOpen");
    if (storedSidebar !== null) setIsSidebarOpen(storedSidebar === "true");

    // Sessions
    const storedSessions = localStorage.getItem("automationSessions");
    if (storedSessions) {
      try {
        const parsed = JSON.parse(storedSessions);
        if (parsed.length > 0) {
          dispatch({ type: "LOAD_SESSIONS", payload: parsed });
          return;
        }
      } catch (e) { /* ignore */ }
    }
    createNewSession();
  }, []);

  /* ── Persist sessions ── */
  useEffect(() => {
    if (state.sessions.length > 0) {
      localStorage.setItem("automationSessions", JSON.stringify(state.sessions));
    }
  }, [state.sessions]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("buildSidebarOpen", String(next));
      return next;
    });
  }, []);

  const createNewSession = useCallback(() => {
    const newSession: AutomationSession = {
      id: Date.now().toString(),
      title: "Untitled Automation",
      createdAt: Date.now(),
      messages: [],
    };
    dispatch({ type: "CREATE_SESSION", payload: newSession });
  }, []);

  const activeSession = state.sessions.find((s) => s.id === state.activeSessionId);
  const blueprintMsg = activeSession?.messages.find((m) => m.blueprint);
  const activeBlueprint = blueprintMsg?.blueprint;

  /* ── Send message ── */
  const handleSend = useCallback(
    (text: string) => {
      if (!activeSession || isGenerating) return;
      abortRef.current = false;

      // User message
      const userMsg: AutomationMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: { sessionId: activeSession.id, message: userMsg } });

      // Auto-title
      if (activeSession.messages.length === 0) {
        dispatch({
          type: "UPDATE_TITLE",
          payload: { id: activeSession.id, title: text.slice(0, 28) + (text.length > 28 ? "…" : "") },
        });
      }

      setIsGenerating(true);

      // Mock API call — varies based on prompt
      const mockData = getMockResponse(text);

      setTimeout(() => {
        if (abortRef.current) return;

        const aiMsg: AutomationMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: mockData.content,
          timestamp: Date.now() + 1,
          isStreaming: true,
          blueprint: mockData.blueprint,
        };

        dispatch({ type: "ADD_MESSAGE", payload: { sessionId: activeSession.id, message: aiMsg } });

        // End streaming immediately since we show System UI directly
        const delay = mockData.content ? mockData.content.split(" ").length * 28 + 500 : 50;
        setTimeout(() => {
          if (abortRef.current) return;
          setIsGenerating(false);
          dispatch({
            type: "UPDATE_MESSAGE",
            payload: { sessionId: activeSession.id, message: { ...aiMsg, isStreaming: false } },
          });
        }, delay);
      }, 2500);
    },
    [activeSession, isGenerating]
  );

  const handleStop = useCallback(() => {
    abortRef.current = true;
    setIsGenerating(false);
  }, []);

  /* ── Title editing ── */
  const handleTitleSubmit = useCallback(() => {
    if (draftTitle.trim() && activeSession) {
      dispatch({ type: "UPDATE_TITLE", payload: { id: activeSession.id, title: draftTitle.trim() } });
    }
    setIsEditingTitle(false);
  }, [draftTitle, activeSession]);

  const startTitleEdit = useCallback(() => {
    if (!activeSession) return;
    setDraftTitle(activeSession.title);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  }, [activeSession]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--build-bg)] font-sans text-[var(--build-text-primary)]">
      {/* LEFT SIDEBAR */}
      <AutomationSidebar
        sessions={state.sessions}
        activeSessionId={state.activeSessionId}
        onSelectSession={(id) => dispatch({ type: "SET_ACTIVE", payload: id })}
        onNewSession={createNewSession}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
      />

      {/* CENTRE PANEL */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between px-4 lg:px-6 border-b border-[var(--build-border)] bg-[var(--build-bg)]/80 backdrop-blur-xl backdrop-saturate-150 z-10">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8" />

            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                className="h-8 w-48 rounded-lg bg-[var(--build-surface)] px-3 text-[13px] font-semibold text-[var(--build-text-primary)] outline-none border border-[var(--build-accent)]/30 focus:ring-2 focus:ring-[var(--build-accent-glow)]"
              />
            ) : (
              <button
                onClick={startTitleEdit}
                className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 -ml-2 text-[14px] font-semibold text-[var(--build-text-primary)] hover:bg-white/[0.04] transition-colors"
              >
                {activeSession?.title || "Loading…"}
                <Edit3 className="h-3 w-3 text-[var(--build-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <StatusBadge isGenerating={isGenerating} />
          </div>
        </header>

        {/* Chat Area */}
        <ChatThread
          messages={activeSession?.messages || []}
          isGenerating={isGenerating}
          onActivateBlueprint={(id) => console.log("Activating blueprint from message", id)}
          onSuggestionClick={handleSend}
        />

        {/* Composer */}
        <div className="shrink-0 pt-2 bg-gradient-to-t from-[var(--build-bg)] via-[var(--build-bg)] to-transparent">
          <InputComposer
            onSend={handleSend}
            isGenerating={isGenerating}
            onStop={handleStop}
            showChips={activeSession?.messages.length === 0}
          />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <AutomationPreview blueprint={activeBlueprint} isGenerating={isGenerating} />
    </div>
  );
}
