"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FlowNode } from "@/components/chat/InteractiveCanvas";
import type { ProcessedAttachments } from "@/lib/file-utils";
import {
  MAX_DOCUMENT_CHARS_PER_FILE,
  MAX_DOCUMENT_CONTEXT_CHARS,
  MAX_MODEL_TEXT_CONTEXT_CHARS,
  MAX_USER_PROMPT_CHARS,
  truncateText,
} from "@/lib/ai/context-limits";

interface UseAutomationChatOptions {
  chatId: string;
  ultraThinking?: boolean;
  /**
   * Hydration seed passed once to `useChat({messages})` at mount.
   * Accepts the simple text shape (legacy) or full UIMessage[] (preferred —
   * preserves tool-call parts so restored conversations keep workflow
   * artifacts intact).
   */
  initialMessages?:
    | UIMessage[]
    | Array<{ id: string; role: "user" | "assistant"; content: string }>;
  onNodesUpdate?: (nodes: FlowNode[]) => void;
  onWorkflowBuilt?: (name: string, summary: string) => void;
  onErrorMessage?: (message: string) => void;
}

const CHAT_DEBUG =
  process.env.NEXT_PUBLIC_CHAT_DEBUG === "true" || process.env.NODE_ENV !== "production";
const EMPTY_INITIAL_MESSAGES: NonNullable<UseAutomationChatOptions["initialMessages"]> = [];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "The AI request failed.";
  }
}

function toUiMessage(message: { id: string; role: "user" | "assistant"; content: string }): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

type WorkflowOutput = {
  nodes?: unknown;
  workflowName?: unknown;
  summary?: unknown;
};

type LegacyToolCall = {
  toolName?: string;
  result?: unknown;
};

type WorkflowToolPart = {
  type: string;
  toolName?: string;
  state?: string;
  output?: unknown;
};

function isWorkflowOutput(value: unknown): value is WorkflowOutput {
  return typeof value === "object" && value !== null;
}

function readWorkflowOutput(message: UIMessage): WorkflowOutput | null {
  const legacyToolCalls = (message as UIMessage & { toolInvocations?: unknown }).toolInvocations;
  if (Array.isArray(legacyToolCalls)) {
    const legacyResult = (legacyToolCalls as LegacyToolCall[]).find(
      (call) => call.toolName === "buildWorkflow" && isWorkflowOutput(call.result),
    )?.result;
    if (isWorkflowOutput(legacyResult)) return legacyResult;
  }

  for (const part of message.parts || []) {
    const toolPart = part as WorkflowToolPart;
    const isBuildWorkflow =
      toolPart.type === "tool-buildWorkflow" ||
      (toolPart.type === "dynamic-tool" && toolPart.toolName === "buildWorkflow");

    if (isBuildWorkflow && toolPart.state === "output-available" && isWorkflowOutput(toolPart.output)) {
      return toolPart.output;
    }
  }

  return null;
}

function mapWorkflowNodes(nodes: unknown): FlowNode[] {
  if (!Array.isArray(nodes)) return [];

  return nodes
    .filter((node) => node && typeof node === "object")
    .map((node, index) => {
      const n = node as {
        id?: string;
        type?: "trigger" | "process" | "action";
        label?: string;
        detail?: string;
      };

      return {
        id: n.id || `n${index + 1}`,
        type: n.type || (index === 0 ? "trigger" : "action"),
        label: n.label || `Step ${index + 1}`,
        detail: n.detail,
        status: index === 0 ? "completed" : index === 1 ? "active" : "pending",
      };
    });
}

/**
 * Build the text prompt that includes document context when attachments
 * contain documents.
 */
function buildPromptWithDocuments(
  text: string,
  attachments?: ProcessedAttachments
): string {
  const promptText = truncateText(text, MAX_USER_PROMPT_CHARS);
  if (!attachments || attachments.documents.length === 0) return promptText;

  let remainingDocumentChars = MAX_DOCUMENT_CONTEXT_CHARS;
  let omittedDocuments = 0;
  const docSections: string[] = [];

  for (const doc of attachments.documents) {
    if (remainingDocumentChars <= 0) {
      omittedDocuments += 1;
      continue;
    }

    const maxForThisDocument = Math.min(MAX_DOCUMENT_CHARS_PER_FILE, remainingDocumentChars);
    const content = truncateText(doc.textContent, maxForThisDocument);
    remainingDocumentChars -= content.length;
    docSections.push(`--- Attached Document: ${doc.name} (${doc.mimeType}) ---\n${content}\n--- End of ${doc.name} ---`);
  }

  const omittedNote =
    omittedDocuments > 0
      ? `\n\n[${omittedDocuments} additional document(s) omitted to fit the AI context window.]`
      : "";

  return truncateText(
    `${promptText}\n\n[User attached ${attachments.documents.length} document(s). Analyze the content below and use it as context for building the automation.]\n\n${docSections.join("\n\n")}${omittedNote}`,
    MAX_MODEL_TEXT_CONTEXT_CHARS,
  );
}

export function useAutomationChat({
  chatId,
  ultraThinking = false,
  initialMessages = EMPTY_INITIAL_MESSAGES,
  onNodesUpdate,
  onWorkflowBuilt,
  onErrorMessage,
}: UseAutomationChatOptions) {
  const callbacksRef = useRef({
    onNodesUpdate,
    onWorkflowBuilt,
    onErrorMessage,
  });

  useEffect(() => {
    callbacksRef.current = {
      onNodesUpdate,
      onWorkflowBuilt,
      onErrorMessage,
    };
  }, [onNodesUpdate, onWorkflowBuilt, onErrorMessage]);

  const transport = useMemo(() => {
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (CHAT_DEBUG) {
        try {
          const rawBody = typeof init?.body === "string" ? init.body : null;
          console.info("[useAutomationChat] outgoing payload", rawBody ? JSON.parse(rawBody) : init?.body);
        } catch (error) {
          console.info("[useAutomationChat] outgoing payload", init?.body, error);
        }
      }

      const response = await fetch(input, init);
      if (!response.ok) {
        const text = await response.text();
        let message = text || response.statusText || "Failed to fetch the chat response.";

        try {
          const json = JSON.parse(text);
          if (json?.error) {
            message = String(json.error);
          }
        } catch {
          // ignore parse errors and keep raw text
        }

        console.error("[useAutomationChat] API request failed", {
          status: response.status,
          statusText: response.statusText,
          message,
          body: text,
        });
        throw new Error(message);
      }

      if (CHAT_DEBUG) {
        void response
          .clone()
          .text()
          .then((raw) => {
            console.info("[useAutomationChat] raw API response", raw.slice(0, 12000));
          })
          .catch((error) => {
            console.error("[useAutomationChat] Failed to read raw API response:", error);
          });
      }

      return response;
    };

    return new DefaultChatTransport({
      api: "/api/chat",
      credentials: "same-origin",
      body: { ultraThinking },
      fetch: fetcher,
    });
  }, [ultraThinking]);

  /**
   * Accept either legacy {id,role,content} entries or full UIMessage[].
   * Full UIMessage entries pass through unchanged (preserve parts, tool
   * calls, file attachments); legacy entries are upgraded via toUiMessage.
   * `useChat` only consumes this once at mount via its internal id-keyed
   * initialization, so the memo identity doesn't need to be stable past
   * the first render.
   */
  const initialUiMessages = useMemo(
    () =>
      (initialMessages as Array<unknown>).map((entry) => {
        if (
          entry &&
          typeof entry === "object" &&
          "parts" in entry &&
          Array.isArray((entry as { parts?: unknown }).parts)
        ) {
          return entry as UIMessage;
        }
        return toUiMessage(entry as { id: string; role: "user" | "assistant"; content: string });
      }),
    [initialMessages],
  );

  const handleFinish = useCallback((event: { message: UIMessage }) => {
    if (CHAT_DEBUG) {
      const assistantText = event.message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      console.info("[useAutomationChat] parsed assistant message", {
        assistantText,
        partTypes: event.message.parts.map((part) => part.type),
      });
    }

    const workflow = readWorkflowOutput(event.message);
    if (!workflow) return;

    const flowNodes = mapWorkflowNodes(workflow.nodes);
    if (flowNodes.length > 0) {
      callbacksRef.current.onNodesUpdate?.(flowNodes);
    }

    callbacksRef.current.onWorkflowBuilt?.(
      typeof workflow.workflowName === "string" ? workflow.workflowName : "Automation Workflow",
      typeof workflow.summary === "string" ? workflow.summary : "",
    );
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error("[useAutomationChat] Stream error:", error);
    callbacksRef.current.onErrorMessage?.(
      error.message || "The AI request failed. Please try again with a shorter prompt.",
    );
  }, []);

  const chat = useChat({
    id: chatId,
    messages: initialUiMessages,
    transport,
    onFinish: handleFinish,
    onError: handleError,
  });

  /**
   * Submit a prompt with optional file attachments.
   *
   * - Images are sent as file parts (base64 data URLs → the AI SDK converts
   *   these into multi-modal image content for GPT-4o vision).
   * - Documents have their extracted text appended to the prompt so the model
   *   receives full context.
   */
  const submitPrompt = useCallback(
    async (prompt: string, attachments?: ProcessedAttachments) => {
      if (!prompt.trim() && (!attachments || (attachments.images.length === 0 && attachments.documents.length === 0))) return;

      try {
        chat.clearError?.();

        const textWithDocs = buildPromptWithDocuments(prompt.trim(), attachments);

        // Build FileUIPart array for images (GPT-4o vision via multi-modal)
        const fileParts: Array<{
          type: "file";
          mediaType: string;
          filename?: string;
          url: string;
        }> = (attachments?.images ?? []).map((img) => ({
          type: "file" as const,
          mediaType: img.mimeType,
          filename: img.name,
          url: img.base64DataUrl,
        }));

        if (CHAT_DEBUG) {
          console.info("[useAutomationChat] submitting prompt", {
            textLength: textWithDocs.length,
            imageCount: fileParts.length,
            documentCount: attachments?.documents.length ?? 0,
            currentMessageCount: chat.messages.length,
          });
        }

        if (fileParts.length > 0) {
          await chat.sendMessage({
            text: textWithDocs,
            files: fileParts,
          });
        } else {
          await chat.sendMessage({ text: textWithDocs });
        }
      } catch (error) {
        console.error("[useAutomationChat] Failed to submit prompt:", error);
        callbacksRef.current.onErrorMessage?.(getErrorMessage(error));
      }
    },
    [chat],
  );

  const isGenerating = chat.status === "streaming" || chat.status === "submitted";
  const safeMessages = Array.isArray(chat.messages) ? chat.messages : [];

  return {
    ...chat,
    messages: safeMessages,
    submitPrompt,
    isGenerating,
  };
}
