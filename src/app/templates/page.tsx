import type { Metadata } from "next";
import PageIntro from "@/components/PageIntro";
import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  FileText,
  HeadphonesIcon,
  Calendar,
  CreditCard,
  BarChart3,
  ShoppingCart,
  Users,
  PenTool,
  Bug,
  Receipt,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Automation Templates — AutomateCraft",
  description:
    "Start from a proven workflow. Browse 12+ pre-built automation templates for sales, support, operations, and more.",
};

const categories = [
  { label: "All", value: "all" },
  { label: "Sales", value: "sales" },
  { label: "Support", value: "support" },
  { label: "Operations", value: "ops" },
  { label: "Finance", value: "finance" },
  { label: "Marketing", value: "marketing" },
  { label: "HR", value: "hr" },
];

const templates = [
  {
    icon: MessageCircle,
    title: "Lead Routing Pipeline",
    description: "Route new form submissions to WhatsApp and your CRM instantly.",
    integrations: ["Typeform", "WhatsApp", "HubSpot"],
    steps: 4,
    category: "sales",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: CreditCard,
    title: "Invoice Sync",
    description: "Save new Stripe invoices to Sheets and notify your team on Slack.",
    integrations: ["Stripe", "Google Sheets", "Slack"],
    steps: 3,
    category: "finance",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: HeadphonesIcon,
    title: "Support Ticket Escalation",
    description: "Alert you on WhatsApp when a ticket is marked high-priority.",
    integrations: ["Zendesk", "WhatsApp"],
    steps: 2,
    category: "support",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: Calendar,
    title: "Meeting Follow-up",
    description: "Send a follow-up email after every Calendly meeting, log it in CRM.",
    integrations: ["Calendly", "Gmail", "HubSpot"],
    steps: 3,
    category: "sales",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Users,
    title: "New Customer Onboarding",
    description: "Welcome new Stripe customers with an email and Notion checklist.",
    integrations: ["Stripe", "Gmail", "Notion"],
    steps: 4,
    category: "ops",
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
  {
    icon: BarChart3,
    title: "Social Mention Alert",
    description: "Get a Slack ping when your brand is mentioned on Twitter.",
    integrations: ["Twitter API", "Slack"],
    steps: 2,
    category: "marketing",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    icon: FileText,
    title: "Weekly Report Generator",
    description: "Compile Google Sheets data and email a summary every Monday.",
    integrations: ["Google Sheets", "Gmail"],
    steps: 2,
    category: "ops",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    icon: ShoppingCart,
    title: "E-commerce Order Notify",
    description: "Send a WhatsApp confirmation and log orders to Sheets.",
    integrations: ["Shopify", "WhatsApp", "Sheets"],
    steps: 3,
    category: "ops",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    icon: Users,
    title: "HR Leave Request",
    description: "Route leave requests from Google Forms to Slack for approval.",
    integrations: ["Google Forms", "Slack", "Sheets"],
    steps: 3,
    category: "hr",
    color: "text-lime-400",
    bg: "bg-lime-400/10",
  },
  {
    icon: PenTool,
    title: "Content Publish Pipeline",
    description: "Publish from Notion to WordPress and announce in Slack.",
    integrations: ["Notion", "WordPress", "Slack"],
    steps: 3,
    category: "marketing",
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-400/10",
  },
  {
    icon: Bug,
    title: "Bug Report Router",
    description: "Triage GitHub issues to Slack channels and create Jira tickets.",
    integrations: ["GitHub", "Slack", "Jira"],
    steps: 3,
    category: "ops",
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  {
    icon: Receipt,
    title: "Client Invoice Reminder",
    description: "Automatically email clients when a Stripe invoice is overdue.",
    integrations: ["Stripe", "Gmail"],
    steps: 2,
    category: "finance",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
];

export default function TemplatesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Templates"
        title="Start from a proven workflow"
        description="Browse pre-built automation templates. Pick one, customize it with your apps, and deploy in under 3 minutes."
      />

      <section className="site-container pb-28">
        {/* Category filter bar */}
        <div className="mb-10 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat.value}
              className={`inline-flex h-8 cursor-default items-center rounded-full px-4 text-[12px] font-semibold transition-colors ${
                cat.value === "all"
                  ? "bg-accent/15 text-accent"
                  : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/60"
              }`}
            >
              {cat.label}
            </span>
          ))}
        </div>

        {/* Template grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <div
                key={template.title}
                className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between">
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${template.bg}`}>
                    <Icon className={`h-4 w-4 ${template.color}`} />
                  </div>
                  <span className="text-[10px] font-mono text-white/20">
                    {template.steps} steps
                  </span>
                </div>

                <h3 className="mt-4 text-[15px] font-semibold text-white/80 group-hover:text-white transition-colors">
                  {template.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-[1.6] text-white/35 group-hover:text-white/45 transition-colors">
                  {template.description}
                </p>

                {/* Integration badges */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {template.integrations.map((app) => (
                    <span
                      key={app}
                      className="inline-flex h-6 items-center rounded-md bg-white/[0.04] px-2 text-[10px] font-semibold text-white/30"
                    >
                      {app}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-5">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent/70 transition-colors group-hover:text-accent"
                  >
                    Use this template
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-[15px] text-white/35">
            Don&apos;t see what you need?
          </p>
          <Link
            href="/signup"
            className="mt-3 inline-flex items-center gap-2 text-[15px] font-semibold text-accent transition-colors hover:text-blue-400"
          >
            Describe it and we&apos;ll build it
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
