"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Zap, MessageSquarePlus, Settings, Home, Command, CornerDownLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export type CommandItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
};

interface CommandPaletteProps {
  onTest?: () => void;
  onDeploy?: () => void;
  onTogglePreview?: () => void;
  isCanvasVisible?: boolean;
  hasTested?: boolean;
  isDeploying?: boolean;
}

export function CommandPalette({
  onTest,
  onDeploy,
  onTogglePreview,
  isCanvasVisible,
  hasTested,
  isDeploying,
}: CommandPaletteProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isChatContext = pathname.includes("/chat/");

  const baseCommands: CommandItem[] = [
    {
      id: "new-chat",
      label: "New Automation",
      description: "Start a new automation workflow",
      icon: MessageSquarePlus,
      action: () => {
        const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        router.push(`/dashboard/chat/${id}`);
      },
      shortcut: "N",
    },
    {
      id: "home",
      label: "Dashboard Home",
      description: "Go to the main dashboard",
      icon: Home,
      action: () => router.push("/dashboard"),
    },
    {
      id: "settings",
      label: "Settings",
      description: "Open account settings",
      icon: Settings,
      action: () => router.push("/dashboard/settings"),
    },
    {
      id: "focus-input",
      label: "Focus Chat Input",
      description: "Jump to the chat composer",
      icon: Zap,
      action: () => {
        const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
        if (textarea) textarea.focus();
      },
      shortcut: "/",
    },
  ];

  // Contextual Commands (Only available in Chat)
  const chatCommands: CommandItem[] = isChatContext ? [
    {
      id: "toggle-preview",
      label: isCanvasVisible ? "Hide Workflow Preview" : "Show Workflow Preview",
      description: "Toggle the right-side visual graph panel",
      icon: Zap,
      action: () => onTogglePreview?.(),
      shortcut: "P",
    },
    {
      id: "test-workflow",
      label: "Test Automation",
      description: "Run a simulated execution of the pipeline",
      icon: Zap,
      action: () => onTest?.(),
      shortcut: "T",
    },
    ...(hasTested && !isDeploying ? [{
      id: "deploy-workflow",
      label: "Deploy Automation",
      description: "Push this workflow to live production",
      icon: Zap,
      action: () => onDeploy?.(),
      shortcut: "D",
    }] : []),
  ] : [];

  const allCommands = [...chatCommands, ...baseCommands];

  const filtered = query.trim()
    ? allCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const run = useCallback(
    (cmd: CommandItem) => {
      close();
      // Defer so the modal closes before navigation
      requestAnimationFrame(() => cmd.action());
    },
    [close]
  );

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab") {
        // Focus trap: keep Tab cycling within the palette
        e.preventDefault();
        const focusable = paletteRef.current?.querySelectorAll<HTMLElement>(
          'input, button, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const items = Array.from(focusable);
        const currentIdx = items.indexOf(document.activeElement as HTMLElement);
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + items.length) % items.length
          : (currentIdx + 1) % items.length;
        items[nextIdx]?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) run(filtered[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, close, run]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-[20%] z-[9999] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111214]/95 shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            ref={paletteRef}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
              <Search className="h-4 w-4 text-white/30 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/25"
              />
              <kbd className="flex items-center gap-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-white/25">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[280px] overflow-y-auto py-2 px-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-white/25">
                  No commands found
                </div>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => run(cmd)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors ${
                      i === selectedIndex
                        ? "bg-accent/[0.08] text-white"
                        : "text-white/60 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        i === selectedIndex
                          ? "bg-accent/[0.12] ring-1 ring-accent/20"
                          : "bg-white/[0.04] ring-1 ring-white/[0.06]"
                      }`}
                    >
                      <cmd.icon
                        className={`h-3.5 w-3.5 ${
                          i === selectedIndex ? "text-accent" : "text-white/40"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium">{cmd.label}</div>
                      <div className="text-[11px] text-white/30 truncate">{cmd.description}</div>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="shrink-0 rounded-md bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-white/20">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {i === selectedIndex && (
                      <CornerDownLeft className="h-3 w-3 text-white/20 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 border-t border-white/[0.06] px-5 py-2.5">
              <span className="flex items-center gap-1 text-[10px] text-white/20">
                <Command className="h-2.5 w-2.5" />K to toggle
              </span>
              <span className="flex items-center gap-1 text-[10px] text-white/20">
                ↑↓ navigate
              </span>
              <span className="flex items-center gap-1 text-[10px] text-white/20">
                ↵ select
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
