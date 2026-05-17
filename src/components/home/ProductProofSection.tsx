import { ArrowRight, CheckCircle2, Clock3, MessageSquare, Workflow } from "lucide-react";

const proofSteps = [
  {
    label: "Trigger",
    value: "New Google Form response",
  },
  {
    label: "Process",
    value: "AI formats lead details",
  },
  {
    label: "Notify",
    value: "Send WhatsApp + CRM update",
  },
];

export default function ProductProofSection() {
  return (
    <section className="relative border-t border-white/[0.04] bg-[#09090b] px-5 py-20 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent/80">
            <Clock3 className="h-3.5 w-3.5" />
            Product proof
          </div>
          <h2 className="max-w-xl text-[2rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[2.8rem]">
            Example automation generated in 20 seconds.
          </h2>
          <p className="mt-5 max-w-lg text-[0.98rem] leading-7 text-white/45">
            A user describes the workflow once. AutomateCraft turns it into a
            clear trigger, a processing step, required integrations, and a
            ready-to-test automation preview.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/[0.07] bg-[#101114] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-5">
          <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">
                  Prompt
                </p>
                <p className="mt-1 text-sm leading-6 text-white/75">
                  When someone fills my Google Form, send the details to
                  WhatsApp and create a CRM follow-up.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {proofSteps.map((step, index) => (
              <div key={step.label} className="relative rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                    {step.label}
                  </span>
                  {index < proofSteps.length - 1 ? (
                    <ArrowRight className="hidden h-3.5 w-3.5 text-white/18 sm:block" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300/70" />
                  )}
                </div>
                <p className="mt-5 min-h-10 text-sm font-semibold leading-5 text-white/80">
                  {step.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/15">
                <Workflow className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white/85">Ready to test</p>
                <p className="text-xs text-white/35">3 steps · 2 integrations · 5 credits</p>
              </div>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/45">
              Preview only
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
