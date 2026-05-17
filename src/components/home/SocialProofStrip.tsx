"use client";

import { motion, useReducedMotion } from "framer-motion";

/*
 * SocialProofStrip — Only metrics we can PROVE.
 *
 * Rules:
 * - "60+ integrations" → counted from /integrations page (verifiable)
 * - "< 3 min build time" → product design fact (the flow literally takes < 3 min)
 * - "24/7 execution" → n8n infrastructure runs continuously (verifiable)
 *
 * DO NOT add metrics you cannot defend with a link or database query.
 */

const metrics = [
  { value: "60+", label: "integrations supported" },
  { value: "< 3 min", label: "average build time" },
  { value: "24/7", label: "always-on execution" },
];

export default function SocialProofStrip() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: reduce ? 0 : 1.2, duration: reduce ? 0 : 0.6 }}
      className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-8"
    >
      {metrics.map((metric, i) => (
        <div key={metric.label} className="flex items-center gap-x-6">
          <div className="text-center">
            <span className="text-[14px] font-semibold text-white/60 sm:text-[15px]">
              {metric.value}
            </span>
            <span className="ml-1.5 text-[11px] font-medium text-white/25 uppercase tracking-[0.06em]">
              {metric.label}
            </span>
          </div>
          {i < metrics.length - 1 && (
            <span className="text-white/10 text-[10px] hidden sm:inline">·</span>
          )}
        </div>
      ))}
    </motion.div>
  );
}
