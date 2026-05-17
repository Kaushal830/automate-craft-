"use client";

import { CheckCircle2, XCircle, MinusCircle, ArrowRight, Sparkles, LayoutGrid, ClipboardList, Inbox, BellRing, BarChart3, CalendarClock } from "lucide-react";
import Link from "next/link";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";
import { motion } from "framer-motion";

/* ─── Use Case Data ─── */
const useCases = [
  {
    icon: Inbox,
    color: "text-blue-400",
    bg: "bg-blue-500/8 ring-blue-500/15",
    title: "Lead Capture → CRM",
    desc: "Form fills auto-create CRM contacts and trigger welcome emails.",
  },
  {
    icon: BellRing,
    color: "text-amber-400",
    bg: "bg-amber-500/8 ring-amber-500/15",
    title: "Alert on Urgent Tickets",
    desc: "Slack/WhatsApp alerts when support tickets are marked high-priority.",
  },
  {
    icon: BarChart3,
    color: "text-emerald-400",
    bg: "bg-emerald-500/8 ring-emerald-500/15",
    title: "Data Sync to Sheets",
    desc: "New orders or signups logged to Google Sheets in real-time.",
  },
  {
    icon: CalendarClock,
    color: "text-violet-400",
    bg: "bg-violet-500/8 ring-violet-500/15",
    title: "Scheduled Follow-ups",
    desc: "Automatic email sequences triggered by user inactivity.",
  },
];

/* ─── Comparison Data ─── */
type Check = "yes" | "no" | "partial";
const comparisonRows: { feature: string; us: Check; zapier: Check; make: Check; manual: Check }[] = [
  { feature: "AI-powered builder (no code)", us: "yes", zapier: "no", make: "no", manual: "no" },
  { feature: "Plain English prompts", us: "yes", zapier: "no", make: "no", manual: "no" },
  { feature: "Setup in under 3 minutes", us: "yes", zapier: "partial", make: "no", manual: "no" },
  { feature: "Visual workflow preview", us: "yes", zapier: "yes", make: "yes", manual: "no" },
  { feature: "Execution logs per step", us: "yes", zapier: "partial", make: "yes", manual: "no" },
  { feature: "Credit-based pricing (no per-task fee)", us: "yes", zapier: "no", make: "partial", manual: "yes" },
  { feature: "Built-in form generation", us: "yes", zapier: "no", make: "no", manual: "no" },
  { feature: "WhatsApp integration", us: "yes", zapier: "partial", make: "yes", manual: "partial" },
];

function CheckIcon({ status }: { status: Check }) {
  if (status === "yes") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "partial") return <MinusCircle className="h-4 w-4 text-amber-400/60" />;
  return <XCircle className="h-4 w-4 text-white/15" />;
}

export default function WhyUsPage() {
  return (
    <main className="min-h-screen">
      <PageIntro
        eyebrow="Why Us"
        title="Automation should feel operational, not experimental."
        description="AutomateCraft is built for teams that want AI workflows to be understandable, manageable, and dependable from the start."
      />

      {/* ── Problem → Solution ── */}
      <section className="section-space section-muted pt-0">
        <div className="site-container grid gap-6 md:grid-cols-2">
          <Reveal>
            <article className="card-glass rounded-[24px] p-8 h-full border-red-500/[0.06]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/8 ring-1 ring-red-500/15 mb-5">
                <XCircle className="h-5 w-5 text-red-400/70" />
              </div>
              <h3 className="text-lg font-semibold text-white/80 mb-3">The problem</h3>
              <p className="text-[15px] leading-7 text-white/40">
                Manual repetitive work slows teams down. Copy-pasting data between apps, sending follow-up messages by hand, and checking spreadsheets for updates — it wastes hours every week and leads to inconsistent results.
              </p>
            </article>
          </Reveal>
          <Reveal delay={0.08}>
            <article className="card-glass rounded-[24px] p-8 h-full border-emerald-500/[0.06]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/8 ring-1 ring-emerald-500/15 mb-5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400/70" />
              </div>
              <h3 className="text-lg font-semibold text-white/80 mb-3">Our solution</h3>
              <p className="text-[15px] leading-7 text-white/40">
                Describe what you need in plain English. AutomateCraft&apos;s AI builds the entire workflow — triggers, actions, connections — in under 3 minutes. You review, test, and deploy. No code, no drag-and-drop complexity.
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="section-space">
        <div className="site-container">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Comparison
              </span>
              <h2 className="mt-6 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[2.8rem]">
                Other tools make you build automations.<br className="hidden sm:block" />
                We build them for you.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-white/35">
                Describe what you need in one sentence. AutomateCraft generates the full workflow &mdash; triggers, actions, integrations &mdash; in under 3 minutes. No drag-and-drop. No flowcharts.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="py-4 pl-6 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-white/30">Feature</th>
                    <th className="px-4 py-4 text-center">
                      <span className="text-[12px] font-bold text-accent">AutomateCraft</span>
                    </th>
                    <th className="px-4 py-4 text-center text-[12px] font-semibold text-white/30">Zapier</th>
                    <th className="px-4 py-4 text-center text-[12px] font-semibold text-white/30">Make</th>
                    <th className="px-4 py-4 pr-6 text-center text-[12px] font-semibold text-white/30">Manual</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-white/[0.03] ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"} hover:bg-white/[0.02] transition-colors`}>
                      <td className="py-3.5 pl-6 pr-4 text-[13px] text-white/60">{row.feature}</td>
                      <td className="px-4 py-3.5 text-center"><div className="flex justify-center"><CheckIcon status={row.us} /></div></td>
                      <td className="px-4 py-3.5 text-center"><div className="flex justify-center"><CheckIcon status={row.zapier} /></div></td>
                      <td className="px-4 py-3.5 text-center"><div className="flex justify-center"><CheckIcon status={row.make} /></div></td>
                      <td className="px-4 py-3.5 pr-6 text-center"><div className="flex justify-center"><CheckIcon status={row.manual} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section className="section-space section-muted">
        <div className="site-container">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Use Cases
              </span>
              <h2 className="mt-6 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[2.8rem]">
                Built for real workflows.
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((uc, i) => (
              <Reveal key={uc.title} delay={i * 0.06}>
                <article className="card-glass rounded-2xl p-6 h-full group hover:border-white/[0.1] transition-all duration-300">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${uc.bg} ring-1 mb-4`}>
                    <uc.icon className={`h-5 w-5 ${uc.color}`} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-white/80 group-hover:text-white transition-colors">{uc.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-white/35">{uc.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Capabilities ── */}
      <section className="section-space">
        <div className="site-container">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Core Capabilities
              </span>
              <h2 className="mt-6 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[2.8rem]">
                Built for teams that automate daily.
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Conversational AI Builder",
                description: "Type what you want in plain English. Our AI translates it into a production-ready workflow in seconds — no drag-and-drop complexity.",
                icon: Sparkles,
              },
              {
                title: "Live Workflow Preview",
                description: "See every step before you deploy. The slide-in panel lets you review triggers, actions, and parameters — then test with one click.",
                icon: LayoutGrid,
              },
              {
                title: "Step-by-Step Execution Logs",
                description: "Never guess why something failed. Every run is logged with clear status markers, input/output data, and timing for rapid debugging.",
                icon: ClipboardList,
              },
            ].map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.1}>
                <article className="card-glass rounded-[2rem] p-8 h-full relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-white/[0.03] ring-1 ring-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.4)] mb-6 group-hover:ring-accent/20 group-hover:bg-accent/5 transition-all duration-300">
                    <feature.icon className="h-6 w-6 text-white/40 group-hover:text-accent transition-colors duration-300" />
                  </div>
                  <h3 className="text-[1.2rem] font-bold tracking-tight text-white/90 mb-3 group-hover:text-white transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/40 group-hover:text-white/50 transition-colors duration-300">
                    {feature.description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-space pb-32">
        <div className="site-container">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Your first automation takes 90 seconds.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-white/35">
                Start building automations in plain English. No credit card required.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-8 text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_32px_rgba(59,130,246,0.35)] hover:-translate-y-0.5"
                >
                  Get started free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-8 text-[15px] font-medium text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
