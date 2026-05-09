import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Zap, Shield, Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Get started with AutomateCraft. Learn how to describe automations, review blueprints, connect integrations, and deploy workflows.",
};

const guides = [
  {
    icon: Zap,
    title: "Getting Started",
    description: "Create your first automation in under 3 minutes. Describe what you need, review the blueprint, and deploy.",
    href: "/signup",
    cta: "Start now",
    color: "text-accent",
    bg: "bg-accent/8",
  },
  {
    icon: BookOpen,
    title: "How Blueprints Work",
    description: "Understand how AutomateCraft generates automation blueprints from plain-English descriptions. Learn about triggers, actions, and conditions.",
    href: "/why-us",
    cta: "Learn more",
    color: "text-emerald-400",
    bg: "bg-emerald-400/8",
  },
  {
    icon: Settings,
    title: "Connecting Integrations",
    description: "Set up credentials for WhatsApp, Slack, Google Sheets, and 60+ other apps. AutomateCraft detects what your workflow needs.",
    href: "/integrations",
    cta: "View integrations",
    color: "text-violet-400",
    bg: "bg-violet-400/8",
  },
  {
    icon: Shield,
    title: "Credits & Usage",
    description: "How the credit system works, what each automation costs, and how to optimize your usage across workflows.",
    href: "/how-credits-work",
    cta: "View pricing",
    color: "text-amber-400",
    bg: "bg-amber-400/8",
  },
];

const faq = [
  {
    q: "How does AutomateCraft generate automations?",
    a: "You describe what you need in plain English. Our AI analyzes your intent, identifies the required integrations, and generates a complete automation blueprint — including triggers, actions, conditions, and error handling. Every step is visible before deployment.",
  },
  {
    q: "What is n8n and why do workflows run on it?",
    a: "n8n is an open-source workflow automation runtime used by thousands of companies. We chose it because it's reliable, extensible, and gives you full visibility into execution. Your automations aren't locked into a proprietary system.",
  },
  {
    q: "Can I edit the automation after it's generated?",
    a: "Yes. Every blueprint is fully reviewable before deployment. You can modify steps, change integrations, add conditions, or request regeneration with different parameters.",
  },
  {
    q: "What happens if a step fails during execution?",
    a: "AutomateCraft includes built-in retry handling with smart backoff. Failed steps are logged with full context so you can diagnose and fix issues. You'll be notified immediately if a workflow needs attention.",
  },
  {
    q: "How do credits work?",
    a: "Each automation generation and execution consumes credits based on complexity. Simple 2-step automations use fewer credits than complex multi-branch workflows. You get 10 free credits on signup.",
  },
];

export default function DocsPage() {
  return (
    <main id="main-content" className="relative min-h-screen bg-[#09090b] pt-28 pb-20">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-accent/[0.04] blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
            Documentation
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Learn AutomateCraft
          </h1>
          <p className="mt-4 text-[16px] leading-7 text-white/35 max-w-xl mx-auto">
            Everything you need to describe, build, and deploy automations.
          </p>
        </div>

        {/* Guide cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.title}
              href={guide.href}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${guide.bg}`}>
                <guide.icon className={`h-5 w-5 ${guide.color}`} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-white/80 group-hover:text-white transition-colors">
                {guide.title}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.6] text-white/30">
                {guide.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent/70 group-hover:text-accent transition-colors">
                {guide.cta} <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-5"
              >
                <h3 className="text-[14px] font-semibold text-white/70">{item.q}</h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-white/35">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
