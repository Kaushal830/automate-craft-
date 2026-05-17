"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

/*
 * IntegrationLogoStrip — Shows only tools that are ACTUALLY listed
 * on /integrations with status: "live".
 *
 * The "+50 more" count must equal (total integrations on /integrations) - (logos shown here).
 * Currently: 60+ total - 8 shown = 50+ more. Update this if the /integrations list changes.
 */

const featuredTools = [
  { name: "WhatsApp", emoji: "💬" },
  { name: "Gmail", emoji: "📧" },
  { name: "Slack", emoji: "💼" },
  { name: "Google Sheets", emoji: "📊" },
  { name: "HubSpot", emoji: "🟠" },
  { name: "Notion", emoji: "📝" },
  { name: "Stripe", emoji: "💳" },
  { name: "Calendly", emoji: "📅" },
];

export default function IntegrationLogoStrip() {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: reduce ? 0 : 0.6 }}
      className="relative py-16 overflow-hidden"
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/20 mb-8">
          Works with your tools
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {featuredTools.map((tool) => (
            <div
              key={tool.name}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.02] px-4 py-2 text-[13px] text-white/40"
            >
              <span className="text-[14px]">{tool.emoji}</span>
              {tool.name}
            </div>
          ))}
          <Link
            href="/integrations"
            className="inline-flex items-center rounded-full border border-accent/15 bg-accent/[0.04] px-4 py-2 text-[13px] font-medium text-accent/70 transition-colors hover:bg-accent/[0.08] hover:text-accent"
          >
            + 50 more →
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
