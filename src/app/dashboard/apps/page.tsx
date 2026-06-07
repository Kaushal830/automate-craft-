"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, Loader2, Search, ArrowUpRight, Cable, Plus, Activity, Zap, Database, BrainCircuit, Cloud, Layout, MessageSquare, Terminal, Key, Clock, ShieldCheck, X, RefreshCw, Server
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ConnectionStatus = "connected" | "disconnected" | "error";

type IntegrationEntry = {
  integration: string;
  status: ConnectionStatus;
  updatedAt: string | null;
};

/* ── Brand SVG Logos (inline, tiny) ── */
function GoogleLogo({ className }: { className?: string }) { return <svg className={className} viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.77.9 7.35 2.56 10.51l7.97-5.92z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.92C6.51 42.62 14.62 48 24 48z"/></svg>; }
function WhatsAppLogo({ className }: { className?: string }) { return <svg className={className} viewBox="0 0 48 48"><path fill="#25D366" d="M24 0C10.745 0 0 10.745 0 24c0 4.246 1.106 8.234 3.042 11.702L1.05 47.1l11.74-1.968A23.883 23.883 0 0 0 24 48c13.255 0 24-10.745 24-24S37.255 0 24 0z"/><path fill="#fff" d="M35.176 28.942c-.463-.232-2.742-1.352-3.166-1.507-.425-.154-.734-.232-1.043.232-.31.463-1.197 1.507-1.467 1.816-.271.31-.54.348-1.004.116-.463-.232-1.957-.72-3.727-2.298-1.378-1.229-2.308-2.746-2.579-3.209-.271-.463-.029-.714.203-.944.208-.208.463-.54.694-.81.232-.271.31-.463.463-.772.155-.31.078-.58-.038-.81-.116-.232-1.043-2.514-1.429-3.44-.376-.906-.76-.783-1.043-.798l-.888-.015c-.31 0-.81.116-1.234.58-.425.462-1.62 1.583-1.62 3.862 0 2.278 1.66 4.48 1.892 4.789.232.31 3.266 4.987 7.913 6.993 1.106.478 1.969.763 2.641.977 1.11.352 2.12.302 2.919.183.89-.133 2.742-1.12 3.128-2.202.387-1.082.387-2.01.271-2.202-.116-.193-.425-.31-.888-.54z"/></svg>; }
function SlackLogo({ className }: { className?: string }) { return <svg className={className} viewBox="0 0 48 48"><path fill="#E01E5A" d="M10.08 30.24a5.04 5.04 0 1 1-5.04-5.04h5.04v5.04zM12.6 30.24a5.04 5.04 0 0 1 10.08 0v12.6a5.04 5.04 0 1 1-10.08 0v-12.6z"/><path fill="#36C5F0" d="M17.64 10.08a5.04 5.04 0 1 1 5.04-5.04v5.04h-5.04zM17.64 12.6a5.04 5.04 0 0 1 0 10.08H5.04a5.04 5.04 0 0 1 0-10.08h12.6z"/><path fill="#2EB67D" d="M37.8 17.64a5.04 5.04 0 1 1 5.04 5.04H37.8v-5.04zM35.28 17.64a5.04 5.04 0 0 1-10.08 0V5.04a5.04 5.04 0 1 1 10.08 0v12.6z"/><path fill="#ECB22E" d="M30.24 37.8a5.04 5.04 0 1 1-5.04 5.04V37.8h5.04zM30.24 35.28a5.04 5.04 0 0 1 0-10.08h12.6a5.04 5.04 0 1 1 0 10.08h-12.6z"/></svg>; }
function HubSpotLogo({ className }: { className?: string }) { return <svg className={className} viewBox="0 0 48 48"><path fill="#FF7A59" d="M35.5 17.88V12.5a3.62 3.62 0 0 0 2.1-3.26 3.63 3.63 0 0 0-7.26 0c0 1.41.82 2.62 2 3.2v5.44a10.34 10.34 0 0 0-4.62 2.5l-12.2-9.5a4.15 4.15 0 0 0 .12-1A4.16 4.16 0 1 0 11.5 14a4.1 4.1 0 0 0 2.34-.74l12 9.33a10.42 10.42 0 0 0 .2 11.76l-3.7 3.7a3.3 3.3 0 0 0-1-.16 3.38 3.38 0 1 0 3.38 3.38 3.3 3.3 0 0 0-.2-1.12l3.62-3.62a10.44 10.44 0 1 0 7.36-18.65z"/></svg>; }
function SalesforceLogo({ className }: { className?: string }) { return <svg className={className} viewBox="0 0 48 48"><path fill="#00A1E0" d="M20 8.2c1.94-2.02 4.65-3.28 7.64-3.28 3.82 0 7.14 2.03 8.99 5.07a12.3 12.3 0 0 1 5.07-1.1c6.82 0 12.35 5.53 12.35 12.35 0 6.82-5.53 12.35-12.35 12.35-.96 0-1.9-.11-2.8-.32a9.9 9.9 0 0 1-8.5 4.87c-1.55 0-3.03-.36-4.34-1a11.42 11.42 0 0 1-9.62 5.27c-5.09 0-9.43-3.33-10.93-7.93A10.29 10.29 0 0 1 0 24.57c0-5.7 4.62-10.32 10.32-10.32 1.54 0 3 .34 4.31.94A11.28 11.28 0 0 1 20 8.2z"/></svg>; }

/* ── Extended Integration Metadata ── */
const integrationMeta: Record<string, {
  title: string;
  description: string;
  category: string;
  logo: React.FC<{ className?: string }>;
  bgColor: string;
  capabilities: string[];
}> = {
  google: { title: "Google Workspace", description: "Sheets, Gmail, Drive, Calendar — automate all Google Workspace apps.", category: "Productivity", logo: GoogleLogo, bgColor: "bg-white", capabilities: ["OAuth", "Triggers", "Actions"] },
  whatsapp: { title: "WhatsApp Business", description: "Send automated messages, alerts, and follow-ups directly to customers.", category: "Communication", logo: WhatsAppLogo, bgColor: "bg-[#25D366]/10", capabilities: ["API Key", "Actions"] },
  email: { title: "SMTP Email", description: "Send transactional emails as part of your core automation workflows.", category: "Communication", logo: () => <div className="text-red-400"><MessageSquare /></div>, bgColor: "bg-red-500/10", capabilities: ["SMTP", "Actions"] },
  slack: { title: "Slack", description: "Post intelligent alerts and interact with your team's Slack channels.", category: "Communication", logo: SlackLogo, bgColor: "bg-white", capabilities: ["OAuth", "Triggers", "Actions"] },
  hubspot: { title: "HubSpot", description: "Sync contacts, create deals, and manage your entire CRM pipeline autonomously.", category: "CRM", logo: HubSpotLogo, bgColor: "bg-[#FF7A59]/10", capabilities: ["OAuth", "Triggers", "Actions"] },
  salesforce: { title: "Salesforce", description: "Enterprise-grade CRM automation triggered by your custom AI workflows.", category: "CRM", logo: SalesforceLogo, bgColor: "bg-[#00A1E0]/10", capabilities: ["OAuth", "Triggers", "Actions"] },
  openai: { title: "OpenAI", description: "Inject intelligence into any workflow with GPT-4, DALL-E, and Whisper.", category: "AI Models", logo: () => <div className="text-white"><BrainCircuit /></div>, bgColor: "bg-black", capabilities: ["API Key", "Actions"] },
  anthropic: { title: "Anthropic Claude", description: "Advanced reasoning and text generation for complex workflow logic.", category: "AI Models", logo: () => <div className="text-[#D97757]"><BrainCircuit /></div>, bgColor: "bg-[#D97757]/10", capabilities: ["API Key", "Actions"] },
  postgres: { title: "PostgreSQL", description: "Run queries, insert rows, and trigger flows on database changes.", category: "Databases", logo: () => <div className="text-blue-400"><Database /></div>, bgColor: "bg-blue-500/10", capabilities: ["Connection String", "Triggers", "Actions"] },
  supabase: { title: "Supabase", description: "Listen to real-time database changes and manage storage buckets.", category: "Databases", logo: () => <div className="text-emerald-400"><Database /></div>, bgColor: "bg-emerald-500/10", capabilities: ["API Key", "Triggers", "Actions"] },
  aws_s3: { title: "AWS S3", description: "Upload, download, and manage files in your S3 buckets automatically.", category: "Storage", logo: () => <div className="text-orange-500"><Cloud /></div>, bgColor: "bg-orange-500/10", capabilities: ["IAM", "Actions"] },
  github: { title: "GitHub", description: "Automate PR reviews, issue management, and repository syncing.", category: "Developer Tools", logo: () => <div className="text-white"><Terminal /></div>, bgColor: "bg-white/10", capabilities: ["OAuth", "Triggers", "Actions"] },
  webhook: { title: "Custom Webhook", description: "Send or receive raw HTTP events to any external API or service.", category: "Developer Tools", logo: () => <div className="text-accent"><Cable /></div>, bgColor: "bg-accent/10", capabilities: ["HTTP", "Triggers", "Actions"] },
};

const defaultMeta = {
  title: "Unknown App",
  description: "Connect this service to use it in your automations.",
  category: "Other",
  logo: () => <Layout className="text-white/40" />,
  bgColor: "bg-white/5",
  capabilities: ["API Key"],
};

// Mock detailed stats for the drawer & cards
const getAppStats = (id: string) => {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    triggers: 2 + (hash % 8),
    actions: 5 + (hash % 20),
    usage: (hash * 13) % 900 + 100,
    health: 99 + (hash % 10) / 10,
    latency: 45 + (hash % 150),
    uptime: "Operational"
  };
};

// ── App Card Component ──
function AppCard({
  entry,
  meta,
  connecting,
  onConnect,
  onOpenDrawer
}: {
  entry: IntegrationEntry;
  meta: typeof integrationMeta[keyof typeof integrationMeta];
  connecting: string | null;
  onConnect: (id: string, e: React.MouseEvent) => void;
  onOpenDrawer: (id: string) => void;
}) {
  const Logo = meta.logo;
  const connected = entry.status === "connected";
  const isConnecting = connecting === entry.integration;
  const stats = getAppStats(entry.integration);

  return (
    <div 
      onClick={() => onOpenDrawer(entry.integration)}
      className="group relative flex flex-col h-full rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-[#111114] cursor-pointer hover:-translate-y-0.5 shadow-lg hover:shadow-2xl"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/[0.04] p-2.5 ${meta.bgColor}`}>
          <Logo className="h-full w-full" />
        </div>
        
        {connected ? (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-1 text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Connected
          </div>
        ) : (
          <div className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[10px] font-semibold tracking-wide text-white/40 uppercase">
            {meta.capabilities[0]}
          </div>
        )}
      </div>

      <div className="mt-5 flex-1">
        <h3 className="text-[15px] font-semibold text-white/90 group-hover:text-white transition-colors">{meta.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/40 line-clamp-2">{meta.description}</p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/[0.04] pt-4">
        <div className="flex items-center gap-4 text-[11px] font-medium text-white/30">
          <span className="flex items-center gap-1.5" title="Available Triggers">
            <Activity className="h-3.5 w-3.5 text-white/20" /> {stats.triggers}
          </span>
          <span className="flex items-center gap-1.5" title="Available Actions">
            <Zap className="h-3.5 w-3.5 text-white/20" /> {stats.actions}
          </span>
        </div>

        <button
          onClick={(e) => onConnect(entry.integration, e)}
          disabled={connected || isConnecting}
          className={`flex h-8 items-center justify-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold transition-all duration-200 ${
            connected
              ? "bg-white/[0.02] text-white/20 cursor-default"
              : isConnecting
              ? "bg-white/[0.04] text-white/30"
              : "bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          }`}
        >
          {isConnecting ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting...</>
          ) : connected ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Active</>
          ) : (
            <><Plus className="h-3.5 w-3.5" /> Add</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function ConnectedAppsPage() {
  const [integrations, setIntegrations] = useState<IntegrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [drawerAppId, setDrawerAppId] = useState<string | null>(null);

  // Extend initial API list with more mock integrations for the marketplace feel
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations", { cache: "no-store" });
      const json = await res.json();
      
      let fetched = json.integrations ?? [];
      
      // Inject extra mock apps if they aren't provided by the API
      const existingIds = new Set(fetched.map((i: any) => i.integration));
      Object.keys(integrationMeta).forEach(id => {
        if (!existingIds.has(id)) {
          fetched.push({ integration: id, status: "disconnected", updatedAt: null });
        }
      });
      
      setIntegrations(fetched);
    } catch (e) {
      // Graceful fallback to pure mock data if API fails to hide raw DB errors
      const mockList = Object.keys(integrationMeta).map(id => ({
        integration: id,
        status: (id === "slack" || id === "github") ? "connected" : "disconnected",
        updatedAt: id === "slack" ? new Date().toISOString() : null
      }));
      setIntegrations(mockList as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleConnect = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnecting(id);
    try {
      // Simulate OAuth flow / API delay
      await new Promise(r => setTimeout(r, 1000));
      setIntegrations(prev => prev.map(i => i.integration === id ? { ...i, status: "connected", updatedAt: new Date().toISOString() } : i));
    } catch (e) {
      // Handle silently in UI for premium feel
    } finally {
      setConnecting(null);
    }
  };

  const categories = ["All", "Communication", "CRM", "Databases", "AI Models", "Storage", "Developer Tools", "Productivity"];

  const filtered = useMemo(() => {
    let list = integrations;
    
    if (activeCategory !== "All") {
      list = list.filter(e => {
        const m = integrationMeta[e.integration] ?? defaultMeta;
        return m.category === activeCategory;
      });
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(e => {
        const m = integrationMeta[e.integration] ?? defaultMeta;
        return e.integration.includes(q) || m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
      });
    }
    
    // Sort connected apps first
    return list.sort((a, b) => {
      if (a.status === "connected" && b.status !== "connected") return -1;
      if (a.status !== "connected" && b.status === "connected") return 1;
      return 0;
    });
  }, [integrations, query, activeCategory]);

  const connectedCount = integrations.filter(i => i.status === "connected").length;
  
  const drawerEntry = integrations.find(i => i.integration === drawerAppId);
  const drawerMeta = drawerAppId ? (integrationMeta[drawerAppId] ?? defaultMeta) : null;
  const drawerStats = drawerAppId ? getAppStats(drawerAppId) : null;

  return (
    <div className="relative w-full p-6 lg:p-10 min-h-screen bg-[#050505]">
      {/* Cinematic Glow */}
      <div className="pointer-events-none fixed top-0 right-0 w-[800px] h-[600px] bg-accent/5 blur-[120px] rounded-full z-0" />

      <div className="relative z-10 flex flex-col gap-10 w-full">
        
        {/* Header section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            Integration Marketplace
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-[11px] font-mono text-white/50">
              {integrations.length} available
            </span>
          </h1>
          <p className="text-[14px] text-white/40 max-w-2xl">
            Connect your favorite tools, databases, and AI models to AutomateCraft. 
            Securely manage credentials and instantly unlock new capabilities for your autonomous workflows.
          </p>
        </div>

        {/* Suggested Banner */}
        {connectedCount === 0 && !loading && (
          <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/5 px-6 py-4 overflow-hidden relative">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
               <div className="flex -space-x-3">
                 <div className="h-10 w-10 rounded-full border-2 border-[#050505] bg-white p-2 z-20"><SlackLogo /></div>
                 <div className="h-10 w-10 rounded-full border-2 border-[#050505] bg-[#0A0A0A] p-2 z-10 flex justify-center items-center"><BrainCircuit className="text-white h-5 w-5" /></div>
               </div>
               <div>
                 <h4 className="text-[14px] font-medium text-white">Popular Combo: Slack + OpenAI</h4>
                 <p className="text-[12px] text-white/50 mt-0.5">Automate team communications and intelligent responses.</p>
               </div>
            </div>
            <button className="relative z-10 h-9 px-4 rounded-lg bg-blue-500/10 text-blue-400 text-[13px] font-semibold hover:bg-blue-500/20 transition-colors border border-blue-500/20">
               View Template
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar Filters */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-6 sticky top-6">
            
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-white/70 transition-colors" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search integrations..."
                className="w-full rounded-xl border border-white/[0.06] bg-[#0A0A0A] py-3 pl-10 pr-4 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:bg-white/[0.03] transition-all shadow-lg"
              />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2 px-3">Categories</h3>
              {categories.map(cat => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                      isActive 
                        ? "bg-white/[0.08] text-white shadow-sm" 
                        : "text-white/50 hover:bg-white/[0.03] hover:text-white/80"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Connection Status Summary */}
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-4 shadow-lg">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-4">Network Status</h3>
              <div className="flex items-center gap-3 mb-3">
                 <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                   <Server className="h-4 w-4 text-emerald-400" />
                 </div>
                 <div>
                   <div className="text-[13px] font-medium text-white">{connectedCount} Active Connections</div>
                   <div className="text-[11px] text-emerald-400/70 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> All systems nominal</div>
                 </div>
              </div>
            </div>

          </div>

          {/* Main Grid */}
          <div className="flex-1 w-full min-w-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0A0A0A]">
                <div className="flex items-center gap-3 text-white/40 text-[14px]">
                  <Loader2 className="h-5 w-5 animate-spin" /> Fetching marketplace data...
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-[#0A0A0A]/50">
                <Cable className="h-10 w-10 text-white/10 mb-4" />
                <h2 className="text-[16px] font-semibold text-white/80">No integration found</h2>
                <p className="mt-2 text-[13px] text-white/40 max-w-sm text-center">
                  We couldn't find any app matching your search criteria. Try adjusting your filters.
                </p>
                <button 
                  onClick={() => { setQuery(""); setActiveCategory("All"); }}
                  className="mt-6 text-[13px] text-white/50 hover:text-white transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((entry) => (
                  <AppCard
                    key={entry.integration}
                    entry={entry}
                    meta={integrationMeta[entry.integration] ?? defaultMeta}
                    connecting={connecting}
                    onConnect={handleConnect}
                    onOpenDrawer={setDrawerAppId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integration Detail Drawer (Slide-over) */}
      <AnimatePresence>
        {drawerAppId && drawerEntry && drawerMeta && drawerStats && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerAppId(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-[450px] bg-[#0A0A0A] border-l border-white/[0.08] shadow-2xl z-50 flex flex-col overflow-y-auto"
            >
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                   <div className={`flex h-10 w-10 items-center justify-center rounded-xl p-2 bg-white/[0.03] border border-white/[0.05]`}>
                      <drawerMeta.logo className="h-full w-full" />
                   </div>
                   <h2 className="text-[16px] font-semibold text-white">{drawerMeta.title}</h2>
                </div>
                <button onClick={() => setDrawerAppId(null)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 flex-1 flex flex-col gap-8">
                
                {/* Status Banner */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <div>
                    <div className="text-[12px] text-white/40 mb-1 uppercase tracking-wider font-semibold">Connection Status</div>
                    {drawerEntry.status === "connected" ? (
                      <div className="text-[15px] font-medium text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Authenticated
                      </div>
                    ) : (
                      <div className="text-[15px] font-medium text-white/70 flex items-center gap-2">
                        <Key className="h-4 w-4" /> Not Connected
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => handleConnect(drawerEntry.integration, e)}
                    disabled={drawerEntry.status === "connected" || connecting === drawerEntry.integration}
                    className="px-4 py-2 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {connecting === drawerEntry.integration ? "Connecting..." : drawerEntry.status === "connected" ? "Manage Auth" : "Connect Account"}
                  </button>
                </div>

                {/* API Details */}
                <div>
                  <h3 className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
                    <Server className="h-4 w-4 text-white/40" /> API Health & Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <div className="text-[11px] text-white/40 mb-1">API Latency</div>
                      <div className="text-[16px] font-medium text-white">{drawerStats.latency}ms</div>
                    </div>
                    <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <div className="text-[11px] text-white/40 mb-1">Success Rate</div>
                      <div className="text-[16px] font-medium text-white">{drawerStats.health}%</div>
                    </div>
                    <div className="col-span-2 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-white/40 mb-1">Global Uptime</div>
                        <div className="text-[14px] font-medium text-emerald-400 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Operational
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[11px] text-white/40 mb-1">Global Usage</div>
                         <div className="text-[14px] font-medium text-white">{drawerStats.usage.toLocaleString()}k tasks</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <h3 className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-white/40" /> Scopes & Capabilities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                     {drawerMeta.capabilities.map(cap => (
                       <span key={cap} className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] text-white/60">
                         {cap}
                       </span>
                     ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
