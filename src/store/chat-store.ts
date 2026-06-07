import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIMessage } from 'ai';
import type { FlowNode } from '../components/chat/InteractiveCanvas';

/**
 * Zustand chat store — unified workspace state model.
 *
 * One persisted record per chatId. Holds:
 *   - identity        : chatTitle, isStarred, updatedAt
 *   - conversation    : step (lifecycle phase), workspaceState (canvas vs chat)
 *   - workflow        : nodes (generated graph)
 *   - workspace shell : panelOpen, panelWidthPct (Phase 6 resize)
 *   - run lifecycle   : isTesting, hasTested, isDeploying, hasDeployed
 *   - generation mode : ultraThinking
 *   - auto-submit gate: autoSubmittedAt (persists across StrictMode remounts
 *                       and route revisits, prevents duplicate LLM calls)
 *
 * NOT in this store (intentional):
 *   - conversation messages → owned by AI SDK `useChat` (Phase 2 canonical)
 *   - transient UI (hover, dropdown open, input text) → local React state
 *   - ephemeral notices → local React state in ChatContainer
 */

/**
 * @deprecated Conversation messages are owned by useChat. Kept only so
 * older imports compile; do not reference in new code.
 */
export type Message = {
  id: string;
  role: "user" | "ai" | "system" | "thinking";
  content: string;
  state?: WorkspaceState;
  timestamp?: number;
};

export type ChatSequenceStep = "boot" | "wait_message" | "ready" | "deployed";
export type WorkspaceState =
  | "understanding"
  | "collecting_inputs"
  | "ready_to_build"
  | "canvas_visible";

export interface ChatSession {
  /* ── identity ─────────────────────────────────────────────────── */
  chatTitle: string;
  isStarred: boolean;
  /** Last mutation timestamp. Drives EmptyState recents ordering. */
  updatedAt: number;

  /* ── conversation lifecycle ──────────────────────────────────── */
  step: ChatSequenceStep;
  workspaceState: WorkspaceState;

  /* ── workflow output ─────────────────────────────────────────── */
  nodes: FlowNode[];

  /* ── workspace shell ─────────────────────────────────────────── */
  panelOpen: boolean;
  /** Side-panel width as percentage of viewport. Clamped 30–70. */
  panelWidthPct: number;

  /* ── run lifecycle ───────────────────────────────────────────── */
  isTesting: boolean;
  hasTested: boolean;
  isDeploying: boolean;
  hasDeployed: boolean;

  /* ── generation mode ─────────────────────────────────────────── */
  ultraThinking: boolean;

  /* ── auto-submit dedup ───────────────────────────────────────── */
  /**
   * Timestamp when the initial-prompt auto-submit fired for this chat.
   * Set once on first submit, guards against duplicate calls under React
   * StrictMode remount, Fast Refresh, and route revisits. Cleared only
   * when the chat is explicitly reset (/clear).
   */
  autoSubmittedAt: number | null;

  /* ── conversation persistence ────────────────────────────── */
  /**
   * Snapshot of `useChat` messages mirrored from the AI SDK after each
   * change. Used to seed `useChat({messages})` on mount so a browser
   * refresh on /dashboard/chat/[chatId] restores the EXACT conversation
   * (text, parts, tool-buildWorkflow outputs) — same workspace, same
   * messages, no flicker through EmptyState.
   *
   * Capped at MESSAGES_PERSIST_LIMIT to keep localStorage bounded.
   */
  persistedMessages: UIMessage[];

  /* ── UX enhancements ─────────────────────────────────── */
  /**
   * Rolling history of user-sent prompt texts for ↑ key navigation.
   * Most recent first. Capped at 20.
   */
  promptHistory: string[];

  /**
   * Model selected for this session (e.g. "gpt-4o", "gpt-4o-mini").
   * Sent to backend as `selectedModel` in the request body.
   * Defaults to the env-configured model if not set.
   */
  selectedModel: string | null;

  /**
   * Per-message feedback: thumbs-up (+1) or thumbs-down (-1).
   * Stored locally; optionally synced to /api/feedback.
   */
  feedbackLog: Array<{ messageId: string; rating: 1 | -1; timestamp: number }>;
}

/** Cap on persisted messages per chat (keeps localStorage reasonable). */
export const MESSAGES_PERSIST_LIMIT = 100;

interface ChatStore {
  sessions: Record<string, ChatSession>;
  getSession: (id: string) => ChatSession;
  updateSession: (id: string, update: Partial<ChatSession>) => void;
  updateNode: (id: string, nodeId: string, update: Partial<FlowNode>) => void;
  setNodes: (id: string, nodes: FlowNode[]) => void;
  resetSession: (id: string) => void;
  pushPromptHistory: (id: string, prompt: string) => void;
  setFeedback: (id: string, messageId: string, rating: 1 | -1) => void;
  setSelectedModel: (id: string, model: string | null) => void;
}

const defaultSession: ChatSession = {
  chatTitle: "New Automation",
  isStarred: false,
  updatedAt: 0,
  step: "boot",
  workspaceState: "understanding",
  nodes: [
    { id: "n1", type: "trigger", label: "Form Submission", status: "completed", detail: "Awaiting incoming form data" },
    { id: "n2", type: "process", label: "AI Analysis", status: "pending" },
    { id: "n3", type: "action", label: "Send Notification", status: "pending" },
  ],
  panelOpen: false,
  panelWidthPct: 50,
  isTesting: false,
  hasTested: false,
  isDeploying: false,
  hasDeployed: false,
  ultraThinking: false,
  autoSubmittedAt: null,
  persistedMessages: [],
  promptHistory: [],
  selectedModel: null,
  feedbackLog: [],
};

/**
 * Touch updatedAt on every mutation. Centralizes the rule so call sites
 * don't have to remember.
 */
function withTouched(session: ChatSession): ChatSession {
  return { ...session, updatedAt: Date.now() };
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      getSession: (id) => {
        const session = get().sessions[id];
        return session || { ...defaultSession };
      },
      updateSession: (id, update) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [id]: withTouched({
              ...(state.sessions[id] || defaultSession),
              ...update,
            }),
          },
        }));
      },
      updateNode: (id, nodeId, update) => {
        set((state) => {
          const session = state.sessions[id];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [id]: withTouched({
                ...session,
                nodes: session.nodes.map((n) =>
                  n.id === nodeId ? { ...n, ...update } : n,
                ),
              }),
            },
          };
        });
      },
      setNodes: (id, nodes) => {
        set((state) => {
          const session = state.sessions[id] || defaultSession;
          return {
            sessions: {
              ...state.sessions,
              [id]: withTouched({ ...session, nodes }),
            },
          };
        });
      },
      resetSession: (id) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [id]: withTouched({ ...defaultSession }),
          },
        }));
      },
      pushPromptHistory: (id, prompt) => {
        set((state) => {
          const session = state.sessions[id] || defaultSession;
          const existing = session.promptHistory || [];
          // Dedupe and prepend, cap at 20
          const next = [prompt, ...existing.filter((p) => p !== prompt)].slice(0, 20);
          return {
            sessions: {
              ...state.sessions,
              [id]: withTouched({ ...session, promptHistory: next }),
            },
          };
        });
      },
      setFeedback: (id, messageId, rating) => {
        set((state) => {
          const session = state.sessions[id] || defaultSession;
          const existing = (session.feedbackLog || []).filter((f) => f.messageId !== messageId);
          return {
            sessions: {
              ...state.sessions,
              [id]: withTouched({
                ...session,
                feedbackLog: [...existing, { messageId, rating, timestamp: Date.now() }],
              }),
            },
          };
        });
      },
      setSelectedModel: (id, model) => {
        set((state) => {
          const session = state.sessions[id] || defaultSession;
          return {
            sessions: {
              ...state.sessions,
              [id]: withTouched({ ...session, selectedModel: model }),
            },
          };
        });
      },
    }),
    {
      name: "chat-storage",
      version: 2,
      migrate: (persisted, version) => {
        // v1 → v2: workspace fields added with defaults; drop old `messages`.
        if (!persisted || typeof persisted !== "object") return persisted;
        const state = persisted as { sessions?: Record<string, Partial<ChatSession> & { messages?: unknown }> };
        if (version < 2 && state.sessions) {
          const migrated: Record<string, ChatSession> = {};
          for (const [id, raw] of Object.entries(state.sessions)) {
            const { messages: _drop, ...rest } = raw;
            void _drop;
            migrated[id] = { ...defaultSession, ...rest };
          }
          return { ...state, sessions: migrated };
        }
        return persisted;
      },
    },
  ),
);
