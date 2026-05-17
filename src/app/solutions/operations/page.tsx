import type { Metadata } from "next";
import PageIntro from "@/components/PageIntro";
import Link from "next/link";
import { ArrowRight, Repeat, FileSpreadsheet, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "AutomateCraft for Operations Teams — Automate Manual Workflows",
  description:
    "Replace spreadsheet copy-paste, manual data entry, and report generation with reliable automations that run 24/7.",
};

const painPoints = [
  {
    icon: Repeat,
    title: "You repeat the same task daily",
    description:
      "Exporting data, formatting reports, sending updates — it's the same process every time. Describe it once and let it run.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: FileSpreadsheet,
    title: "Data lives in 6 different sheets",
    description:
      "When Stripe data needs to reach Google Sheets, Notion, and an email report, manual sync breaks within a week. AutomateCraft keeps them in sync.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: AlertTriangle,
    title: "Things break silently",
    description:
      "A missed invoice, an unrouted ticket, an unfollowed lead — you don't know until it's too late. Automations have built-in error handling and alerts.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
];

const useCases = [
  { title: "Weekly Report Generator", flow: "Google Sheets → Gmail", steps: 2 },
  { title: "Invoice Sync", flow: "Stripe → Sheets → Slack", steps: 3 },
  { title: "E-commerce Order Notify", flow: "Shopify → WhatsApp → Sheets", steps: 3 },
  { title: "New Customer Onboarding", flow: "Stripe → Gmail → Notion", steps: 4 },
];

export default function OperationsPage() {
  return (
    <>
      <PageIntro
        eyebrow="For Operations Teams"
        title="Replace manual workflows with reliable automation"
        description="Stop copy-pasting between tabs. Describe the workflow, review the blueprint, and let AutomateCraft handle the execution."
      />

      <section className="site-container pb-28">
        <div className="grid gap-5 sm:grid-cols-3">
          {painPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${point.bg}`}>
                  <Icon className={`h-5 w-5 ${point.color}`} />
                </div>
                <h3 className="mt-5 text-[16px] font-semibold text-white/80">{point.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-white/35">{point.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Common ops automations</h2>
          <p className="mt-2 text-[14px] text-white/35">Each takes under 3 minutes to set up.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {useCases.map((uc) => (
              <div key={uc.title} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-white/70">{uc.title}</h3>
                  <p className="mt-1 text-[12px] font-mono text-white/25">{uc.flow}</p>
                </div>
                <span className="text-[11px] text-white/20 shrink-0 ml-4">{uc.steps} steps</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/signup"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-accent to-blue-600 px-7 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:translate-y-[-1px]"
          >
            Start automating
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
