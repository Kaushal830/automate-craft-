"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

const stages = [
  { key: "draft", label: "Draft" },
  { key: "generated", label: "Generated" },
  { key: "configured", label: "Configured" },
  { key: "test-passed", label: "Test passed" },
  { key: "live", label: "Live on n8n" },
];

type StatusStripProps = {
  activeStage?: number; // 0-based index of current active stage
};

export default function StatusStrip({ activeStage = 3 }: StatusStripProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2"
    >
      {stages.map((stage, i) => {
        const isPast = i < activeStage;
        const isCurrent = i === activeStage;
        const isFuture = i > activeStage;

        return (
          <div key={stage.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                isCurrent
                  ? "bg-accent/10 text-accent border border-accent/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                  : isPast
                  ? "bg-emerald-400/8 text-emerald-400/70 border border-emerald-400/10"
                  : "bg-white/[0.03] text-white/20 border border-white/[0.04]"
              }`}
            >
              {isPast ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : isCurrent ? (
                <motion.div
                  className="h-2 w-2 rounded-full bg-accent"
                  animate={reduce ? undefined : { scale: [1, 1.3, 1] }}
                  transition={reduce ? undefined : { duration: 2, repeat: Infinity }}
                />
              ) : (
                <Circle className="h-3 w-3 opacity-30" />
              )}
              {stage.label}
            </div>
            {i < stages.length - 1 && (
              <ArrowRight className={`h-3 w-3 ${isPast ? "text-emerald-400/30" : "text-white/10"}`} />
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
