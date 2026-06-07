"use client";

import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";

interface ChatWrapperProps {
  chatId: string;
  initialPrompt?: string;
  ultraThinking?: boolean;
}

export function ChatWrapper({ chatId, initialPrompt, ultraThinking }: ChatWrapperProps) {
  return (
    <ChatErrorBoundary>
      <div className="flex h-full min-w-0 flex-1">
        <ChatContainer chatId={chatId} initialPrompt={initialPrompt} ultraThinking={ultraThinking} />
      </div>
    </ChatErrorBoundary>
  );
}
