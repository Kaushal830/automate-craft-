"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Link2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

type DetectedConnector = {
  role: "trigger" | "action" | "sync" | "alert";
  app: string;
  status: "connected" | "needs-credential" | "detected";
};

const exampleConnectors: DetectedConnector[] = [
  { role: "trigger", app: "Typeform", status: "connected" },
  { role: "action", app: "WhatsApp Business", status: "connected" },
  { role: "sync", app: "Google Sheets", status: "connected" },
  { role: "alert", app: "Slack", status: "detected" },
  { role: "sync", app: "HubSpot CRM", status: "needs-credential" },
];

const statusConfig = {
  connected: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/8", label: "Connected" },
  "needs-credential": { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/8", label: "Needs credential" },
  detected: { icon: Link2, color: "text-accent/60", bg: "bg-accent/8", label: "Detected" },
};

const roleColors = {
  trigger: "text-amber-400/60",
  action: "text-violet-400/60",
  sync: "text-accent/60",
  alert: "text-emerald-400/60",
};

export default function ConnectorIntelligence() {
  const reduce = useReducedMotion();

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/40 to-transparent" />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-[60%] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
            Integrations
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            We detect every<br className="hidden sm:block" /> integration you need
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-white/35 max-w-xl">
            Describe your workflow. AutomateCraft identifies the connectors,
            checks credential state, and maps the logic automatically.
          </p>
        </motion.div>

        {/* Connector intelligence panel */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl"
        >
          {/* Panel header */}
          <div className="rounded-t-2xl border border-b-0 border-white/[0.06] bg-[#0e0e10] px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                <Link2 className="h-3.5 w-3.5 text-accent" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white/70">Detected integrations</p>
                <p className="text-[10px] text-white/25">From: &quot;New form submission → WhatsApp + CRM sync&quot;</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/60">
              <CheckCircle2 className="h-3 w-3" />
              3/5 connected
            </div>
          </div>

          {/* Connector list */}
          <div className="rounded-b-2xl border border-white/[0.06] bg-[#0a0a0c] divide-y divide-white/[0.04]">
            {exampleConnectors.map((connector, i) => {
              const config = statusConfig[connector.status];
              const StatusIcon = config.icon;

              return (
                <motion.div
                  key={`${connector.app}-${i}`}
                  initial={{ opacity: 0, x: reduce ? 0 : -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: reduce ? 0 : 0.3,
                    delay: reduce ? 0 : 0.2 + i * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-bold uppercase tracking-[0.2em] w-14 ${roleColors[connector.role]}`}>
                      {connector.role}
                    </span>
                    <ArrowRight className="h-3 w-3 text-white/10" />
                    <span className="text-[13px] font-medium text-white/60">{connector.app}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${config.bg} ${config.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <p className="mt-6 text-center text-[12px] text-white/15">
          60+ integrations supported · Credential states checked before deployment
        </p>
      </div>
    </section>
  );
}
