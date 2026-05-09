import type { Metadata } from "next";
import PageIntro from "@/components/PageIntro";
import Link from "next/link";
import { ArrowRight, Zap, Clock, DollarSign } from "lucide-react";

export const metadata: Metadata = {
  title: "AutomateCraft for Startups — Ship Faster, Automate the Rest",
  description:
    "Stop wasting dev hours on manual workflows. AutomateCraft lets startups automate lead routing, invoice sync, and customer onboarding in minutes.",
};

const painPoints = [
  {
    icon: Zap,
    title: "You're juggling 12 tools",
    description:
      "Typeform, Slack, Sheets, HubSpot, Stripe — you need them connected, not siloed. AutomateCraft maps your integrations automatically.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: Clock,
    title: "Manual processes drain your hours",
    description:
      "Every lead that sits unrouted, every invoice that waits for a copy-paste — it costs you time you don't have. Automate it once, run it forever.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: DollarSign,
    title: "You can't afford a full ops team",
    description:
      "Hiring an operations engineer costs $120K/year. AutomateCraft gives you an ops layer for the price of a SaaS subscription.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
];

const starterTemplates = [
  {
    title: "Lead Routing Pipeline",
    flow: "Typeform → WhatsApp → HubSpot",
    steps: 4,
  },
  {
    title: "Invoice Sync",
    flow: "Stripe → Google Sheets → Slack",
    steps: 3,
  },
  {
    title: "Customer Onboarding",
    flow: "Stripe → Gmail → Notion",
    steps: 4,
  },
];

export default function StartupsPage() {
  return (
    <>
      <PageIntro
        eyebrow="For Startups"
        title="Ship faster. Automate the boring parts."
        description="You're building a product, not copy-pasting data between tabs. Describe what needs to happen, and AutomateCraft wires it up."
      />

      <section className="site-container pb-20">
        {/* Pain points */}
        <div className="grid gap-5 sm:grid-cols-3">
          {painPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${point.bg}`}>
                  <Icon className={`h-5 w-5 ${point.color}`} />
                </div>
                <h3 className="mt-5 text-[16px] font-semibold text-white/80">
                  {point.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-white/35">
                  {point.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Three steps. That&apos;s it.
          </h2>
          <p className="mt-2 text-[14px] text-white/35">
            No code, no config files, no YAML.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { step: "01", title: "Describe", desc: "\"When a new lead fills my Typeform, send them a WhatsApp message and add to HubSpot.\"" },
              { step: "02", title: "Review", desc: "AutomateCraft generates a blueprint. You see every trigger, action, and condition before anything runs." },
              { step: "03", title: "Deploy", desc: "One click. Your automation runs 24/7 on n8n infrastructure. You get notified when it fires." },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <span className="text-[11px] font-mono font-bold text-accent/50">{item.step}</span>
                <h3 className="mt-2 text-[15px] font-semibold text-white/70">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.6] text-white/30">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Starter templates */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Popular templates for startups
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {starterTemplates.map((t) => (
              <div
                key={t.title}
                className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
              >
                <h3 className="text-[15px] font-semibold text-white/70">{t.title}</h3>
                <p className="mt-2 text-[12px] font-mono text-white/25">{t.flow}</p>
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <span className="text-[11px] text-white/20">{t.steps} steps</span>
                  <Link href="/signup" className="text-[12px] font-semibold text-accent/70 hover:text-accent transition-colors">
                    Use template →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing callout */}
        <div className="mt-20 rounded-xl border border-accent/10 bg-accent/[0.03] p-8 text-center">
          <h3 className="text-xl font-semibold text-white">Start free. No credit card.</h3>
          <p className="mt-2 text-[14px] text-white/40">
            10 free credits on signup. Build your first automation in under 3 minutes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-accent to-blue-600 px-7 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:translate-y-[-1px]"
            >
              Start building
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center rounded-full border border-white/[0.08] px-7 text-[14px] font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white/80"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
