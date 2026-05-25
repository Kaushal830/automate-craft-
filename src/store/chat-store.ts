import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FlowNode } from '../components/chat/InteractiveCanvas';

/**
 * Zustand chat store.
 *
 * Stores ONLY session metadata: title, starred flag, workflow nodes, and
 * workspace lifecycle state. Does NOT store messages — the canonical message
 * source is AI SDK `useChat` (Phase 2 normalization). System notices are
 * ephemeral local state in ChatContainer.
 *
 * Old persisted entries with a `messages: Message[]` field are tolerated
 * (extra fields ignored by Zustand persist middleware).
 */

/**
 * @deprecated Kept only for backward type imports from older revisions.
 * No new code should reference this type. Conversation messages are owned
 * by useChat (AI SDK).
 */
export type Message = {
  id: string;
  role: "user" | "ai" | "system" | "thinking";
  content: string;
  state?: WorkspaceState;
  timestamp?: number;
};

export type ChatSequenceStep = "boot" | "wait_message" | "ready" | "deployed";
export type WorkspaceState = "understanding" | "collecting_inputs" | "ready_to_build" | "canvas_visible";

export interface ChatSession {
  chatTitle: string;
  isStarred: boolean;
  step: ChatSequenceStep;
  workspaceState: WorkspaceState;
  nodes: FlowNode[];
}

interface ChatStore {
  sessions: Record<string, ChatSession>;
  getSession: (id: string) => ChatSession;
  updateSession: (id: string, update: Partial<ChatSession>) => void;
  updateNode: (id: string, nodeId: string, update: Partial<FlowNode>) => void;
  setNodes: (id: string, nodes: FlowNode[]) => void;
}

const defaultSession: ChatSession = {
  chatTitle: "New Automation",
  isStarred: false,
  step: "boot",
  workspaceState: "understanding",
  nodes: [
    { id: "n1", type: "trigger", label: "Form Submission", status: "completed", detail: "Awaiting incoming form data" },
    { id: "n2", type: "process", label: "AI Analysis", status: "pending" },
    { id: "n3", type: "action", label: "Send Notification", status: "pending" }
  ],
};

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
            [id]: {
              ...(state.sessions[id] || defaultSession),
              ...update,
            },
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
              [id]: {
                ...session,
                nodes: session.nodes.map((n) =>
                  n.id === nodeId ? { ...n, ...update } : n
                ),
              },
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
              [id]: {
                ...session,
                nodes,
              },
            },
          };
        });
      },
    }),
    {
      name: "chat-storage",
    }
  )
);
