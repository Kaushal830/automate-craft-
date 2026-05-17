"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export default function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: PageIntroProps) {
  const reduce = useReducedMotion();
  const y = reduce ? 0 : 18;
  const dur = reduce ? 0 : 0.55;

  return (
    <section className="section-space relative overflow-hidden pb-16 pt-32 md:pt-36">
      {/* Ambient radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full opacity-50"
        style={{
          background: "radial-gradient(ellipse, rgba(59,130,246,0.1) 0%, transparent 65%)",
        }}
      />

      <div className="site-container relative">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.06] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent shadow-[0_0_12px_rgba(59,130,246,0.08)]"
          >
            {eyebrow}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 text-[3rem] font-semibold leading-[0.94] tracking-[-0.07em] text-foreground sm:text-[3.9rem]"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-7 max-w-2xl text-[15px] leading-8 text-white/40"
          >
            {description}
          </motion.p>
          {children ? (
            <motion.div
              initial={{ opacity: 0, y }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10"
            >
              {children}
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
