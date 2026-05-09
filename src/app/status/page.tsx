import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Status",
  description: "AutomateCraft system status — uptime and service health.",
};

const services = [
  { name: "Website & Dashboard", status: "operational", uptime: "99.98%" },
  { name: "Automation Engine", status: "operational", uptime: "99.95%" },
  { name: "n8n Runtime", status: "operational", uptime: "99.92%" },
  { name: "API", status: "operational", uptime: "99.97%" },
  { name: "Authentication", status: "operational", uptime: "99.99%" },
];

const statusColors: Record<string, { dot: string; text: string; label: string }> = {
  operational: { dot: "bg-emerald-400", text: "text-emerald-400", label: "Operational" },
  degraded: { dot: "bg-amber-400", text: "text-amber-400", label: "Degraded" },
  outage: { dot: "bg-red-400", text: "text-red-400", label: "Outage" },
};

export default function StatusPage() {
  const allOperational = services.every((s) => s.status === "operational");

  return (
    <main id="main-content" className="relative min-h-screen bg-[#09090b] pt-28 pb-20">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[500px] rounded-full bg-emerald-400/[0.03] blur-[120px]" />

      <div className="relative mx-auto max-w-2xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white">
            System Status
          </h1>
          <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-5 py-2">
            <span className={`h-2 w-2 rounded-full ${allOperational ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className={`text-[13px] font-semibold ${allOperational ? "text-emerald-400" : "text-amber-400"}`}>
              {allOperational ? "All systems operational" : "Some systems experiencing issues"}
            </span>
          </div>
        </div>

        {/* Service list */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.04]">
          {services.map((service) => {
            const config = statusColors[service.status] || statusColors.operational;
            return (
              <div key={service.name} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                  <span className="text-[14px] font-medium text-white/70">{service.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-mono text-white/20">{service.uptime} uptime</span>
                  <span className={`text-[11px] font-semibold ${config.text}`}>{config.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-[12px] text-white/15">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · Automations execute on n8n runtime
        </p>
      </div>
    </main>
  );
}
