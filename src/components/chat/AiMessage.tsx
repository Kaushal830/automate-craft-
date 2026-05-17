"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

/* ── Code Block with Copy ── */
function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") ?? "text";
  const code = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-white/[0.07] bg-[#0a0b0d]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] bg-white/[0.015]">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/25">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto custom-scrollbar text-[12.5px] leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

/* ── AI Avatar ── */
function AiAvatarSmall({ isActive = false }: { isActive?: boolean }) {
  return (
    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-accent/10 shadow-[0_0_12px_rgba(59,130,246,0.08)]">
      <Image
        src="/logo-new.png"
        alt="AI"
        width={18}
        height={18}
        className="object-contain"
        style={{ width: "auto", height: "auto" }}
      />
      {isActive && (
        <motion.div
          className="absolute -inset-0.5 rounded-lg border border-accent/25"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

/* ── Streaming Cursor ── */
function StreamingCursor() {
  return (
    <span
      className="inline-block ml-0.5 align-middle rounded-[1px]"
      style={{
        width: "2px",
        height: "16px",
        background: "linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%)",
        boxShadow: "0 0 8px rgba(59,130,246,0.4), 0 0 2px rgba(59,130,246,0.8)",
        animation: "cursor-blink 0.8s ease-in-out infinite",
      }}
    />
  );
}

interface AiMessageProps {
  content: string;
  isStreaming?: boolean;
  timestamp?: number;
}

export function AiMessage({ content, isStreaming = false, timestamp }: AiMessageProps) {
  if (!content) return null;

  return (
    <div className="w-full flex gap-3 mb-2 group/ai">
      {/* Avatar — outside the container */}
      <div className="pt-1.5 shrink-0">
        <AiAvatarSmall isActive={isStreaming} />
      </div>

      {/* Message container — Task 3.2: visual container for AI messages */}
      <div className="flex-1 min-w-0">
        <div className="relative rounded-2xl rounded-tl-sm bg-white/[0.025] border border-white/[0.06] border-l-2 border-l-accent/20 px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.15)]">
          <div className="text-[14px] leading-[1.75] text-white/80">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ node, className, children, ...props }: any) {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.06] font-mono text-[12.5px] text-accent/90"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return <CodeBlock className={className}>{children}</CodeBlock>;
                },
                p({ children }: any) {
                  return <p className="mb-3 last:mb-0 text-white/80 leading-[1.75]">{children}</p>;
                },
                h1({ children }: any) {
                  return <h1 className="text-[17px] font-bold text-white/90 mb-3 mt-4 first:mt-0">{children}</h1>;
                },
                h2({ children }: any) {
                  return <h2 className="text-[15px] font-semibold text-white/85 mb-2 mt-4 first:mt-0">{children}</h2>;
                },
                h3({ children }: any) {
                  return <h3 className="text-[14px] font-semibold text-white/80 mb-2 mt-3 first:mt-0">{children}</h3>;
                },
                ul({ children }: any) {
                  return <ul className="space-y-1.5 mb-3 pl-1">{children}</ul>;
                },
                ol({ children }: any) {
                  return <ol className="space-y-1.5 mb-3 pl-1 list-decimal list-inside">{children}</ol>;
                },
                li({ children }: any) {
                  return (
                    <li className="flex items-start gap-2 text-white/70 text-[13.5px]">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent/40 shrink-0" />
                      <span className="flex-1">{children}</span>
                    </li>
                  );
                },
                blockquote({ children }: any) {
                  return (
                    <blockquote className="border-l-2 border-accent/30 pl-4 my-3 text-white/50 italic text-[13.5px]">
                      {children}
                    </blockquote>
                  );
                },
                strong({ children }: any) {
                  return <strong className="font-semibold text-white/90">{children}</strong>;
                },
                table({ children }: any) {
                  return (
                    <div className="overflow-x-auto my-3 rounded-xl border border-white/[0.06]">
                      <table className="w-full text-[12.5px]">{children}</table>
                    </div>
                  );
                },
                thead({ children }: any) {
                  return <thead className="bg-white/[0.03] border-b border-white/[0.06]">{children}</thead>;
                },
                th({ children }: any) {
                  return <th className="px-4 py-2.5 text-left font-semibold text-white/50 uppercase tracking-wider text-[10px]">{children}</th>;
                },
                td({ children }: any) {
                  return <td className="px-4 py-2.5 text-white/60 border-t border-white/[0.04]">{children}</td>;
                },
                hr() {
                  return <hr className="my-4 border-white/[0.06]" />;
                },
                a({ href, children }: any) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent/80 underline underline-offset-2 hover:text-accent transition-colors"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>

            {/* Streaming cursor — Task 3.5: thin glowing bar */}
            {isStreaming && <StreamingCursor />}
          </div>
        </div>

        {/* Timestamp — only when not streaming */}
        {timestamp && !isStreaming && (
          <span className="pl-1 block text-[10px] font-mono text-white/15 mt-1.5">
            {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
