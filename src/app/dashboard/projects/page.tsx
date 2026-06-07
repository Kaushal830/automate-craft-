"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Pause,
  Play,
  Zap,
  Plus,
  Bot,
  ArrowRight,
  Search,
  MoreVertical,
  GitBranch,
  Rocket,
  Terminal,
  MessageSquare,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Workflow
} from "lucide-react";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { useCredits } from "@/components/providers/CreditsProvider";

type AutomationSummary = {
  id: string;
  name: string;
  status: "active" | "paused";
  runsCount: number;
  lastRunAt: string | null;
  lastRunStatus: "running" | "success" | "error" | null;
  webhookId: string;
  workflow: {
    integrations: string[];
  };
  description?: string;
};

// Deterministic mock data generator to enrich the UI
const getMockData = (id: string, name: string, integrations: string[]) => {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const states = ["Live", "Paused", "Draft", "Failed", "Running", "Scheduled"] as const;
  const regions = ["us-east-1", "eu-west-1", "ap-south-1", "global"];
  
  const extendedStatus = states[hash % states.length];
  const successRate = 85 + (hash % 15) + (hash % 10) / 10;
  const aiScore = 70 + (hash % 30);
  const region = regions[hash % regions.length];
  
  const apps = integrations.length > 0 ? integrations : ["Webhook", "LLM", "Database"];
  
  return {
    extendedStatus,
    successRate: successRate.toFixed(1),
    aiScore,
    region,
    apps,
    isAiGenerated: hash % 2 === 0,
    isPinned: hash % 3 === 0,
    health: successRate > 95 ? "optimal" : successRate > 90 ? "warning" : "degraded",
  };
};

function formatTimestamp(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ActionMenu({ automationId }: { automationId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block text-left">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className="p-1.5 rounded-md hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors outline-none"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-[#111] border border-white/[0.08] shadow-2xl py-1 z-50">
          <button className="w-full text-left px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white flex items-center gap-2 transition-colors">
            <GitBranch className="h-3.5 w-3.5" /> Duplicate Workflow
          </button>
          <button className="w-full text-left px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white flex items-center gap-2 transition-colors">
            <Rocket className="h-3.5 w-3.5" /> Deploy
          </button>
          <button className="w-full text-left px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white flex items-center gap-2 transition-colors">
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
          <button className="w-full text-left px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white flex items-center gap-2 transition-colors">
            <Workflow className="h-3.5 w-3.5" /> Open Graph
          </button>
          <button className="w-full text-left px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white flex items-center gap-2 transition-colors">
            <MessageSquare className="h-3.5 w-3.5" /> Edit Prompt
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const { refreshCredits } = useCredits();
  const [automations, setAutomations] = useState<AutomationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updated" | "executions">("updated");

  const loadAutomations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/automations", { cache: "no-store" });
      const json = (await response.json()) as {
        automations?: AutomationSummary[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "Could not load automations.");
      setAutomations(json.automations ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load automations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAutomations(); }, []);

  const filteredAutomations = useMemo(() => {
    let result = [...automations];

    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q));
    }

    if (statusFilter !== "all") {
      result = result.filter(a => {
         const mock = getMockData(a.id, a.name, a.workflow?.integrations || []);
         return mock.extendedStatus.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    if (sortBy === "executions") {
      result.sort((a, b) => b.runsCount - a.runsCount);
    } else {
      result.sort((a, b) => (b.lastRunAt || "").localeCompare(a.lastRunAt || ""));
    }

    return result;
  }, [automations, searchQuery, statusFilter, sortBy]);

  return (
    <div className="relative w-full p-6 lg:p-10 min-h-screen bg-[#050505]">
      {/* Background glow for cinematic effect */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full z-0" />
      
      <div className="relative z-10 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            Workflows
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-[11px] font-mono text-white/50">
              v2.0 Beta
            </span>
          </h1>
          <p className="text-[13px] text-white/40 max-w-xl">
            Design, deploy, and monitor your AI agent infrastructure. 
            Production-grade operational controls for all your automated workflows.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#0A0A0A] p-2 rounded-xl border border-white/[0.06] shadow-xl">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            
            {/* Search */}
            <div className="relative group shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 group-focus-within:text-white/70 transition-colors" />
              <input 
                type="text" 
                placeholder="Search workflows..." 
                className="h-8 w-48 bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="w-px h-4 bg-white/[0.08] mx-1 shrink-0" />

            {/* Status Filter */}
            <div className="flex items-center bg-white/[0.02] border border-white/[0.04] rounded-lg p-0.5 shrink-0">
              {["all", "live", "running", "scheduled", "draft", "paused", "failed"].map(opt => (
                <button 
                  key={opt}
                  onClick={() => setStatusFilter(opt)}
                  className={`px-3 py-1 text-[12px] font-medium rounded-md capitalize transition-all ${
                    statusFilter === opt 
                      ? 'bg-white/[0.08] text-white shadow-sm' 
                      : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-white/[0.08] mx-1 shrink-0" />
            
            {/* Sort */}
            <div className="flex items-center gap-1.5 text-[12px] text-white/40 shrink-0">
              <span className="pl-1">Sort by:</span>
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-white/80 font-medium focus:outline-none cursor-pointer hover:text-white transition-colors"
              >
                <option value="updated" className="bg-[#111]">Last Updated</option>
                <option value="executions" className="bg-[#111]">Executions</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="h-8 flex items-center gap-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[13px] font-medium text-white/80 hover:bg-white/[0.08] hover:border-white/[0.1] transition-all group">
              <Bot className="h-3.5 w-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
              Generate Workflow
            </button>
            <Link href="/dashboard" className="h-8 flex items-center gap-2 px-3 rounded-lg bg-white text-black text-[13px] font-medium hover:bg-white/90 transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              <Plus className="h-3.5 w-3.5" />
              Create
            </Link>
          </div>
        </div>

        {/* Workflow Table/Grid */}
        {loading ? (
          <div className="h-64 flex items-center justify-center rounded-xl border border-white/[0.06] bg-[#0A0A0A]">
            <div className="flex items-center gap-3 text-white/40 text-sm">
              <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              Loading infrastructure...
            </div>
          </div>
        ) : error ? (
          <div className="h-64 flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 gap-2">
            <AlertCircle className="h-6 w-6 opacity-80" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : automations.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-[#0A0A0A] shadow-2xl">
            <div className="h-16 w-16 mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Workflow className="h-8 w-8 text-white/20" />
            </div>
            <h2 className="text-[15px] font-semibold text-white mb-2">Generate your first automation workflow</h2>
            <p className="text-[13px] text-white/40 mb-8 max-w-sm text-center">
              Create robust AI agents and deploy them globally. Watch them execute tasks in real-time.
            </p>
            <Link href="/dashboard" className="h-9 flex items-center gap-2 px-4 rounded-lg bg-white text-black text-[13px] font-medium hover:bg-white/90 transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]">
              <Plus className="h-4 w-4" />
              Initialize Pipeline
            </Link>
          </div>
        ) : filteredAutomations.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-[#0A0A0A]">
            <Search className="h-8 w-8 text-white/20 mb-3" />
            <p className="text-[14px] font-medium text-white/60">No workflows match your criteria</p>
            <button 
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
              className="mt-4 text-[13px] text-white/40 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="flex flex-col bg-[#0A0A0A] border border-white/[0.06] rounded-xl overflow-x-auto shadow-2xl">
            <div className="min-w-[900px]">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/[0.06] bg-white/[0.01] text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em]">
                <div className="col-span-4">Workflow</div>
                <div className="col-span-3">Pipeline Preview</div>
                <div className="col-span-2">Execution Health</div>
                <div className="col-span-2">Metrics</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-white/[0.04]">
                {filteredAutomations.map(automation => {
                  const mock = getMockData(automation.id, automation.name, automation.workflow?.integrations || []);
                  
                  return (
                    <div key={automation.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center group hover:bg-white/[0.02] transition-colors relative">
                      
                      {/* 1: Workflow Identity & Status */}
                      <div className="col-span-4 flex items-start gap-3.5 pr-4">
                        <div className="mt-1 shrink-0 relative flex h-2.5 w-2.5 items-center justify-center">
                           {mock.extendedStatus === "Live" && <span className="absolute h-full w-full rounded-full bg-emerald-500/40 animate-ping" />}
                           {mock.extendedStatus === "Running" && <span className="absolute h-full w-full rounded-full bg-blue-500/40 animate-ping" />}
                           <div className={`h-2 w-2 rounded-full ring-2 ring-[#0A0A0A] relative z-10 ${
                             mock.extendedStatus === 'Live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' :
                             mock.extendedStatus === 'Failed' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' :
                             mock.extendedStatus === 'Paused' ? 'bg-amber-500' :
                             mock.extendedStatus === 'Running' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' :
                             mock.extendedStatus === 'Scheduled' ? 'bg-purple-500' :
                             'bg-white/20'
                           }`} />
                        </div>
                        <div className="min-w-0 w-full">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Link href={`/dashboard/automations/${automation.id}`} className="text-[14px] font-medium text-white/90 hover:text-white truncate transition-colors">
                              {automation.name}
                            </Link>
                            {mock.isPinned && (
                              <Activity className="h-3.5 w-3.5 text-white/20 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[12px]">
                             <span className="text-white/30 font-mono">{automation.id.slice(0, 8)}</span>
                             <span className="h-1 w-1 rounded-full bg-white/10" />
                             <span className="text-white/40">{mock.region}</span>
                             {mock.isAiGenerated && (
                               <>
                                 <span className="h-1 w-1 rounded-full bg-white/10" />
                                 <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-blue-500/10 border border-blue-500/20 text-[9px] font-medium text-blue-400 uppercase tracking-widest">
                                   Auto
                                 </span>
                               </>
                             )}
                          </div>
                        </div>
                      </div>

                      {/* 2: Node Graph Preview */}
                      <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
                        <div className="flex items-center shrink-0 max-w-full overflow-hidden mask-gradient-right">
                          {mock.apps.map((app, idx) => (
                            <div key={idx} className="flex items-center shrink-0">
                              <span className="inline-flex h-[22px] px-2 items-center justify-center text-[11px] font-medium text-white/60 rounded-[6px] border border-white/[0.08] bg-white/[0.02] shadow-sm whitespace-nowrap">
                                {app}
                              </span>
                              {idx < mock.apps.length - 1 && (
                                <div className="px-1.5 flex items-center justify-center">
                                  <div className="w-2 h-px bg-white/10" />
                                  <ArrowRight className="h-3 w-3 text-white/20 shrink-0" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 3: Health & AI Confidence */}
                      <div className="col-span-2 flex flex-col gap-1.5 justify-center">
                         <div className="flex items-center gap-2">
                           {mock.health === "optimal" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/80" /> :
                            mock.health === "warning" ? <AlertCircle className="h-3.5 w-3.5 text-amber-500/80" /> :
                            <XCircle className="h-3.5 w-3.5 text-red-500/80" />}
                           <span className="text-[13px] font-medium text-white/80 tabular-nums">
                             {mock.successRate}% <span className="text-white/30 text-[11px] font-normal ml-0.5">SR</span>
                           </span>
                         </div>
                         <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                           <Bot className="h-3 w-3 opacity-60" />
                           <div className="w-16 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500/50 rounded-full" style={{ width: `${mock.aiScore}%` }} />
                           </div>
                           <span className="tabular-nums">{mock.aiScore}%</span>
                         </div>
                      </div>

                      {/* 4: Execution Metrics */}
                      <div className="col-span-2 flex flex-col gap-1.5 justify-center">
                         <div className="text-[12px] text-white/70 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-white/30" />
                            {formatTimestamp(automation.lastRunAt)}
                         </div>
                         <div className="text-[11px] text-white/40 flex items-center gap-1.5">
                           <Terminal className="h-3.5 w-3.5 opacity-70" />
                           <span className="tabular-nums">{automation.runsCount.toLocaleString()}</span> invocations
                         </div>
                      </div>

                      {/* 5: Quick Actions */}
                      <div className="col-span-1 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/automations/${automation.id}`} className="p-1.5 rounded-md hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors" title="View Graph">
                          <Workflow className="h-4 w-4" />
                        </Link>
                        <button className="p-1.5 rounded-md hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors" title="View Logs">
                          <Terminal className="h-4 w-4" />
                        </button>
                        <ActionMenu automationId={automation.id} />
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
