"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ChatRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[dashboard/chat] Route render error:", error);

  return (
    <div className="chat-shell-bg flex min-h-screen w-full items-center justify-center px-6 text-white">
      <div className="max-w-sm rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/[0.08] text-red-300 ring-1 ring-red-500/20">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-[16px] font-semibold text-white/90">Chat could not open</h2>
        <p className="mt-2 text-[13px] leading-6 text-white/45">
          {error.message || "The workspace hit a rendering error. Try opening it again."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent/90"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}
