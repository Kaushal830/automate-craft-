import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageCircle,
  Mail,
  FileText,
  Database,
  Bell,
  BarChart3,
  Calendar,
  CreditCard,
  Users,
  Globe,
  ShoppingCart,
  Headphones,
  Zap,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "60+ integrations supported. Connect your CRM, messaging, forms, spreadsheets, and more — AutomateCraft detects what your workflow needs.",
};

const categories = [
  {
    name: "Messaging",
    icon: MessageCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-400/8",
    integrations: [
      { name: "WhatsApp Business", status: "live" },
      { name: "Slack", status: "live" },
      { name: "Telegram", status: "live" },
      { name: "Discord", status: "live" },
      { name: "Microsoft Teams", status: "live" },
    ],
  },
  {
    name: "Email",
    icon: Mail,
    color: "text-accent",
    bg: "bg-accent/8",
    integrations: [
      { name: "Gmail", status: "live" },
      { name: "Outlook", status: "live" },
      { name: "SendGrid", status: "live" },
      { name: "Mailchimp", status: "coming" },
      { name: "Resend", status: "live" },
    ],
  },
  {
    name: "Forms & Surveys",
    icon: FileText,
    color: "text-violet-400",
    bg: "bg-violet-400/8",
    integrations: [
      { name: "Typeform", status: "live" },
      { name: "Google Forms", status: "live" },
      { name: "Tally", status: "live" },
      { name: "JotForm", status: "coming" },
    ],
  },
  {
    name: "CRM & Sales",
    icon: Users,
    color: "text-amber-400",
    bg: "bg-amber-400/8",
    integrations: [
      { name: "HubSpot", status: "live" },
      { name: "Salesforce", status: "coming" },
      { name: "Pipedrive", status: "live" },
      { name: "Zoho CRM", status: "live" },
      { name: "Close", status: "coming" },
    ],
  },
  {
    name: "Spreadsheets & Databases",
    icon: Database,
    color: "text-emerald-400",
    bg: "bg-emerald-400/8",
    integrations: [
      { name: "Google Sheets", status: "live" },
      { name: "Airtable", status: "live" },
      { name: "Notion", status: "live" },
      { name: "PostgreSQL", status: "live" },
      { name: "Supabase", status: "live" },
    ],
  },
  {
    name: "Notifications",
    icon: Bell,
    color: "text-accent",
    bg: "bg-accent/8",
    integrations: [
      { name: "Slack Webhooks", status: "live" },
      { name: "Pushover", status: "live" },
      { name: "Twilio SMS", status: "live" },
      { name: "Ntfy", status: "live" },
    ],
  },
  {
    name: "Scheduling",
    icon: Calendar,
    color: "text-violet-400",
    bg: "bg-violet-400/8",
    integrations: [
      { name: "Google Calendar", status: "live" },
      { name: "Calendly", status: "live" },
      { name: "Cal.com", status: "live" },
    ],
  },
  {
    name: "Payments",
    icon: CreditCard,
    color: "text-amber-400",
    bg: "bg-amber-400/8",
    integrations: [
      { name: "Stripe", status: "live" },
      { name: "Razorpay", status: "live" },
      { name: "PayPal", status: "coming" },
    ],
  },
  {
    name: "Analytics",
    icon: BarChart3,
    color: "text-emerald-400",
    bg: "bg-emerald-400/8",
    integrations: [
      { name: "Google Analytics", status: "live" },
      { name: "Mixpanel", status: "coming" },
      { name: "Segment", status: "coming" },
    ],
  },
  {
    name: "E-commerce",
    icon: ShoppingCart,
    color: "text-accent",
    bg: "bg-accent/8",
    integrations: [
      { name: "Shopify", status: "live" },
      { name: "WooCommerce", status: "live" },
      { name: "Gumroad", status: "coming" },
    ],
  },
  {
    name: "Support",
    icon: Headphones,
    color: "text-violet-400",
    bg: "bg-violet-400/8",
    integrations: [
      { name: "Zendesk", status: "coming" },
      { name: "Intercom", status: "coming" },
      { name: "Freshdesk", status: "coming" },
    ],
  },
  {
    name: "Custom",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-400/8",
    integrations: [
      { name: "HTTP Webhooks", status: "live" },
      { name: "REST API", status: "live" },
      { name: "GraphQL", status: "coming" },
    ],
  },
];

export default function IntegrationsPage() {
  const totalLive = categories.reduce(
    (sum, cat) => sum + cat.integrations.filter((i) => i.status === "live").length,
    0
  );

  return (
    <main id="main-content" className="relative min-h-screen bg-[#09090b] pt-28 pb-20">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-accent/[0.04] blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
            Integrations
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Connect everything<br className="hidden sm:block" /> your workflow needs
          </h1>
          <p className="mt-4 text-[16px] leading-7 text-white/35 max-w-xl mx-auto">
            {totalLive}+ integrations live. AutomateCraft detects which connectors
            your automation requires and checks credential state automatically.
          </p>
          <p className="mt-3 text-[12px] text-white/20">
            All integrations powered by n8n runtime
          </p>
        </div>

        {/* Integration grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.name}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${category.bg}`}>
                  <category.icon className={`h-4 w-4 ${category.color}`} />
                </div>
                <h3 className="text-[14px] font-semibold text-white/70 group-hover:text-white/90 transition-colors">
                  {category.name}
                </h3>
              </div>
              <div className="space-y-2">
                {category.integrations.map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between">
                    <span className="text-[13px] text-white/50">{integration.name}</span>
                    {integration.status === "live" ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
                        Live
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-white/20">Coming soon</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-[13px] text-white/25 mb-6">
            Need an integration we don&apos;t have? Custom webhooks and REST APIs are always available.
          </p>
          <Link
            href="/signup"
            className="cta-glow inline-flex h-12 items-center gap-2 rounded-full bg-accent px-8 text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_32px_rgba(59,130,246,0.35)] hover:-translate-y-0.5"
          >
            Start building for free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
