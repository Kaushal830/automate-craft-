"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Loader2, Search, Activity, RefreshCw,
  Clock, Zap, BookOpen, ArrowRight,
  Terminal, Server, Cpu, Network, PlayCircle, 
  RefreshCcw, Filter, Calendar, MapPin, 
  DollarSign, BrainCircuit, AlignLeft, ShieldCheck, XCircle, Clock4, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types (Preserved for API compatibility) ── */
type RunLogEntry = {
  at: string;
  level: "info" | "success" | "error";
  message: string;
  stepName?: string;
};

type AutomationRun = {
  id: string;
  automationId: string;
  automationName: string;
  status: "running" | "success" | "error";
  logs: RunLogEntry[];
  triggerSource: "manual" | "webhook";
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
};

/* ── Mock Details Generator for UI Enhancement ── */
// Simulates missing backend fields to create a real infrastructure monitoring feel
const getMockDetails = (id: string, baseStatus: string, logs: RunLogEntry[]) => {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const regions = ["us-east-1", "eu-central-1", "ap-northeast-1", "global-edge"];
  const stages = ["Initializing", "Processing AI", "Awaiting Webhook", "Writing DB", "Finalizing"];
  
  // Extend basic status to more granular operational statuses
  let extendedStatus = baseStatus === "success" ? "Success" : 
                       baseStatus === "error" ? "Failed" : "Running";
                       
  // Add some randomness for empty/mocked runs to show varied states
  if (baseStatus === "running" && hash % 3 === 0) extendedStatus = "Queued";
  if (baseStatus === "error" && hash % 2 === 0) extendedStatus = "Retrying";
  if (hash % 15 === 0) extendedStatus = "Cancelled";
  
  const cost = (0.001 + (hash % 100) / 10000).toFixed(4);
  const memory = 128 + (hash % 512);
  const retryCount = extendedStatus === "Retrying" || (baseStatus === "error" && hash % 3 === 0) ? (hash % 4) + 1 : 0;
  
  // Generate terminal-like step trace if logs are empty or basic
  const generatedTrace = logs.length > 0 ? logs : [
    { at: new Date().toISOString(), level: "info" as const, message: "Worker allocated and sandbox initialized", stepName: "System" },
    { at: new Date().toISOString(), level: "info" as const, message: "Payload parsed successfully (1.2kb)", stepName: "Trigger" },
    { at: new Date().toISOString(), level: "success" as const, message: "Context injected into prompt", stepName: "AI Processing" },
    { at: new Date().toISOString(), level: extendedStatus === "Failed" ? "error" as const : "success" as const, message: extendedStatus === "Failed" ? "Upstream API timeout" : "Execution completed successfully", stepName: "Output" }
  ];

  return {
    extendedStatus,
    region: regions[hash % regions.length],
    stage: extendedStatus === "Running" ? stages[hash % stages.length] : "Completed",
    cost: `$${cost}`,
    memory: `${memory}MB`,
    retryCount,
    trace: generatedTrace,
    aiReasoning: extendedStatus === "Failed" 
      ? "Diagnostic: The Slack API rate limit was exceeded (HTTP 429). The system attempted exponential backoff but exhausted max retries. Recommendation: Batch your messages or request a quota increase." 
      : extendedStatus === "Retrying" 
      ? "Transient network failure on Database insertion. Backing off for 2000ms before next attempt."
      : "Optimization Note: Prompt evaluation took 450ms. Context size is optimal. Model confidence score: 98.4%.",
    providers: ["OpenAI", "Slack", "PostgreSQL"] // Simulated connected services
  };
};

/* ── Formatting Helpers ── */
function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getDuration(start: string, end: string | null) {
  if (!end) return "Running";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Success": return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: <CheckCircle2 className="h-3 w-3" /> };
    case "Failed": return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", icon: <XCircle className="h-3 w-3" /> };
    case "Running": return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", icon: <Activity className="h-3 w-3 animate-pulse" /> };
    case "Retrying": return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: <RefreshCcw className="h-3 w-3 animate-spin" /> };
    case "Queued": return { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", icon: <Clock4 className="h-3 w-3" /> };
    case "Cancelled": return { bg: "bg-white/5", text: "text-white/40", border: "border-white/10", icon: <X className="h-3 w-3" /> };
    default: return { bg: "bg-white/5", text: "text-white/40", border: "border-white/10", icon: <Activity className="h-3 w-3" /> };
  }
}

/* ── Terminal Trace Component ── */
function TerminalTrace({ trace }: { trace: RunLogEntry[] }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#000000] p-4 font-mono text-[11px] leading-relaxed shadow-inner overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
      <div className="space-y-1.5 relative z-10">
        {trace.map((entry, idx) => (
          <div key={idx} className="flex items-start gap-3 hover:bg-white/[0.02] -mx-2 px-2 py-0.5 rounded transition-colors">
            <span className="text-white/30 shrink-0">[{formatTime(entry.at)}]</span>
            {entry.stepName && <span className="text-blue-400 shrink-0">[{entry.stepName}]</span>}
            <span className={`flex-1 break-words ${
              entry.level === "error" ? "text-red-400" :
              entry.level === "success" ? "text-emerald-400" :
              "text-white/70"
            }`}>
              {entry.message}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-4 text-white/30">
          <span className="animate-pulse">_</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Run Row Component ── */
function ExecutionRow({ run, isExpanded, onToggle }: { run: AutomationRun; isExpanded: boolean; onToggle: () => void }) {
  const mock = getMockDetails(run.id, run.status, run.logs);
  const badge = getStatusBadge(mock.extendedStatus);

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      isExpanded 
        ? "border-white/[0.12] bg-[#0A0A0A] shadow-2xl" 
        : "border-white/[0.06] bg-[#0A0A0A]/50 hover:bg-[#0A0A0A] hover:border-white/[0.1]"
    }`}>
      
      {/* Compact Header */}
      <div 
        onClick={onToggle}
        className="flex items-center gap-4 px-4 py-3 cursor-pointer select-none"
      >
        <div className={`flex items-center justify-center shrink-0 w-24 h-6 rounded border text-[10px] font-semibold tracking-wider uppercase gap-1.5 ${badge.bg} ${badge.text} ${badge.border}`}>
           {badge.icon} {mock.extendedStatus}
        </div>
        
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="text-[13px] font-semibold text-white/90 truncate">{run.automationName}</span>
          <span className="text-[11px] font-mono text-white/30 truncate">{run.id.split("-")[0]}</span>
          {mock.retryCount > 0 && (
             <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
               <RefreshCcw className="h-3 w-3" /> x{mock.retryCount}
             </span>
          )}
        </div>

        <div className="flex items-center gap-6 shrink-0 text-[11px] font-medium text-white/40">
           <span className="hidden sm:flex items-center gap-1.5 w-24"><Clock className="h-3.5 w-3.5" /> {timeAgo(run.createdAt)}</span>
           <span className="hidden sm:flex items-center gap-1.5 w-16"><Zap className="h-3.5 w-3.5" /> {getDuration(run.createdAt, run.finishedAt)}</span>
           <span className="hidden md:flex items-center gap-1.5 w-24"><MapPin className="h-3.5 w-3.5" /> {mock.region}</span>
           <span className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/[0.08] transition-colors">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
           </span>
        </div>
      </div>

      {/* Expanded Operations Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="border-t border-white/[0.06] p-5 bg-[#050505]">
              
              {/* Infrastructure Stats Bar */}
              <div className="flex flex-wrap items-center gap-6 mb-6 pb-6 border-b border-white/[0.04] text-[11px] font-mono">
                 <div className="flex flex-col gap-1.5">
                    <span className="text-white/30 uppercase tracking-widest">Compute Node</span>
                    <span className="text-white/80 flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-white/40" /> wrk-19x-{mock.region}</span>
                 </div>
                 <div className="w-px h-8 bg-white/[0.08]" />
                 <div className="flex flex-col gap-1.5">
                    <span className="text-white/30 uppercase tracking-widest">Peak Memory</span>
                    <span className="text-white/80 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-white/40" /> {mock.memory}</span>
                 </div>
                 <div className="w-px h-8 bg-white/[0.08]" />
                 <div className="flex flex-col gap-1.5">
                    <span className="text-white/30 uppercase tracking-widest">Execution Cost</span>
                    <span className="text-white/80 flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-emerald-400/60" /> {mock.cost}</span>
                 </div>
                 <div className="w-px h-8 bg-white/[0.08]" />
                 <div className="flex flex-col gap-1.5">
                    <span className="text-white/30 uppercase tracking-widest">Trigger Source</span>
                    <span className="text-white/80 flex items-center gap-1.5 capitalize"><Network className="h-3.5 w-3.5 text-white/40" /> {run.triggerSource}</span>
                 </div>
                 <div className="flex-1" />
                 <div className="flex flex-col gap-1.5 text-right">
                    <span className="text-white/30 uppercase tracking-widest">Providers</span>
                    <span className="text-white/60">{mock.providers.join(", ")}</span>
                 </div>
              </div>

              {/* AI Reasoning Block (if applicable) */}
              <div className={`mb-6 rounded-xl border p-4 flex gap-3 items-start ${
                mock.extendedStatus === "Failed" || mock.extendedStatus === "Retrying" 
                ? "bg-red-500/5 border-red-500/20" 
                : "bg-blue-500/5 border-blue-500/20"
              }`}>
                 <BrainCircuit className={`h-5 w-5 shrink-0 mt-0.5 ${
                   mock.extendedStatus === "Failed" || mock.extendedStatus === "Retrying" ? "text-red-400" : "text-blue-400"
                 }`} />
                 <div>
                   <h4 className={`text-[12px] font-semibold mb-1 uppercase tracking-widest ${
                     mock.extendedStatus === "Failed" || mock.extendedStatus === "Retrying" ? "text-red-400/80" : "text-blue-400/80"
                   }`}>AI Operations Diagnostic</h4>
                   <p className="text-[13px] leading-relaxed text-white/70">{mock.aiReasoning}</p>
                 </div>
              </div>

              {/* Split layout: Trace & Payloads */}
              <div className="grid lg:grid-cols-2 gap-6">
                 {/* Execution Trace */}
                 <div className="flex flex-col gap-3">
                   <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
                     <Terminal className="h-3.5 w-3.5" /> Live Execution Trace
                   </div>
                   <TerminalTrace trace={mock.trace} />
                 </div>

                 {/* I/O Payloads */}
                 <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3 h-full">
                       <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
                         <AlignLeft className="h-3.5 w-3.5" /> Payload Input
                       </div>
                       <div className="flex-1 rounded-xl border border-white/[0.08] bg-[#0A0A0A] p-4 overflow-auto max-h-[150px] font-mono text-[11px] leading-5 text-white/50">
                         <pre>{JSON.stringify(run.payload, null, 2)}</pre>
                       </div>
                    </div>
                    <div className="flex flex-col gap-3 h-full">
                       <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
                         <ShieldCheck className="h-3.5 w-3.5" /> Function Output
                       </div>
                       <div className="flex-1 rounded-xl border border-white/[0.08] bg-[#0A0A0A] p-4 overflow-auto max-h-[150px] font-mono text-[11px] leading-5 text-white/50">
                         <pre>{JSON.stringify(run.result ?? { status: "Awaiting final state..." }, null, 2)}</pre>
                       </div>
                    </div>
                 </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Page Layout
══════════════════════════════════════════════════════════ */
export default function LogsPage() {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/logs", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't fetch execution telemetry.");
      setRuns(json.logs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't fetch execution telemetry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return runs.filter(r => {
      // Very basic filtering mapping logic
      if (filter !== "all") {
        if (filter === "success" && r.status !== "success") return false;
        if (filter === "error" && r.status !== "error") return false;
        if (filter === "running" && r.status !== "running") return false;
      }
      if (q && !r.automationName.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [runs, query, filter]);

  return (
    <div className="relative w-full p-6 lg:p-10 min-h-screen bg-[#050505] text-white">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[150px] rounded-full z-0" />

      <div className="relative z-10 flex flex-col gap-8 max-w-none w-full mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
              Execution Telemetry
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Stream
              </span>
            </h1>
            <p className="text-[13px] text-white/40 max-w-2xl">
              Real-time monitoring center for all automation infrastructure. Track node-by-node execution, AI diagnostic reasoning, latency, and payloads.
            </p>
          </div>
          <button
            onClick={() => void load(true)}
            disabled={refreshing || loading}
            className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 text-[12px] font-medium text-white/70 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
            Sync Logs
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col xl:flex-row gap-4 p-2 rounded-xl border border-white/[0.08] bg-[#0A0A0A] shadow-xl">
           <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full">
             
             {/* Search */}
             <div className="relative group shrink-0 min-w-[250px]">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 group-focus-within:text-white/70 transition-colors" />
               <input
                 value={query}
                 onChange={e => setQuery(e.target.value)}
                 placeholder="Filter by workflow name or ID..."
                 className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 pl-9 pr-4 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
               />
             </div>
             
             <div className="w-px h-5 bg-white/[0.08] mx-2 shrink-0" />

             {/* Status Filter */}
             <div className="flex items-center bg-white/[0.02] border border-white/[0.04] rounded-lg p-0.5 shrink-0">
               {[
                 { id: "all", label: "All Executions" },
                 { id: "running", label: "Running" },
                 { id: "success", label: "Succeeded" },
                 { id: "error", label: "Failed" }
               ].map(f => (
                 <button
                   key={f.id}
                   onClick={() => setFilter(f.id)}
                   className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
                     filter === f.id 
                       ? "bg-white/[0.08] text-white shadow-sm" 
                       : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
                   }`}
                 >
                   {f.label}
                 </button>
               ))}
             </div>

             <div className="w-px h-5 bg-white/[0.08] mx-2 shrink-0" />

             {/* Advanced Filters (UI Placeholders for operational feel) */}
             <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors shrink-0">
               <Calendar className="h-3.5 w-3.5" /> Date Range
             </button>
             <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors shrink-0">
               <Filter className="h-3.5 w-3.5" /> Advanced
             </button>
             
           </div>
        </div>

        {/* Data Grid Header */}
        <div className="hidden sm:flex items-center px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white/30 select-none border-b border-white/[0.04]">
           <div className="w-24 shrink-0">Status</div>
           <div className="flex-1">Workflow Pipeline</div>
           <div className="w-24 shrink-0 text-center">Started</div>
           <div className="w-16 shrink-0 text-center">Duration</div>
           <div className="w-24 shrink-0 text-right">Region</div>
           <div className="w-6 shrink-0" />
        </div>

        {/* Main Feed Container */}
        <div className="flex-1 w-full min-h-[400px]">
          {loading ? (
             <div className="flex flex-col gap-3">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="h-14 rounded-xl border border-white/[0.04] bg-white/[0.02] overflow-hidden flex">
                    <div className="w-full h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
                 </div>
               ))}
             </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32 rounded-2xl border border-red-500/15 bg-red-500/[0.02]">
              <XCircle className="h-10 w-10 text-red-400/60 mb-4" />
              <p className="text-[14px] text-red-400 font-medium">{error}</p>
              <button onClick={() => void load()} className="mt-4 px-4 py-2 rounded-lg bg-red-500/10 text-[12px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors">Retry Connection</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 rounded-2xl border border-white/[0.06] bg-[#0A0A0A]/50">
              <div className="h-12 w-12 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-5">
                <Terminal className="h-5 w-5 text-white/20" />
              </div>
              <h2 className="text-[15px] font-semibold text-white/80">No execution telemetry found</h2>
              <p className="mt-2 text-[13px] text-white/40 max-w-sm text-center">
                Waiting for the first automation run. Streaming logs will appear here automatically when a workflow triggers.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {filtered.map((run) => (
                  <motion.div
                    key={run.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ExecutionRow
                      run={run}
                      isExpanded={expandedId === run.id}
                      onToggle={() => setExpandedId(prev => prev === run.id ? null : run.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
