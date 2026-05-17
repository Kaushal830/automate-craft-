"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Workflow, Zap, Send, Terminal, Play, Rocket, PanelRightClose, Link as LinkIcon, Activity } from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node as FlowNodeType,
  type Edge as FlowEdgeType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export type FlowNode = {
  id: string;
  type: "trigger" | "process" | "action";
  label: string;
  status: "pending" | "active" | "completed";
  detail?: string;
};

interface InteractiveCanvasProps {
  nodes: FlowNode[];
  onTest: () => void;
  onDeploy: () => void;
  isDeploying: boolean;
  hasDeployed: boolean;
  isTesting: boolean;
  hasTested: boolean;
  isOpen: boolean;
  onClose: () => void;
}

// Custom Node for React Flow
const CustomNode = ({ data }: any) => {
  const { node, isActive, isCompleted, isTestExecuting, isTestDone, reducedMotion } = data;
  
  const getIcon = (type: FlowNode["type"]) => {
    switch (type) {
      case "trigger": return <Zap className="h-4 w-4" />;
      case "process": return <LinkIcon className="h-4 w-4" />;
      case "action": return <Send className="h-4 w-4" />;
      default: return <Workflow className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: FlowNode["type"]) => {
    switch (type) {
      case "trigger": return "from-amber-500/15 to-amber-500/5 ring-amber-500/15 text-amber-400";
      case "process": return "from-accent/15 to-accent/5 ring-accent/15 text-accent";
      case "action": return "from-violet-500/15 to-violet-500/5 ring-violet-500/15 text-violet-400";
      default: return "from-white/10 to-white/5 ring-white/10 text-white/50";
    }
  };

  const getGlowColor = (type: FlowNode["type"]) => {
    switch (type) {
      case "trigger": return "rgba(245,158,11,0.15)";
      case "process": return "rgba(59,130,246,0.2)";
      case "action": return "rgba(139,92,246,0.15)";
      default: return "rgba(255,255,255,0.05)";
    }
  };

  const getAccentHex = (type: FlowNode["type"]) => {
    switch (type) {
      case "trigger": return "#f59e0b";
      case "process": return "#3b82f6";
      case "action": return "#8b5cf6";
      default: return "#ffffff";
    }
  };

  return (
    <div className="relative w-[320px]">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Active / Test executing glow */}
      {(isActive || isTestExecuting) && !reducedMotion && (
        <motion.div
          className="absolute -inset-1.5 rounded-2xl pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${getGlowColor(node.type)}, transparent 70%)` }}
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [0.98, 1.02, 0.98],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      
      <div className={`node-card relative z-10 flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-[2px] ${
        isActive || isTestExecuting
          ? "border-blue-500/40 bg-gradient-to-br from-[#0f1520] via-[#0d1018] to-[#0a0c10] shadow-[0_0_30px_rgba(59,130,246,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]"
          : isCompleted || isTestDone
            ? "border-white/[0.06] bg-gradient-to-br from-[#0f0f11] to-[#0a0a0c] shadow-[0_6px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]"
            : "border-white/[0.04] bg-[#0a0a0a]"
      }`}>
        <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getTypeColor(node.type)} ring-1 shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all`}>
          {isActive || isTestExecuting ? (
            <div className="relative">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: getAccentHex(node.type) }} />
              {!reducedMotion && (
                <motion.div
                  className="absolute -inset-3 rounded-xl"
                  style={{ border: `1px solid ${getAccentHex(node.type)}30` }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>
          ) : getIcon(node.type)}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5 ${
            isActive || isTestExecuting ? "text-blue-400/80"
            : isTestDone ? "text-emerald-400/60"
            : "text-white/20"
          }`}>
            {node.type}
          </p>
          <p className={`text-[14px] font-semibold truncate ${isCompleted || isTestDone ? "text-white/80" : "text-white/90"}`}>
            {node.label}
          </p>
          {node.detail && (
            <p className="text-[12px] text-white/30 mt-0.5 truncate">{node.detail}</p>
          )}
        </div>

        <div className="shrink-0">
          {(isCompleted || isTestDone) && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/15">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
          )}
          {(isActive || isTestExecuting) && (
            <div className="relative flex h-7 w-7 items-center justify-center">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getAccentHex(node.type), boxShadow: `0 0 12px ${getAccentHex(node.type)}cc` }}
              />
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export function InteractiveCanvas({
  nodes,
  onTest,
  onDeploy,
  isDeploying,
  hasDeployed,
  isTesting,
  hasTested,
  isOpen,
  onClose,
}: InteractiveCanvasProps) {
  const reducedMotion = useReducedMotion();

  /* ── Test mode: step-by-step execution flow ── */
  const [testPhase, setTestPhase] = useState<number>(-1);
  const [logs, setLogs] = useState<{ id: string; text: string; status: "info" | "success" | "error" }[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTesting) {
      setTestPhase(0);
      const timeoutIds: NodeJS.Timeout[] = [];

      nodes.forEach((_, i) => {
        timeoutIds.push(setTimeout(() => setTestPhase(i), i * 700 + 200));
      });
      timeoutIds.push(setTimeout(() => setTestPhase(nodes.length), nodes.length * 700 + 400));

      const steps = [
        { t: "Initializing test environment...", delay: 100, status: "info" as const },
        { t: "Executing Trigger: Form Submission (Simulated)...", delay: 600, status: "success" as const },
        { t: "Processing: AI Analysis API context connected...", delay: 1200, status: "success" as const },
        { t: "Evaluating conditions...", delay: 1700, status: "info" as const },
        { t: "Action: Delivering payload to target destination...", delay: 2000, status: "success" as const },
        { t: "Test completed without errors.", delay: 2400, status: "success" as const }
      ];

      timeoutIds.push(setTimeout(() => setLogs([]), 0));
      steps.forEach((step) => {
        const id = setTimeout(() => {
          setLogs(prev => [...prev, { id: `${step.delay}-${step.t}`, text: step.t, status: step.status }]);
        }, step.delay);
        timeoutIds.push(id);
      });

      return () => { timeoutIds.forEach(clearTimeout); };
    } else {
      setTestPhase(-1);
    }
  }, [isTesting, nodes]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const [revealedNodes, setRevealedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    nodes.forEach((node, i) => {
      if (node.status !== "pending") {
        timeouts.push(setTimeout(() => {
          setRevealedNodes(prev => new Set(prev).add(node.id));
        }, reducedMotion ? 0 : i * 280));
      }
    });
    return () => timeouts.forEach(clearTimeout);
  }, [nodes, reducedMotion]);

  // Map our workflow nodes to React Flow nodes
  const rfNodes: FlowNodeType[] = useMemo(() => {
    return nodes
      .filter((n, i) => revealedNodes.has(n.id) || isTesting || hasTested || hasDeployed || n.status !== "pending")
      .map((node, index) => ({
        id: node.id,
        type: "custom",
        position: { x: 0, y: index * 120 }, // Vertical layout spacing
        data: {
          node,
          isActive: node.status === "active",
          isCompleted: node.status === "completed",
          isTestExecuting: isTesting && testPhase === index,
          isTestDone: isTesting && testPhase > index,
          reducedMotion,
        },
      }));
  }, [nodes, revealedNodes, isTesting, hasTested, hasDeployed, testPhase, reducedMotion]);

  // Generate edges between sequential nodes
  const rfEdges: FlowEdgeType[] = useMemo(() => {
    const edges: FlowEdgeType[] = [];
    for (let i = 0; i < rfNodes.length - 1; i++) {
      const source = rfNodes[i].id;
      const target = rfNodes[i + 1].id;
      const isCompleted = rfNodes[i].data.isCompleted || rfNodes[i].data.isTestDone;
      const isActive = rfNodes[i].data.isActive || rfNodes[i].data.isTestExecuting;
      
      edges.push({
        id: `e-${source}-${target}`,
        source,
        target,
        type: "smoothstep",
        animated: !!isActive,
        style: {
          stroke: isCompleted ? "rgba(52,211,153,0.5)" : isActive ? "rgba(59,130,246,0.8)" : "rgba(255,255,255,0.1)",
          strokeWidth: isCompleted || isActive ? 2 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCompleted ? "rgba(52,211,153,0.5)" : isActive ? "rgba(59,130,246,0.8)" : "rgba(255,255,255,0.1)",
        },
      });
    }
    return edges;
  }, [rfNodes]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="chat-shell-bg relative h-full flex-1 overflow-hidden border-l border-white/[0.04]"
          style={{ minWidth: 0 }}
        >
          <div className="flex h-full w-full flex-col">

            {/* Panel Header */}
            <div className="chat-header-surface flex h-[52px] shrink-0 items-center justify-between border-b px-5 z-20">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.06]">
                  <Workflow className="h-3.5 w-3.5 text-white/40" />
                </div>
                <span className="text-[13px] font-semibold text-white/55">Interactive Workflow Preview</span>
              </div>

              <div className="flex items-center gap-2">
                {hasDeployed && (
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1 shadow-[0_0_12px_rgba(52,211,153,0.08)]"
                  >
                    <div className="relative">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Live</span>
                  </motion.div>
                )}
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60"
                  aria-label="Close panel"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Interactive React Flow Graph */}
            <div className="flex-1 relative">
              <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.5}
                maxZoom={1.5}
                className="bg-transparent"
                proOptions={{ hideAttribution: true }}
              >
                <Background color="rgba(255,255,255,0.05)" gap={16} size={1} />
                <Controls showInteractive={false} className="opacity-50 hover:opacity-100 transition-opacity" />
              </ReactFlow>

              {/* ── Execution Logs Overlay ── */}
              <AnimatePresence>
                {(isTesting || hasTested) && (
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-4 left-4 right-4 z-10 chat-elevated-surface overflow-hidden rounded-2xl border shadow-2xl"
                    role="log"
                    aria-label="Execution logs"
                  >
                    <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2.5 bg-black/40 backdrop-blur-md">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] ring-1 ring-white/[0.06]">
                        <Terminal className="h-3 w-3 text-white/35" />
                      </div>
                      <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Execution Logs</span>
                      {isTesting && (
                        <div className="ml-auto flex items-center gap-1.5">
                          {!reducedMotion && <Activity className="h-3 w-3 text-accent/50 animate-pulse" />}
                          <Loader2 className="h-3 w-3 animate-spin text-accent/40" />
                        </div>
                      )}
                      {hasTested && !isTesting && (
                        <div className="ml-auto flex items-center gap-1.5 text-emerald-400/60">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">Complete</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex flex-col gap-1.5 max-h-[150px] overflow-y-auto font-mono text-[11px] custom-scrollbar bg-black/60 backdrop-blur-md">
                      {logs.length === 0 && <span className="text-white/12">Waiting for payload...</span>}
                      {logs.map((log, logIdx) => (
                        <motion.div
                          key={log.id}
                          initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-start gap-2 py-0.5"
                        >
                          <span className="text-white/10 shrink-0 mt-[1px] w-4 text-right tabular-nums">{logIdx + 1}</span>
                          <span className="text-white/15 shrink-0 mt-[1px] select-none">{"›"}</span>
                          <span className={
                            log.status === "success" ? "text-emerald-400/70" :
                            log.status === "error" ? "text-red-400/70" : "text-white/40"
                          }>
                            {log.text}
                          </span>
                        </motion.div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Panel Footer — Status + Test / Deploy */}
            <div className="chat-header-surface shrink-0 border-t border-white/[0.04] z-20">
              <div className="flex items-center gap-4 px-5 py-2.5 border-b border-white/[0.03] text-[11px]">
                <div className="flex items-center gap-1.5 text-white/25">
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    hasDeployed ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" : hasTested ? "bg-accent shadow-[0_0_4px_rgba(59,130,246,0.5)]" : "bg-white/20"
                  }`} />
                  {hasDeployed ? "Live" : hasTested ? "Tested" : isTesting ? "Testing..." : "Ready"}
                </div>
                <span className="text-white/15">·</span>
                <span className="text-white/20">{nodes.filter(n => n.status === "completed").length}/{nodes.length} steps</span>
                <span className="text-white/15">·</span>
                <span className="text-white/20">{nodes.length} nodes</span>
              </div>

              <div className="px-5 py-4 flex items-center gap-3">
                <button
                  onClick={onTest}
                  disabled={isTesting || hasTested || isDeploying || hasDeployed}
                  className="group relative flex items-center gap-2 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] px-5 py-3 text-[13px] font-semibold text-white transition-all duration-200 hover:border-white/[0.15] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-25 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
                >
                  {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-white/50" />}
                  Test
                </button>

                <button
                  onClick={onDeploy}
                  disabled={!hasTested || isDeploying || hasDeployed}
                  className={`group relative flex-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13px] font-bold transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed overflow-hidden ${
                    hasDeployed
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
                      : "bg-gradient-to-r from-accent to-blue-600 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3),0_1px_0_rgba(255,255,255,0.15)_inset] hover:shadow-[0_8px_30px_rgba(59,130,246,0.4)] hover:translate-y-[-1px] active:translate-y-[1px]"
                  }`}
                >
                  {isDeploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                  {hasDeployed ? "Deployed ✓" : "Deploy"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
