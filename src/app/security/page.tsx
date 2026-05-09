import type { Metadata } from "next";
import PageIntro from "@/components/PageIntro";
import { Shield, Lock, Server, Key, FileCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Security — AutomateCraft",
  description: "How AutomateCraft protects your data, workflows, and credentials.",
};

const sections = [
  {
    icon: Lock,
    title: "Encryption",
    items: [
      "All data encrypted in transit (TLS 1.3)",
      "Database encryption at rest (AES-256)",
      "API credentials stored in encrypted vaults",
    ],
  },
  {
    icon: Server,
    title: "Infrastructure",
    items: [
      "Automations execute on isolated n8n runtime",
      "No shared state between user workflows",
      "Hosted on SOC 2–compliant cloud providers",
    ],
  },
  {
    icon: Key,
    title: "Authentication",
    items: [
      "Supabase Auth with email + password",
      "Magic link (passwordless) sign-in supported",
      "Session tokens expire automatically",
    ],
  },
  {
    icon: FileCheck,
    title: "Compliance",
    items: [
      "GDPR-aware data handling",
      "SOC 2 Type II certification planned for Q4 2026",
      "Data residency: US-East (default), EU available on request",
    ],
  },
];

export default function SecurityPage() {
  return (
    <>
      <PageIntro eyebrow="Security" title="Your data. Your workflows. Protected." description="AutomateCraft is built with security as a foundation, not an afterthought. Here's how we protect your data." />
      <section className="site-container pb-28">
        <div className="grid gap-6 sm:grid-cols-2">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10">
                    <Icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-white/80">{s.title}</h3>
                </div>
                <ul className="mt-4 space-y-2">
                  {s.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] leading-[1.6] text-white/40">
                      <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-16 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <p className="text-[14px] text-white/40">Have a security question or want to report a vulnerability?</p>
          <a href="mailto:security@automatecraft.ai" className="mt-2 inline-block text-[14px] font-semibold text-accent hover:text-blue-400 transition-colors">
            security@automatecraft.ai
          </a>
        </div>
      </section>
    </>
  );
}
