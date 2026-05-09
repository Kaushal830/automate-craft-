"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  MessageCircle,
  Mail,
  Bell,
} from "lucide-react";

const starters = [
  {
    icon: MessageCircle,
    trigger: "Typeform",
    action: "WhatsApp",
    title: "Lead routing",
    prompt: "When a new lead fills my form, send them a WhatsApp message and add to CRM",
    complexity: "3 steps",
    color: "text-emerald-400",
    bg: "bg-emerald-400/8",
  },
  {
    icon: Mail,
    trigger: "Stripe",
    action: "Google Sheets",
    title: "Invoice sync",
    prompt: "Save new Stripe invoices to Google Sheets and notify me on Slack",
    complexity: "4 steps",
    color: "text-accent",
    bg: "bg-accent/8",
  },
  {
    icon: Bell,
    trigger: "Zendesk",
    action: "WhatsApp",
    title: "Support escalation",
    prompt: "Alert me on WhatsApp when a support ticket is marked high-priority",
    complexity: "2 steps",
    color: "text-amber-400",
    bg: "bg-amber-400/8",
  },
];

type WorkflowStartersProps = {
  onSelect?: (prompt: string) => void;
};

export default function WorkflowStarters({ onSelect }: WorkflowStartersProps) {
  const reduce = useReducedMotion();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {starters.map((starter, i) => (
        <motion.button
          key={starter.title}
          type="button"
          onClick={() => onSelect?.(starter.prompt)}
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduce ? 0 : 0.35,
            delay: reduce ? 0 : 0.6 + i * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="group flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-left transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
        >
          {/* App flow indicator */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-6 items-center rounded-md ${starter.bg} px-2 text-[10px] font-bold ${starter.color}`}>
              {starter.trigger}
            </span>
            <ArrowRight className="h-3 w-3 text-white/15" />
            <span className="inline-flex h-6 items-center rounded-md bg-white/[0.04] px-2 text-[10px] font-bold text-white/40">
              {starter.action}
            </span>
            <span className="ml-auto text-[9px] font-mono text-white/15">{starter.complexity}</span>
          </div>

          {/* Content */}
          <div>
            <span className="text-[13px] font-semibold text-white/60 group-hover:text-white/80 transition-colors">
              {starter.title}
            </span>
            <p className="mt-1 text-[11px] leading-[1.5] text-white/30 group-hover:text-white/40 transition-colors">
              {starter.prompt}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
