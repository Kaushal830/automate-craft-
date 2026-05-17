import type { Metadata } from "next";
import PageIntro from "@/components/PageIntro";
import Link from "next/link";
import { ArrowRight, MessageCircle, Bell, Route } from "lucide-react";

export const metadata: Metadata = {
  title: "AutomateCraft for Support Teams — Automate Escalation & Routing",
  description:
    "Escalate, route, and resolve support tickets automatically. Get WhatsApp alerts for high-priority issues.",
};

const painPoints = [
  {
    icon: Route,
    title: "Route tickets to the right team",
    description: "Automatically assign tickets by category, priority, or keyword — no manual triage needed.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Bell,
    title: "Escalate before SLA breach",
    description: "Get alerted on WhatsApp or Slack when a ticket hits high-priority or approaches its SLA deadline.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: MessageCircle,
    title: "Auto-respond to common queries",
    description: "Send instant acknowledgment messages to customers while your team reviews the issue.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
];

const useCases = [
  { title: "Support Ticket Escalation", flow: "Zendesk → WhatsApp", steps: 2 },
  { title: "SLA Breach Alert", flow: "Freshdesk → Slack → PagerDuty", steps: 3 },
  { title: "Customer Satisfaction Follow-up", flow: "Zendesk → Gmail", steps: 2 },
];

export default function SupportPage() {
  return (
    <>
      <PageIntro eyebrow="For Support Teams" title="Escalate, route, and resolve — automatically" description="Stop manually triaging tickets. AutomateCraft routes, escalates, and notifies so your team can focus on solving problems." />
      <section className="site-container pb-28">
        <div className="grid gap-5 sm:grid-cols-3">
          {painPoints.map((pp) => {
            const Icon = pp.icon;
            return (
              <div key={pp.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${pp.bg}`}>
                  <Icon className={`h-5 w-5 ${pp.color}`} />
                </div>
                <h3 className="mt-5 text-[16px] font-semibold text-white/80">{pp.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-white/35">{pp.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Popular support automations</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {useCases.map((uc) => (
              <div key={uc.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-[14px] font-semibold text-white/70">{uc.title}</h3>
                <p className="mt-1 text-[12px] font-mono text-white/25">{uc.flow}</p>
                <span className="mt-3 block text-[11px] text-white/20">{uc.steps} steps</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link href="/signup" className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-accent to-blue-600 px-7 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:translate-y-[-1px]">
            Automate your support <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
