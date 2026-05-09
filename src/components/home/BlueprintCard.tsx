"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Shield,
  GitBranch,
  Radio,
  Clock,
  Link2,
} from "lucide-react";

/* ─── Blueprint Data Types ─── */
export type BlueprintNode = {
  id: string;
  label: string;
  type: "trigger" | "action" | "condition" | "output";
  app?: string;
  status: "ready" | "needs-config" | "running" | "success" | "error";
};

export type BlueprintData = {
  title: string;
  trigger: string;
  nodes: BlueprintNode[];
  integrations: string[];
  validationState: "passed" | "warning" | "failed" | "pending";
  deployStatus: "draft" | "review" | "test-ready" | "live";
  version: string;
  n8nSynced: boolean;
  lastRun?: string;
};

/* ─── Status Colors ─── */
const statusColors = {
  ready: { bg: "bg-emerald-400/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  "needs-config": { bg: "bg-amber-400/10", text: "text-amber-400", dot: "bg-amber-400" },
  running: { bg: "bg-accent/10", text: "text-accent", dot: "bg-accent animate-pulse" },
  success: { bg: "bg-emerald-400/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  error: { bg: "bg-red-400/10", text: "text-red-400", dot: "bg-red-400" },
};

const deployLabels = {
  draft: { label: "Draft", color: "text-white/40", bg: "bg-white/5" },
  review: { label: "Ready for review", color: "text-accent", bg: "bg-accent/8" },
  "test-ready": { label: "Test passed", color: "text-emerald-400", bg: "bg-emerald-400/8" },
  live: { label: "Live on n8n", color: "text-emerald-400", bg: "bg-emerald-400/8" },
};

const validationLabels = {
  passed: { label: "Validation passed", icon: CheckCircle2, color: "text-emerald-400" },
  warning: { label: "Needs attention", icon: Shield, color: "text-amber-400" },
  failed: { label: "Validation failed", icon: Shield, color: "text-red-400" },
  pending: { label: "Validating...", icon: Clock, color: "text-white/40" },
};

/* ─── Connector Line ─── */
function ConnectorLine({ index, total }: { index: number; total: number }) {
  const reduce = useReducedMotion();
  if (index >= total - 1) return null;

  return (
    <div className="relative my-0 flex justify-center">
      <div className="h-6 w-px bg-gradient-to-b from-white/10 to-white/5" />
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-accent/40"
        animate={reduce ? undefined : { y: [0, 16, 24], opacity: [0, 1, 0] }}
        transition={reduce ? undefined : {
          duration: 1.8,
          repeat: Infinity,
          delay: index * 0.3,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

/* ─── Node Chip ─── */
function NodeChip({ node, index }: { node: BlueprintNode; index: number }) {
  const reduce = useReducedMotion();
  const colors = statusColors[node.status];
  const typeIcons = {
    trigger: Zap,
    action: ArrowRight,
    condition: GitBranch,
    output: Radio,
  };
  const Icon = typeIcons[node.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: reduce ? 0 : -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: reduce ? 0 : 0.35,
        delay: reduce ? 0 : 0.15 + index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">
            {node.type}
          </span>
          {node.app && (
            <span className="text-[10px] text-white/15">· {node.app}</span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] font-medium text-white/70">{node.label}</p>
      </div>
      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
    </motion.div>
  );
}

/* ─── Main Blueprint Card ─── */
export default function BlueprintCard({
  blueprint,
  compact = false,
}: {
  blueprint: BlueprintData;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const deploy = deployLabels[blueprint.deployStatus];
  const validation = validationLabels[blueprint.validationState];
  const ValidationIcon = validation.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.6,
        delay: reduce ? 0 : 0.3,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#111113] to-[#0d0d0f]"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10">
            <GitBranch className="h-3 w-3 text-accent" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white/80">{blueprint.title}</p>
            <p className="text-[10px] text-white/25">v{blueprint.version}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${deploy.bg} ${deploy.color}`}>
          <div className={`h-1.5 w-1.5 rounded-full ${blueprint.deployStatus === "live" ? "bg-emerald-400 animate-pulse" : "bg-current opacity-50"}`} />
          {deploy.label}
        </div>
      </div>

      {/* Trigger */}
      <div className="border-b border-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-3 w-3 text-amber-400/60" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">Trigger</span>
        </div>
        <p className="mt-1 text-[13px] font-medium text-white/60">{blueprint.trigger}</p>
      </div>

      {/* Nodes */}
      {!compact && (
        <div className="px-4 py-3">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">
            Workflow steps
          </p>
          <div className="space-y-0">
            {blueprint.nodes.map((node, i) => (
              <div key={node.id}>
                <NodeChip node={node} index={i} />
                <ConnectorLine index={i} total={blueprint.nodes.length} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer — validation + integrations + n8n */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.05] px-4 py-3">
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${validation.color}`}>
          <ValidationIcon className="h-3 w-3" />
          {validation.label}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/25">
          <Link2 className="h-3 w-3" />
          {blueprint.integrations.length} connected
        </div>
        {blueprint.n8nSynced && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/60">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
            Synced to n8n
          </div>
        )}
        {blueprint.lastRun && (
          <div className="ml-auto text-[10px] text-white/15">
            Last run: {blueprint.lastRun}
          </div>
        )}
      </div>
    </motion.div>
  );
}
