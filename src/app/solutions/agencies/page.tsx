import type { Metadata } from "next";
import PageIntro from "@/components/PageIntro";
import Link from "next/link";
import { ArrowRight, Building2, Users, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "AutomateCraft for Agencies — Build Automations for Clients",
  description:
    "Deliver automation workflows for your clients in minutes, not weeks.",
};

const valueProps = [
  {
    icon: Building2,
    title: "Build automations for every client",
    description: "Each client gets their own workspace. Describe their workflow, generate the blueprint, and deploy — all without touching code.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: Users,
    title: "Hand off with confidence",
    description: "Every automation comes with a clear blueprint showing triggers, steps, and outcomes. Clients see exactly what runs.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Layers,
    title: "Scale without hiring",
    description: "You used to need an engineer for every custom integration. Now you describe it in English and AutomateCraft builds it.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
];

export default function AgenciesPage() {
  return (
    <>
      <PageIntro eyebrow="For Agencies" title="Build automations for clients in minutes" description="Deliver workflow automation as a service. Describe what the client needs, review the blueprint, and deploy." />
      <section className="site-container pb-28">
        <div className="grid gap-5 sm:grid-cols-3">
          {valueProps.map((vp) => {
            const Icon = vp.icon;
            return (
              <div key={vp.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${vp.bg}`}>
                  <Icon className={`h-5 w-5 ${vp.color}`} />
                </div>
                <h3 className="mt-5 text-[16px] font-semibold text-white/80">{vp.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-white/35">{vp.description}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-16 text-center">
          <Link href="/signup" className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-accent to-blue-600 px-7 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:translate-y-[-1px]">
            Start building for clients <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
