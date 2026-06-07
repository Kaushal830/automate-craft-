"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, Zap } from "lucide-react";

/* ── Code Block with Copy ── */
function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") ?? "text";
  const code = String(children).replace(/\n$/, "");
  const lines = code.split("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--cc-border)", background: "#0c0c0c" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid var(--cc-border-subtle)", background: "rgba(255,255,255,0.015)" }}>
        <span style={{ fontFamily: "var(--cc-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cc-text-3)" }}>
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-all"
          style={{ fontSize: 10, fontWeight: 500, color: "var(--cc-text-3)" }}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" style={{ color: "#4ade80" }} />
              <span style={{ color: "#4ade80" }}>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td
                  style={{
                    padding: "0 12px 0 16px",
                    textAlign: "right",
                    userSelect: "none",
                    fontFamily: "var(--cc-mono)",
                    fontSize: 11,
                    lineHeight: 1.65,
                    color: "var(--cc-text-3)",
                    opacity: 0.5,
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                    borderRight: "1px solid var(--cc-border-subtle)",
                  }}
                >
                  {i + 1}
                </td>
                <td
                  style={{
                    padding: "0 16px 0 14px",
                    fontFamily: "var(--cc-mono)",
                    fontSize: 12.5,
                    lineHeight: 1.65,
                    whiteSpace: "pre",
                  }}
                >
                  <code className={className} dangerouslySetInnerHTML={{ __html: line || "\u200b" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AiMessageProps {
  content: string;
  isStreaming?: boolean;
  timestamp?: number;
  thinkingLabel?: string;
}

const markdownComponents: Components = {
  code({ className, children }) {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="rounded-md px-1.5 py-0.5"
          style={{ fontFamily: "var(--cc-mono)", fontSize: 13, background: "rgba(255,255,255,0.06)", border: "1px solid var(--cc-border)", color: "var(--cc-accent)" }}
        >
          {children}
        </code>
      );
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  p({ children }) {
    return <p style={{ marginBottom: 8, lineHeight: 1.55, color: "var(--cc-text-0)" }}>{children}</p>;
  },
  h1({ children }) {
    return <h1 style={{ marginBottom: 8, marginTop: 16, fontSize: 17, fontWeight: 700, color: "#fff" }}>{children}</h1>;
  },
  h2({ children }) {
    return <h2 style={{ marginBottom: 6, marginTop: 16, fontSize: 15, fontWeight: 600, color: "var(--cc-text-0)" }}>{children}</h2>;
  },
  h3({ children }) {
    return <h3 style={{ marginBottom: 6, marginTop: 12, fontSize: 14, fontWeight: 600, color: "var(--cc-text-0)" }}>{children}</h3>;
  },
  ul({ children }) {
    return <ul style={{ marginBottom: 8, paddingLeft: 4 }}>{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-inside list-decimal" style={{ marginBottom: 8, paddingLeft: 4 }}>{children}</ol>;
  },
  li({ children }) {
    return (
      <li style={{ fontSize: 14, color: "var(--cc-text-1)", marginBottom: 4, paddingLeft: 4, listStylePosition: "outside", marginLeft: 16 }}>
        {children}
      </li>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote
        className="my-4 rounded-r-md"
        style={{ borderLeft: "3px solid var(--cc-accent-border)", background: "var(--cc-accent-dim)", padding: "4px 0 4px 16px", fontSize: 14, color: "var(--cc-text-2)", fontStyle: "italic" }}
      >
        {children}
      </blockquote>
    );
  },
  strong({ children }) {
    return <strong style={{ fontWeight: 600, color: "#fff" }}>{children}</strong>;
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--cc-border)" }}>
        <table className="w-full" style={{ fontSize: 12.5 }}>{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead style={{ borderBottom: "1px solid var(--cc-border)", background: "var(--cc-bg-raised)" }}>{children}</thead>;
  },
  th({ children }) {
    return (
      <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cc-text-2)" }}>
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td style={{ padding: "10px 16px", borderTop: "1px solid var(--cc-border-subtle)", color: "var(--cc-text-1)" }}>{children}</td>;
  },
  hr() {
    return <hr style={{ border: "none", borderTop: "1px solid var(--cc-border)", margin: "16px 0" }} />;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--cc-accent)", textDecoration: "underline", textUnderlineOffset: 2 }}
      >
        {children}
      </a>
    );
  },
};

function StreamingPlaceholder({ label }: { label: string }) {
  return (
    <div className="cc-thinking-shell" aria-live="polite">
      <div className="cc-activity-row">
        <div className="cc-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="cc-thinking-text">{label}</span>
      </div>
      <div className="cc-thinking-lines" aria-hidden="true">
        <span className="cc-skeleton-line cc-skeleton-line--wide" />
        <span className="cc-skeleton-line cc-skeleton-line--mid" />
        <span className="cc-skeleton-line cc-skeleton-line--short" />
      </div>
    </div>
  );
}

export function AiMessage({
  content,
  isStreaming = false,
  timestamp,
  thinkingLabel = "Streaming response...",
}: AiMessageProps) {
  if (!content && !isStreaming) return null;

  return (
    <div className={`cc-msg cc-msg--ai${isStreaming && !content ? " cc-msg--streaming-empty" : ""}`}>
      {/* Bolt avatar */}
      <div className={`cc-ai-mark${isStreaming ? " is-breath" : ""}`}>
        <Zap className="h-3.5 w-3.5" />
      </div>

      {/* Message body — flat flow, no bubble borders */}
      <div className="cc-msg__body">
        {content ? (
          <div className="cc-msg__text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>

            {isStreaming && <span className="cc-caret" />}
          </div>
        ) : (
          <StreamingPlaceholder label={thinkingLabel} />
        )}

        {/* Timestamp — only when not streaming */}
        {timestamp && !isStreaming && (
          <span style={{ display: "block", paddingLeft: 1, marginTop: 6, fontFamily: "var(--cc-mono)", fontSize: 10, color: "var(--cc-text-3)" }}>
            {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
