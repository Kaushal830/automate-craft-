"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";

/*
 * TrustEngine — Infrastructure transparency as social proof.
 *
 * Philosophy: Naming your stack is the SaaS equivalent of ingredient
 * transparency. Every item here is independently verifiable.
 *
 * - n8n: Open-source workflow engine (github.com/n8n-io/n8n)
 * - Supabase: Open-source auth + DB (github.com/supabase/supabase)
 * - Vercel: Hosting platform (vercel.com)
 *
 * None of this requires user data. All of it builds trust.
 */

const stack = [
  {
    name: "n8n",
    role: "Workflow engine",
    description: "Open-source automation runtime that powers every workflow execution.",
    href: "https://github.com/n8n-io/n8n",
    stars: "50K+",
    color: "text-orange-400",
    bg: "bg-orange-400/8",
  },
  {
    name: "Supabase",
    role: "Auth & database",
    description: "Open-source backend for authentication, user data, and real-time sync.",
    href: "https://github.com/supabase/supabase",
    stars: "75K+",
    color: "text-emerald-400",
    bg: "bg-emerald-400/8",
  },
  {
    name: "Vercel",
    role: "Edge deployment",
    description: "Zero-downtime deployments on a global edge network.",
    href: "https://vercel.com",
    stars: null,
    color: "text-white/80",
    bg: "bg-white/[0.06]",
  },
];

const operationalFacts = [
  { label: "All systems operational", dot: "bg-emerald-400", link: "/status" },
  { label: "60+ integrations verified", dot: "bg-accent", link: "/integrations" },
  { label: "Encrypted at rest & in transit", dot: "bg-violet-400", link: "/security" },
];

export default function TrustEngine() {
  const reduce = useReducedMotion();

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">
            Open Infrastructure
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Built on tools you<br className="hidden sm:block" /> already trust
          </h2>
          <p className="mt-4 text-[1rem] leading-7 text-white/35 max-w-xl mx-auto">
            No black boxes. Every component of our stack is independently
            verifiable and backed by open-source communities.
          </p>
        </motion.div>

        {/* Stack cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {stack.map((item, i) => (
            <motion.a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: reduce ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: reduce ? 0 : 0.5,
                delay: reduce ? 0 : i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${item.bg}`}>
                  <span className={`text-[14px] font-bold ${item.color}`}>
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
              </div>

              <h3 className="mt-4 text-[16px] font-semibold text-white/80 group-hover:text-white transition-colors">
                {item.name}
              </h3>
              <p className="text-[12px] font-medium text-white/30 mt-0.5">
                {item.role}
              </p>
              <p className="mt-3 text-[13px] leading-[1.6] text-white/35">
                {item.description}
              </p>

              {item.stars && (
                <div className="mt-4 flex items-center gap-1.5 text-[11px] text-white/20">
                  <Github className="h-3 w-3" />
                  <span>{item.stars} GitHub stars</span>
                </div>
              )}
            </motion.a>
          ))}
        </div>

        {/* Operational facts strip */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          {operationalFacts.map((fact) => (
            <Link
              key={fact.label}
              href={fact.link}
              className="group flex items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.02] px-4 py-2 text-[12px] text-white/30 transition-all hover:border-white/[0.1] hover:text-white/50"
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${fact.dot}`} />
              {fact.label}
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
