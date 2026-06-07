"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  Play,
  Rocket,
  X,
  Zap,
} from "lucide-react";

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

/* ── Mock run history (connected to real node data) ── */
function generateRunsFromNodes(nodes: FlowNode[]) {
  const trigger = nodes.find((n) => n.type === "trigger")?.label ?? "Trigger";
  const action = nodes.find((n) => n.type === "action")?.label ?? "Action";
  return [
    { id: "r1", status: "ok" as const, title: `${trigger} → ${action}`, sub: "workflow.run", time: "Just now", dur: "412ms" },
  ];
}

/* ── Flow Tab — card-based workflow nodes ── */
function FlowTab({
  nodes,
  chatTitle,
  isTesting,
  hasTested,
}: {
  nodes: FlowNode[];
  chatTitle: string;
  isTesting: boolean;
  hasTested: boolean;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="cc-panel-body cc-panel-body--center">
      {/* Project header */}
      <div className="cc-wf-header">
        <div className="cc-wf-header__icon">
          <Zap className="h-7 w-7" />
        </div>
        <div className="cc-wf-header__title">{chatTitle}</div>
        <div className="cc-wf-header__sub">
          {nodes.length > 0
            ? `${nodes.length}-step workflow · ${nodes.filter((n) => n.status === "completed").length} completed`
            : "Workflow preview"}
        </div>
      </div>

      {/* Workflow nodes */}
      <div className="cc-wf-canvas">
        {nodes.map((node, i) => {
          const isActive = node.status === "active" || (isTesting && node.status !== "completed");
          const isCompleted = node.status === "completed" || (hasTested);

          return (
            <React.Fragment key={node.id}>
              <motion.div
                className="cc-wf-node cc-glow-card"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.2 }}
              >
                <div className="cc-wf-node__top">
                  {/* Node icon */}
                  <div className={`cc-wf-node__icon cc-wf-node__icon--${node.type}`}>
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  {/* Node info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cc-wf-node__kind">{node.type}</div>
                    <div className="cc-wf-node__title">{node.label}</div>
                    {node.detail && <div className="cc-wf-node__sub">{node.detail}</div>}
                  </div>
                  {/* Status indicator */}
                  <div className={`cc-wf-node__status cc-wf-node__status--${isCompleted ? "ok" : isActive ? "wip" : "pending"}`}>
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : isActive ? (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "block", opacity: 0.7 }} />
                    ) : null}
                  </div>
                </div>
              </motion.div>

              {/* Edge connector */}
              {i < nodes.length - 1 && (
                <div className="cc-wf-edge">
                  <div className="cc-wf-edge__line" />
                  <div className="cc-wf-edge__dot" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ── Runs Tab — execution history ── */
function RunsTab({ runs }: { runs: ReturnType<typeof generateRunsFromNodes> }) {
  const okCount = runs.filter((r) => r.status === "ok").length;
  const successRate = runs.length > 0 ? Math.round((okCount / runs.length) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Stats */}
      <div className="cc-runs-stats">
        <div>
          <div className="cc-rstat__k">Runs</div>
          <div className="cc-rstat__v">{runs.length}</div>
        </div>
        <div>
          <div className="cc-rstat__k">Success</div>
          <div className="cc-rstat__v" style={{ color: "#4ade80" }}>{successRate}%</div>
        </div>
        <div>
          <div className="cc-rstat__k">Errors</div>
          <div className="cc-rstat__v">{runs.filter((r) => r.status !== "ok").length}</div>
        </div>
      </div>

      {/* Run rows */}
      <div className="cc-runs-list">
        {runs.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--cc-text-3)", fontSize: 13 }}>
            No runs yet. Test your workflow to see execution history.
          </div>
        ) : (
          runs.map((r) => (
            <div key={r.id} className="cc-run-row">
              <span className={`cc-run-row__dot cc-run-row__dot--${r.status}`} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="cc-run-row__title">{r.title}</div>
                <div className="cc-run-row__sub">{r.sub}</div>
              </div>
              <span className="cc-run-row__time">{r.time}</span>
              <span className="cc-run-row__dur">{r.dur}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<"flow" | "preview" | "runs">("flow");

  const triggerNode = nodes.find((n) => n.type === "trigger");
  const actionNode = nodes.find((n) => n.type === "action");
  const completedCount = nodes.filter((n) => n.status === "completed").length;
  const chatTitle = triggerNode && actionNode
    ? `${triggerNode.label.split(" ")[0]} → ${actionNode.label.split(" ")[0]}`
    : "Workflow Preview";

  const runs = useMemo(() => {
    if (hasTested) return generateRunsFromNodes(nodes);
    return [];
  }, [hasTested, nodes]);

  if (!isOpen) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Panel header */}
      <div className="cc-panel__hd">
        <span className="cc-panel__title">Workflow Preview</span>
        <button
          onClick={onClose}
          className="cc-panel__close"
          aria-label="Close panel"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <nav className="cc-ptabs">
        <button
          className={`cc-ptab${activeTab === "flow" ? " is-active" : ""}`}
          onClick={() => setActiveTab("flow")}
          type="button"
        >
          Flow
        </button>
        <button
          className={`cc-ptab${activeTab === "preview" ? " is-active" : ""}`}
          onClick={() => setActiveTab("preview")}
          type="button"
        >
          Preview
        </button>
        <button
          className={`cc-ptab${activeTab === "runs" ? " is-active" : ""}`}
          onClick={() => setActiveTab("runs")}
          type="button"
        >
          Runs
          {runs.length > 0 && (
            <span className="cc-ptab__count">{runs.length}</span>
          )}
        </button>
      </nav>

      {/* Tab content */}
      <div className="cc-ptab-content" key={activeTab}>
        {activeTab === "flow" && (
          <FlowTab
            nodes={nodes}
            chatTitle={chatTitle}
            isTesting={isTesting}
            hasTested={hasTested}
          />
        )}
        {activeTab === "preview" && (
          <div className="cc-panel-body cc-panel-body--center">
            <div style={{ textAlign: "center", color: "var(--cc-text-2)", fontSize: 13 }}>
              <div className="cc-wf-header__icon" style={{ margin: "0 auto 14px" }}>
                <Zap className="h-6 w-6" />
              </div>
              <div style={{ fontWeight: 500, color: "var(--cc-text-0)", fontSize: 15, marginBottom: 6 }}>
                Live Preview
              </div>
              <p style={{ maxWidth: 260, margin: "0 auto" }}>
                {hasTested
                  ? "Your workflow is tested and ready. Deploy to see live output."
                  : "Run a test to see a live preview of your workflow output."}
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
                <button
                  onClick={onTest}
                  disabled={isTesting || hasTested}
                  className="cc-action-btn"
                  type="button"
                >
                  {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  {isTesting ? "Testing…" : "Run test"}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "runs" && <RunsTab runs={runs} />}
      </div>

      {/* Bottom action bar */}
      <div className="cc-panel-footer">
        {/* Status info */}
        <div className="cc-panel-footer__info">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: hasDeployed
                ? "#4ade80"
                : hasTested
                  ? "var(--cc-accent)"
                  : isTesting
                    ? "#fbbf24"
                    : "var(--cc-text-3)",
              boxShadow: hasDeployed
                ? "0 0 4px rgba(74,222,128,0.5)"
                : hasTested
                  ? "0 0 4px rgba(60,131,246,0.5)"
                  : undefined,
            }}
          />
          <span>
            {hasDeployed ? "Live" : hasTested ? "Tested" : isTesting ? "Testing…" : "Ready"}
          </span>
          <span style={{ color: "var(--cc-border)" }}>·</span>
          <span>{completedCount}/{nodes.length} steps</span>
        </div>

        {/* Action buttons */}
        <div className="cc-panel-footer__actions">
          <button
            onClick={onTest}
            disabled={isTesting || hasTested || isDeploying || hasDeployed}
            className="cc-action-btn"
            type="button"
          >
            {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Test
          </button>

          <button
            onClick={onDeploy}
            disabled={!hasTested || isDeploying || hasDeployed}
            className={`cc-action-btn ${hasTested && !hasDeployed ? "cc-action-btn--primary" : ""} ${hasDeployed ? "cc-action-btn--success" : ""}`}
            type="button"
          >
            {isDeploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
            {hasDeployed ? "Deployed" : "Deploy"}
          </button>
        </div>
      </div>

      {/* Building status pill */}
      {(isTesting || isDeploying) && (
        <div className="cc-panel-status-wrap">
          <div className="cc-panel-status">
            <span className="cc-spinner" />
            {isTesting ? "Running test…" : "Deploying workflow…"}
          </div>
        </div>
      )}
    </div>
  );
}
