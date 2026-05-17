import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Automate Lead Routing in 90 Seconds — AutomateCraft Blog",
  description: "Step-by-step guide to routing form leads to WhatsApp and your CRM automatically.",
};

export default function LeadRoutingPost() {
  return (
    <article className="site-container pb-28 pt-32 md:pt-36">
      <div className="mx-auto max-w-2xl">
        <Link href="/blog" className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
        </Link>
        <span className="block text-[11px] text-white/25 mb-4">May 6, 2026 · Tutorial · 3 min read</span>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">How to automate lead routing in 90 seconds</h1>
        <p className="mt-4 text-[15px] leading-8 text-white/40">Every minute a lead sits unrouted, your conversion rate drops. Here&apos;s how to wire up a Typeform → WhatsApp → HubSpot pipeline in under two minutes with AutomateCraft.</p>

        <div className="mt-10 space-y-8 text-[14px] leading-[1.85] text-white/45">
          <section>
            <h2 className="text-lg font-semibold text-white/80 mb-3">The problem</h2>
            <p>A potential customer fills out your Typeform. The submission lands in a Google Sheet you check twice a day. By the time you respond, the lead has already talked to your competitor.</p>
            <p className="mt-3">You need the lead to reach your sales team instantly — on WhatsApp — and be logged in HubSpot automatically.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/80 mb-3">The solution: one sentence</h2>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 font-mono text-[13px] text-accent/80">
              &quot;When a new lead fills my Typeform, send them a WhatsApp message and add their details to HubSpot.&quot;
            </div>
            <p className="mt-4">That&apos;s it. Type this into AutomateCraft, and it generates a 4-step automation blueprint:</p>
            <ol className="mt-3 list-decimal pl-6 space-y-2 text-white/40">
              <li><strong className="text-white/60">Trigger:</strong> Typeform new submission webhook</li>
              <li><strong className="text-white/60">Action 1:</strong> Send WhatsApp message via WhatsApp Business API</li>
              <li><strong className="text-white/60">Action 2:</strong> Create or update contact in HubSpot</li>
              <li><strong className="text-white/60">Action 3:</strong> Log the event to your activity feed</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white/80 mb-3">What you get</h2>
            <ul className="list-disc pl-6 space-y-2 text-white/40">
              <li>Instant WhatsApp notification to your sales rep</li>
              <li>Contact automatically created in HubSpot with all form fields</li>
              <li>Full execution log so you can verify every step ran</li>
              <li>24/7 execution — works at 3 AM when you&apos;re asleep</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 rounded-xl border border-accent/10 bg-accent/[0.03] p-6 text-center">
          <p className="text-[14px] text-white/50">Try this automation yourself — it takes 90 seconds.</p>
          <Link href="/signup" className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent hover:text-blue-400 transition-colors">
            Start free →
          </Link>
        </div>
      </div>
    </article>
  );
}
