import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FlowNode } from '../components/chat/InteractiveCanvas';

/**
 * Legacy in-chat artifact types (FormCard, ReadyCard, EngineCards) were removed
 * during the workspace-native refactor. The Message type now carries only the
 * fields needed for Zustand-persisted history. Streaming/optimistic message
 * lifecycle is owned by AI SDK `useChat` (canonical message source).
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
  messages: Message[];
  step: ChatSequenceStep;
  workspaceState: WorkspaceState;
  nodes: FlowNode[];
}

interface ChatStore {
  sessions: Record<string, ChatSession>;
  getSession: (id: string) => ChatSession;
  updateSession: (id: string, update: Partial<ChatSession>) => void;
  addMessage: (id: string, message: Message) => void;
  updateMessage: (id: string, messageId: string, update: Partial<Message>) => void;
  updateNode: (id: string, nodeId: string, update: Partial<FlowNode>) => void;
  setNodes: (id: string, nodes: FlowNode[]) => void;
}

const defaultSession: ChatSession = {
  chatTitle: "New Automation",
  isStarred: false,
  messages: [],
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
        return session || { ...defaultSession, messages: [] };
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
      addMessage: (id, message) => {
        set((state) => {
          const session = state.sessions[id] || defaultSession;
          return {
            sessions: {
              ...state.sessions,
              [id]: {
                ...session,
                messages: [...session.messages, message],
              },
            },
          };
        });
      },
      updateMessage: (id, messageId, update) => {
        set((state) => {
          const session = state.sessions[id];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [id]: {
                ...session,
                messages: session.messages.map((m) =>
                  m.id === messageId ? { ...m, ...update } : m
                ),
              },
            },
          };
        });
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
