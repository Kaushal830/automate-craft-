import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "5 Automations Every Startup Should Set Up on Day One — AutomateCraft Blog",
  description: "Invoice sync, lead routing, welcome emails, Slack alerts, and weekly reports — set up in under 15 minutes total.",
};

const automations = [
  { num: "01", title: "Lead routing", flow: "Typeform → WhatsApp → HubSpot", why: "Leads go cold in minutes. Route them instantly." },
  { num: "02", title: "Invoice sync", flow: "Stripe → Google Sheets → Slack", why: "Stop manually tracking revenue. Every invoice, auto-logged." },
  { num: "03", title: "Customer welcome email", flow: "Stripe → Gmail", why: "First impressions matter. Send a personalized welcome the moment they pay." },
  { num: "04", title: "Slack alerts for signups", flow: "Supabase → Slack", why: "Know the moment a new user signs up. Celebrate or follow up." },
  { num: "05", title: "Weekly summary report", flow: "Google Sheets → Gmail", why: "Every Monday at 9 AM, your team gets a clean summary. No manual work." },
];

export default function FiveAutomationsPost() {
  return (
    <article className="site-container pb-28 pt-32 md:pt-36">
      <div className="mx-auto max-w-2xl">
        <Link href="/blog" className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
        </Link>
        <span className="block text-[11px] text-white/25 mb-4">May 2, 2026 · Guide · 4 min read</span>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">5 automations every startup should set up on day one</h1>
        <p className="mt-4 text-[15px] leading-8 text-white/40">You just launched. You&apos;re juggling product, sales, and ops. These five automations take 15 minutes total to set up — and save you hours every week.</p>

        <div className="mt-10 space-y-6">
          {automations.map((a) => (
            <div key={a.num} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-baseline gap-3">
                <span className="text-[12px] font-mono font-bold text-accent/50">{a.num}</span>
                <h2 className="text-[16px] font-semibold text-white/80">{a.title}</h2>
              </div>
              <p className="mt-2 text-[13px] font-mono text-white/25">{a.flow}</p>
              <p className="mt-2 text-[13px] leading-[1.6] text-white/40">{a.why}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-accent/10 bg-accent/[0.03] p-6 text-center">
          <p className="text-[14px] text-white/50">All five templates are available in AutomateCraft.</p>
          <Link href="/templates" className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent hover:text-blue-400 transition-colors">
            Browse templates →
          </Link>
        </div>
      </div>
    </article>
  );
}
