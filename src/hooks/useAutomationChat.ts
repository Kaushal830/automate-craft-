"use client";

import { useChat } from "@ai-sdk/react";
import { useCallback } from "react";
import type { FlowNode } from "@/components/chat/InteractiveCanvas";

interface UseAutomationChatOptions {
  chatId: string;
  ultraThinking?: boolean;
  initialMessages?: Array<{ id: string; role: "user" | "assistant"; content: string }>;
  onNodesUpdate?: (nodes: FlowNode[]) => void;
  onWorkflowBuilt?: (name: string, summary: string) => void;
}

export function useAutomationChat({
  chatId,
  ultraThinking = false,
  initialMessages = [],
  onNodesUpdate,
  onWorkflowBuilt,
}: UseAutomationChatOptions) {
  const chat = useChat({
    id: chatId,
    // @ts-ignore
    initialMessages: initialMessages as any, // Cast to any to bypass TS error in older/newer version mix
    body: { ultraThinking },

    onFinish: (event) => {
      // Parse tool calls from the finished message to update the canvas
      // @ts-ignore
      if (!event.message?.toolInvocations) return;
      // @ts-ignore
      for (const inv of event.message.toolInvocations) {
        if (inv.toolName === "buildWorkflow" && "result" in inv) {
          const { nodes, workflowName, summary } = inv.result as {
            nodes: Array<{
              id: string;
              type: "trigger" | "process" | "action";
              label: string;
              detail?: string;
            }>;
            workflowName: string;
            summary: string;
          };

          const flowNodes: FlowNode[] = nodes.map((n, i) => ({
            id: n.id,
            type: n.type,
            label: n.label,
            detail: n.detail,
            status: i === 0 ? "completed" : i === 1 ? "active" : "pending",
          }));

          onNodesUpdate?.(flowNodes);
          onWorkflowBuilt?.(workflowName, summary);
        }
      }
    },

    onError: (error) => {
      console.error("[useAutomationChat] Stream error:", error);
    },
  });

  // Convenience: submit a plain text prompt
  const submitPrompt = useCallback(
    (prompt: string) => {
      if (!prompt.trim()) return;
      // @ts-ignore
      if (chat.append) {
        // @ts-ignore
        chat.append({ role: "user", content: prompt });
      } else if ((chat as any).setInput) {
        (chat as any).setInput(prompt);
        (chat as any).handleSubmit();
      }
    },
    [chat],
  );

  const isGenerating = chat.status === "streaming" || chat.status === "submitted";

  return {
    ...chat,
    submitPrompt,
    isGenerating,
  };
}
