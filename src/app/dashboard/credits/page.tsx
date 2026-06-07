"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit, Activity, BarChart3, Clock, DollarSign,
  Database, Server, TrendingUp, Sparkles, Cpu, Lightbulb, 
  TrendingDown, Network, ShieldCheck, Gauge, ArrowUpRight, Zap, CheckCircle2
} from "lucide-react";

/* ── Animated Count Up ── */
function CountUp({ target, duration = 1.2, suffix = "", prefix = "", decimals = 0 }: { target: number; duration?: number, suffix?: string, prefix?: string, decimals?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = performance.now();
    let frame: number;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return <>{prefix}{value.toFixed(decimals)}{suffix}</>;
}

/* ── Faux CSS Graph Component ── */
function UsageGraph() {
  // Generate 24 random bars for a daily/hourly trend
  const bars = Array.from({ length: 24 }).map((_, i) => {
    const height = 20 + Math.random() * 80; // 20% to 100%
    const isSpike = height > 85;
    return { id: i, height, isSpike };
  });

  return (
    <div className="flex items-end justify-between h-[120px] gap-1.5 mt-6 border-b border-white/[0.04] pb-2">
      {bars.map((bar) => (
        <div key={bar.id} className="relative w-full flex flex-col justify-end group h-full">
          {/* Tooltip */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[#111] border border-white/[0.08] text-white text-[10px] py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
            {Math.floor(bar.height * 142)} tokens
          </div>
          <div 
            className={`w-full rounded-t-sm transition-all duration-300 group-hover:opacity-100 ${
              bar.isSpike ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] opacity-80" : "bg-white/[0.1] opacity-50"
            }`} 
            style={{ height: `${bar.height}%` }} 
          />
        </div>
      ))}
    </div>
  );
}

/* ── Heatmap Component ── */
function ExecutionHeatmap() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="mt-4 flex flex-col gap-1.5">
       {days.map(day => (
         <div key={day} className="flex items-center gap-3">
           <span className="text-[10px] text-white/30 w-6 font-mono">{day}</span>
           <div className="flex flex-1 gap-1">
             {Array.from({ length: 14 }).map((_, i) => {
                const intensity = Math.random();
                const bg = intensity > 0.8 ? "bg-blue-500" : intensity > 0.5 ? "bg-blue-500/60" : intensity > 0.2 ? "bg-blue-500/30" : "bg-white/[0.03]";
                return <div key={i} className={`h-3 w-full rounded-[2px] ${bg} transition-colors hover:ring-1 ring-white/50 cursor-pointer`} />
             })}
           </div>
         </div>
       ))}
    </div>
  );
}

/* ── Main Dashboard ── */
export default function UsageIntelligencePage() {
  return (
    <div className="relative w-full p-6 lg:p-10 min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">
      {/* Cinematic Ambient Glow */}
      <div className="pointer-events-none fixed top-[-10%] right-[-5%] w-[70%] h-[70%] bg-blue-600/5 blur-[140px] rounded-full z-0" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full z-0" />

      <div className="relative z-10 flex flex-col gap-8 w-full max-w-none mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.04] pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-semibold tracking-tight flex items-center gap-3">
              Usage Intelligence
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] font-mono text-blue-400 uppercase tracking-wider">
                <Activity className="h-3 w-3" /> Live Telemetry
              </span>
            </h1>
            <p className="text-[13px] text-white/40 max-w-2xl leading-relaxed">
              Real-time infrastructure analytics. Monitor AI token burn rates, provider latency, execution loads, and optimize your automation costs.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-medium">
             <div className="flex flex-col items-end">
               <span className="text-white/30 uppercase tracking-widest text-[10px] mb-1">Burn Rate</span>
               <span className="text-emerald-400 flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" /> 14.2% MoM</span>
             </div>
             <div className="h-8 w-px bg-white/[0.08]" />
             <div className="flex flex-col items-end">
               <span className="text-white/30 uppercase tracking-widest text-[10px] mb-1">Forecast</span>
               <span className="text-white/80">$142.50 / mo</span>
             </div>
          </div>
        </div>

        {/* ── Top KPIs ── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-[30px] group-hover:bg-blue-500/20 transition-colors" />
            <div className="flex items-center justify-between mb-4 relative z-10">
               <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Tokens Consumed</span>
               <BrainCircuit className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-[32px] font-mono font-semibold tracking-tight relative z-10">
               <CountUp target={12.4} decimals={1} suffix="M" />
            </div>
            <div className="mt-2 text-[11px] text-white/30 flex items-center gap-1.5 relative z-10">
               <TrendingUp className="h-3 w-3 text-red-400" /> +2.1M vs last month
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[30px] group-hover:bg-emerald-500/20 transition-colors" />
            <div className="flex items-center justify-between mb-4 relative z-10">
               <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Compute Time</span>
               <Cpu className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-[32px] font-mono font-semibold tracking-tight relative z-10">
               <CountUp target={142} />h <CountUp target={12} />m
            </div>
            <div className="mt-2 text-[11px] text-white/30 flex items-center gap-1.5 relative z-10">
               <Zap className="h-3 w-3 text-emerald-400" /> 98.4% utilization efficiency
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-[30px] group-hover:bg-amber-500/20 transition-colors" />
            <div className="flex items-center justify-between mb-4 relative z-10">
               <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Total Cost</span>
               <DollarSign className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-[32px] font-mono font-semibold tracking-tight relative z-10 text-white">
               <CountUp target={42.50} decimals={2} prefix="$" />
            </div>
            <div className="mt-2 text-[11px] text-white/30 flex items-center gap-1.5 relative z-10">
               <TrendingDown className="h-3 w-3 text-emerald-400" /> -$12.40 optimized
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-[30px] group-hover:bg-purple-500/20 transition-colors" />
            <div className="flex items-center justify-between mb-4 relative z-10">
               <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">System Efficiency</span>
               <Gauge className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-[32px] font-mono font-semibold tracking-tight relative z-10 text-white flex items-end gap-1">
               <CountUp target={94} />% <span className="text-[14px] text-white/30 mb-1.5">Score</span>
            </div>
            <div className="mt-2 text-[11px] text-white/30 flex items-center gap-1.5 relative z-10">
               <ShieldCheck className="h-3 w-3 text-purple-400" /> Infrastructure healthy
            </div>
          </div>
        </div>

        {/* ── Main Grids ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Trend & Heatmap (Span 2) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Usage Trend */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-6 shadow-xl">
               <div className="flex items-center justify-between">
                 <div>
                   <h3 className="text-[15px] font-semibold text-white">Execution Volume & Token Burn</h3>
                   <p className="text-[12px] text-white/40 mt-1">30-day trailing metrics across all environments.</p>
                 </div>
                 <select className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white focus:outline-none">
                   <option>Last 30 Days</option>
                   <option>Last 7 Days</option>
                   <option>24 Hours</option>
                 </select>
               </div>
               <UsageGraph />
               <div className="flex justify-between mt-3 text-[10px] font-mono text-white/30">
                 <span>Mar 1</span>
                 <span>Mar 15</span>
                 <span>Mar 30</span>
               </div>
            </div>

            {/* AI Optimization Suggestions */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.02] p-6 shadow-xl relative overflow-hidden">
               <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 blur-[80px] pointer-events-none" />
               <h3 className="text-[15px] font-semibold text-blue-400 flex items-center gap-2 mb-4">
                 <Sparkles className="h-4 w-4" /> AI Optimization Intelligence
               </h3>
               <div className="grid sm:grid-cols-2 gap-4 relative z-10">
                 <div className="rounded-lg border border-white/[0.08] bg-[#0A0A0A] p-4 hover:border-white/[0.15] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">High Impact</span>
                       <span className="text-[13px] font-mono text-white/50">-$24.50/mo</span>
                    </div>
                    <p className="text-[13px] text-white/80 font-medium">Workflow "Customer Triage"</p>
                    <p className="text-[12px] text-white/50 mt-1 leading-relaxed">Could reduce token usage by 32% by switching from GPT-4o to Claude 3.5 Haiku for classification.</p>
                 </div>
                 <div className="rounded-lg border border-white/[0.08] bg-[#0A0A0A] p-4 hover:border-white/[0.15] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">Medium Impact</span>
                       <span className="text-[13px] font-mono text-white/50">-1.2s latency</span>
                    </div>
                    <p className="text-[13px] text-white/80 font-medium">Database Aggregation Node</p>
                    <p className="text-[12px] text-white/50 mt-1 leading-relaxed">Consider batching 5 separate Postgres queries into a single transaction to reduce overhead.</p>
                 </div>
               </div>
            </div>

          </div>

          {/* Side Panel (Span 1) */}
          <div className="flex flex-col gap-6">
             
             {/* Infrastructure Health */}
             <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-6 shadow-xl">
               <h3 className="text-[14px] font-semibold text-white mb-5 flex items-center gap-2">
                 <Server className="h-4 w-4 text-white/40" /> Infrastructure Health
               </h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-[12px] text-white/50">Execution Queue</span>
                    <span className="text-[13px] font-mono text-white">0 pending</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[12px] text-white/50">Worker Load</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                         <div className="w-[15%] h-full bg-emerald-400 rounded-full" />
                      </div>
                      <span className="text-[12px] font-mono text-white/80 w-8">15%</span>
                    </div>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[12px] text-white/50">Provider Latency (Avg)</span>
                    <span className="text-[13px] font-mono text-amber-400">420ms</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[12px] text-white/50">API Rate Limits</span>
                    <span className="text-[12px] font-medium text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" /> Nominal
                    </span>
                 </div>
               </div>
               
               {/* Small Heatmap */}
               <div className="mt-6 pt-5 border-t border-white/[0.04]">
                 <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 block mb-3">Activity Heatmap</span>
                 <ExecutionHeatmap />
               </div>
             </div>

             {/* Provider Analytics */}
             <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-6 shadow-xl">
               <h3 className="text-[14px] font-semibold text-white mb-5 flex items-center gap-2">
                 <Network className="h-4 w-4 text-white/40" /> Provider Analytics
               </h3>
               <div className="space-y-5">
                 <div>
                   <div className="flex justify-between items-center mb-1.5">
                     <span className="text-[13px] font-medium text-white/80">OpenAI</span>
                     <span className="text-[12px] font-mono text-white/50">$84.20 (8.2M)</span>
                   </div>
                   <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                     <div className="w-[65%] h-full bg-white/80 rounded-full" />
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between items-center mb-1.5">
                     <span className="text-[13px] font-medium text-white/80">Anthropic Claude</span>
                     <span className="text-[12px] font-mono text-white/50">$46.50 (3.1M)</span>
                   </div>
                   <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                     <div className="w-[28%] h-full bg-[#D97757] rounded-full" />
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between items-center mb-1.5">
                     <span className="text-[13px] font-medium text-white/80">Google Gemini</span>
                     <span className="text-[12px] font-mono text-white/50">$11.80 (1.1M)</span>
                   </div>
                   <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                     <div className="w-[7%] h-full bg-blue-500 rounded-full" />
                   </div>
                 </div>
               </div>
             </div>

          </div>
        </div>

        {/* ── Workflow Cost Breakdown Table ── */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] shadow-xl overflow-hidden mt-2">
           <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-white">Workflow Economics</h3>
              <button className="text-[12px] font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                View Full Report <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[11px] font-bold uppercase tracking-[0.1em] text-white/30">
                   <th className="px-6 py-3 font-medium">Workflow</th>
                   <th className="px-6 py-3 font-medium text-right">Executions</th>
                   <th className="px-6 py-3 font-medium text-right">API Calls</th>
                   <th className="px-6 py-3 font-medium text-right">AI Latency (Avg)</th>
                   <th className="px-6 py-3 font-medium text-right">Total Cost</th>
                   <th className="px-6 py-3 font-medium text-center">Opt. Score</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.04]">
                 {[
                   { name: "Support Ticket Router", runs: "12,402", api: "24.8k", latency: "1.2s", cost: "$64.20", score: 98 },
                   { name: "Daily Data Aggregation", runs: "31", api: "8.4k", latency: "4.5s", cost: "$42.10", score: 64 },
                   { name: "Lead Qualification Agent", runs: "4,105", api: "12.3k", latency: "2.1s", cost: "$28.50", score: 85 },
                   { name: "Slack Summarizer", runs: "842", api: "1.6k", latency: "3.8s", cost: "$7.70", score: 92 },
                 ].map((row, i) => (
                   <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                     <td className="px-6 py-4 text-[13px] font-medium text-white/90">{row.name}</td>
                     <td className="px-6 py-4 text-[13px] font-mono text-white/50 text-right">{row.runs}</td>
                     <td className="px-6 py-4 text-[13px] font-mono text-white/50 text-right">{row.api}</td>
                     <td className="px-6 py-4 text-[13px] font-mono text-amber-400/80 text-right">{row.latency}</td>
                     <td className="px-6 py-4 text-[13px] font-mono text-white/90 text-right">{row.cost}</td>
                     <td className="px-6 py-4 flex justify-center">
                       <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold border ${
                         row.score > 90 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                         row.score > 70 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                         "bg-red-500/10 text-red-400 border-red-500/20"
                       }`}>
                         {row.score}/100
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  );
}

// Ensure CheckCircle2 is imported, wait, let me just replace CheckCircle2 with a simple icon or import it if missing.
// I already imported CheckCircle2 in the first block if I did... wait, I didn't import CheckCircle2. I'll add it.
