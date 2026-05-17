"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, Check, ChevronDown, Sparkles, X, BadgeCheck, Lock, CircleDollarSign, Headphones } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import PageIntro from "@/components/PageIntro";
import { useGeoPricing } from "@/hooks/useGeoPricing";

/* LOGIC EXPLAINED:
The pricing page already had good visible motion, but some parts did not respect
reduced-motion preferences. This fix keeps the current look and interaction for
most users while making movement instant or static for people who prefer less motion.
*/

type CreditTier = {
  credits: string;
  priceMonthlyInr: number;
  priceYearlyInr: number;
  billedYearlyInr: number;
  idSuffix: string;
};

type Plan = {
  idBase: string;
  name: string;
  priceMonthlyLabel?: string;
  priceYearlyLabel?: string;
  billedYearlyLabel?: string;
  creditTiers?: CreditTier[];
  audience: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

const plans: Plan[] = [
  {
    idBase: "plan_starter",

    name: "Starter",
    audience: "For individuals starting out",
    description: "Perfect for beginners who want to automate simple tasks and explore AI automation.",
    creditTiers: [
      { credits: "500", priceMonthlyInr: 999, priceYearlyInr: 833, billedYearlyInr: 9990, idSuffix: "" },
      { credits: "1000", priceMonthlyInr: 1899, priceYearlyInr: 1583, billedYearlyInr: 18990, idSuffix: "_1k" },
      { credits: "2000", priceMonthlyInr: 3499, priceYearlyInr: 2916, billedYearlyInr: 34990, idSuffix: "_2k" },
    ],
    features: [
      "Simple automation workflows",
      "Form to email alerts",
      "Basic tool connections",
      "Limited workflow steps",
    ],
    cta: "Get Started",
  },
  {
    idBase: "plan_plus",
    name: "Plus",
    audience: "For growing teams",
    description: "Ideal for businesses automating leads, follow-ups, and customer communication.",
    creditTiers: [
      { credits: "1,500", priceMonthlyInr: 2000, priceYearlyInr: 1666, billedYearlyInr: 19990, idSuffix: "" },
      { credits: "3,000", priceMonthlyInr: 3799, priceYearlyInr: 3166, billedYearlyInr: 37990, idSuffix: "_3k" },
      { credits: "5,000", priceMonthlyInr: 5999, priceYearlyInr: 4999, billedYearlyInr: 59990, idSuffix: "_5k" },
    ],
    features: [
      "Multi-step automations",
      "CRM and WhatsApp workflows",
      "Multiple tool connections",
      "Faster execution speed",
      "__ultra_thinking__",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    idBase: "plan_pro",
    name: "Pro",
    audience: "For advanced users",
    description: "Best for scaling businesses running multiple automations daily.",
    creditTiers: [
      { credits: "3,000", priceMonthlyInr: 3500, priceYearlyInr: 2916, billedYearlyInr: 34990, idSuffix: "" },
      { credits: "5,000", priceMonthlyInr: 5499, priceYearlyInr: 4583, billedYearlyInr: 54990, idSuffix: "_5k" },
      { credits: "10,000", priceMonthlyInr: 9999, priceYearlyInr: 8333, billedYearlyInr: 99990, idSuffix: "_10k" },
    ],
    features: [
      "Complex workflow automation",
      "Conditional logic flows",
      "High execution priority",
      "Large scale automation",
      "__ultra_thinking__",
    ],
    cta: "Get Started",
  },
  {
    idBase: "plan_enterprise",
    name: "Enterprise",
    priceMonthlyLabel: "Let's Talk",
    priceYearlyLabel: "Let's Talk",
    billedYearlyLabel: "Custom yearly billing",
    audience: "For high-scale needs",
    description: "For teams that need fully customized automation solutions and infrastructure.",
    features: [
      "Unlimited workflow execution",
      "Custom automation systems",
      "Dedicated infrastructure setup",
      "Custom integrations support",
      "Dedicated account manager",
      "Priority support access",
      "__ultra_thinking__",
    ],
    cta: "Contact Us",
  },
];

function PlanCard({
  plan,
  billingCycle,
  subscribing,
  onSubscribe,
  index,
  formatPrice,
  isSelected,
  onSelect,
}: {
  plan: Plan;
  billingCycle: "monthly" | "yearly";
  subscribing: string | null;
  onSubscribe: (planId: string) => void;
  index: number;
  formatPrice: (value: number) => string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isRecommended = Boolean(plan.highlighted);
  const isGoldSelected = isRecommended && isSelected;
  const showRecommendedBadge = isRecommended;
  const showSelectedBadge = isSelected && !isRecommended;
  const showCardBadge = showRecommendedBadge || showSelectedBadge;

  const activeTier = plan.creditTiers ? plan.creditTiers[selectedTierIndex] : null;
  const currentPriceMonthly = activeTier ? formatPrice(activeTier.priceMonthlyInr) : plan.priceMonthlyLabel;
  const currentPriceYearly = activeTier ? formatPrice(activeTier.priceYearlyInr) : plan.priceYearlyLabel;
  const currentBilledYearly = activeTier ? `Billed ${formatPrice(activeTier.billedYearlyInr)} yearly` : plan.billedYearlyLabel;
  const currentPrice = billingCycle === "yearly" ? currentPriceYearly : currentPriceMonthly;

  const handleSubscribeClick = () => {
    if (plan.name === "Enterprise") {
      onSubscribe(plan.idBase);
      return;
    }

    const actualPlanId = billingCycle === "yearly"
      ? `${plan.idBase}${activeTier ? activeTier.idSuffix : ""}_yearly`
      : `${plan.idBase}${activeTier ? activeTier.idSuffix : ""}`;

    onSubscribe(actualPlanId);
  };

  const handleSelectFromKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onSelect();
  };

  const badgeClassName = isGoldSelected
    ? "border border-[#ffe876]/60 bg-[#ffe876]/14 text-[#ffe876] shadow-[0_0_24px_rgba(255,232,118,0.35)]"
    : isSelected
      ? "border border-[#3b82f6]/40 bg-[#3b82f6]/18 text-[#3b82f6] shadow-[0_0_18px_rgba(59,130,246,0.24)]"
      : isRecommended
        ? "border border-[#ffe876]/50 bg-[#ffe876]/10 text-[#ffe876] shadow-[0_0_20px_rgba(255,232,118,0.2)]"
        : "";

  const cardClassName = isSelected
    ? isGoldSelected
      ? "border-2 border-[#ffe876] bg-[#0d1117] -translate-y-1.5 shadow-[0_0_0_3px_rgba(255,232,118,0.08),0_18px_44px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-[#ffe876] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
      : "border-2 border-[#3b82f6] bg-[#0d1117] -translate-y-1.5 shadow-[0_0_0_3px_rgba(59,130,246,0.1),0_18px_44px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
    : isRecommended
      ? "border border-white/[0.06] bg-[#0d1117] shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:-translate-y-1.5 hover:border-[#ffe876] hover:shadow-[0_0_0_3px_rgba(255,232,118,0.15),0_24px_48px_rgba(255,232,118,0.15)] active:-translate-y-1 focus-visible:-translate-y-1.5 focus-visible:border-[#ffe876] focus-visible:ring-2 focus-visible:ring-[#ffe876] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
      : "border border-white/[0.06] bg-gradient-to-b from-[#111113] to-[#0d0d0f] shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:-translate-y-1.5 hover:border-[#3b82f6] hover:shadow-[0_0_0_3px_rgba(59,130,246,0.08),0_18px_44px_rgba(0,0,0,0.58)] active:-translate-y-1 focus-visible:-translate-y-1.5 focus-visible:border-[#3b82f6] focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]";

  return (
    <motion.article
      initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : index * 0.1, duration: reduceMotion ? 0 : undefined, ease: "easeOut" }}
      whileHover={reduceMotion ? undefined : isRecommended ? { y: -16, scale: 1.03 } : { y: -10, scale: 1.018 }}
      whileTap={reduceMotion ? undefined : { scale: 0.992 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onSelect}
      onKeyDown={handleSelectFromKeyboard}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }

        setIsFocused(false);
      }}
      role="radio"
      aria-checked={isSelected}
      aria-label={`${plan.name} plan`}
      tabIndex={0}
      className={`relative flex h-full flex-col rounded-2xl p-8 transition-all duration-200 cursor-pointer focus-visible:outline-none ${cardClassName}`}
    >
      {isSelected && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: isGoldSelected
              ? "radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.08) 0%, transparent 65%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(79,142,247,0.07) 0%, transparent 65%)",
          }}
        />
      )}

      {showCardBadge && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 h-40 w-60 -translate-x-1/2 rounded-full opacity-50"
          style={{
            background: `radial-gradient(ellipse, ${
              isGoldSelected
                ? "rgba(255,232,118,0.16)"
                : isSelected
                  ? "rgba(79,142,247,0.18)"
                  : "rgba(255,232,118,0.12)"
            } 0%, transparent 70%)`,
          }}
        />
      )}

      {showCardBadge && (
        <div className={`absolute -top-[14px] left-1/2 z-20 -translate-x-1/2 rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeClassName}`}>
          {showRecommendedBadge ? "Recommended" : "Selected"}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <h3 className={`text-xl font-bold tracking-tight ${plan.highlighted ? "text-[#ffe876]" : "text-white"}`}>
          {plan.name}
        </h3>
        <p className="mt-2 text-sm text-white/35">{plan.audience}</p>

        <div className="mb-2 mt-6">
          {billingCycle === "yearly" && plan.name !== "Enterprise" && plan.name !== "Free" && (
            <div className="mb-1 text-sm font-semibold text-white/25 line-through decoration-white/15">
              {currentPriceMonthly}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <span className="text-[2.5rem] font-bold leading-none tracking-tight text-white">
              {currentPrice}
            </span>
            {plan.name !== "Enterprise" && plan.name !== "Free" && (
              <span className="pb-1 text-sm font-medium text-white/35">/ month</span>
            )}
            {billingCycle === "yearly" && plan.name !== "Enterprise" && plan.name !== "Free" && (
              <div className="mb-1 ml-auto flex-shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-emerald-400">
                Save 20%
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 h-5">
          {billingCycle === "yearly" && plan.name !== "Enterprise" && plan.name !== "Free" && (
            <span className="text-xs font-semibold text-white/25">
              {currentBilledYearly}
            </span>
          )}
        </div>

        {plan.creditTiers && (
          <div className="relative mb-6 mt-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsDropdownOpen((current) => !current);
              }}
              className={`relative z-10 flex w-full items-center justify-between rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] ${
                isDropdownOpen ? "border-[#3b82f6]/30 bg-[#3b82f6]/[0.04]" : "border-white/[0.08] hover:border-white/[0.12] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-4 w-4 items-center justify-center rounded-full border border-white/15">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[14px] font-semibold">
                    {billingCycle === "yearly" ? parseInt(activeTier!.credits.replace(",", ""), 10) * 12 : activeTier!.credits} credits
                  </span>
                  <span className="text-xs text-white/35">/ {billingCycle === "yearly" ? "yr" : "month"}</span>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-white/35 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                  {plan.creditTiers.map((tier, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedTierIndex(idx);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111113] ${
                        selectedTierIndex === idx
                          ? "bg-accent/[0.08] font-medium text-accent"
                          : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                          selectedTierIndex === idx ? "border-accent/40" : "border-white/15"
                        }`}>
                          {selectedTierIndex === idx && <div className="h-1.5 w-1.5 rounded-full bg-accent" />}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span>
                            {billingCycle === "yearly" ? parseInt(tier.credits.replace(",", ""), 10) * 12 : tier.credits} credits
                          </span>
                          <span className="text-xs opacity-40">/ {billingCycle === "yearly" ? "yr" : "month"}</span>
                        </div>
                      </div>
                      {selectedTierIndex === idx && <Check className="h-4 w-4 text-accent" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <p className={`text-sm leading-relaxed text-white/50 ${plan.creditTiers ? "mb-4" : "mb-8"}`}>
          {plan.description}
        </p>

        <div className="flex-1 space-y-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            Includes:
          </div>
          {plan.features.map((feature, fIdx) => {
            if (feature === "__ultra_thinking__") {
              return (
                <motion.div
                  key="ultra_thinking"
                  initial={{ opacity: 0, x: reduceMotion ? 0 : -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.3,
                    delay: reduceMotion ? 0 : fIdx * 0.03,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-start gap-3"
                >
                  <Brain className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/65">
                      Ultra Thinking
                    </span>
                    <span className="shrink-0 rounded-full bg-violet-500/15 px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wider text-violet-400 ring-1 ring-violet-500/20">
                      New
                    </span>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: reduceMotion ? 0 : -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: reduceMotion ? 0 : 0.3,
                  delay: reduceMotion ? 0 : fIdx * 0.03,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex items-start gap-3"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent/50" />
                <span className="text-sm font-medium text-white/65">
                  {feature}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-10">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleSubscribeClick();
          }}
          disabled={subscribing !== null}
          className={`relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold transition-all duration-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] ${
            isSelected || plan.highlighted
              ? "bg-gradient-to-r from-accent to-blue-600 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(59,130,246,0.4)]"
              : plan.name === "Enterprise"
                ? "border border-white/[0.08] bg-white/[0.04] text-white hover:border-white/[0.12] hover:bg-white/[0.08]"
                : "bg-gradient-to-r from-accent to-blue-600 text-white shadow-[0_4px_16px_rgba(59,130,246,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(59,130,246,0.3)]"
          }`}
        >
          {subscribing && subscribing.startsWith(plan.idBase) ? "Processing..." : plan.cta}
        </button>
      </div>
    </motion.article>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { formatPrice } = useGeoPricing();

  const handleSubscribe = async (actualPlanId: string) => {
    if (actualPlanId === "plan_enterprise") {
      router.push("/lets-talk");
      return;
    }

    setSubscribing(actualPlanId);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: actualPlanId }),
      });

      if (response.status === 401) {
        router.push("/signup");
      } else if (response.ok) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <main className="relative min-h-screen pt-6">
      <div className="relative mx-auto flex h-0 max-w-[1400px] justify-end px-6">
        <div className="relative top-2 z-50 md:top-6">
          <Link
            href="/"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-white/60 transition-all duration-200 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            aria-label="Close pricing and return"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <PageIntro
        eyebrow="Pricing"
        title="Simple, transparent pricing"
        description="Choose the plan that fits your business needs. Upgrade anytime as you grow."
      />

      <div className="mb-16 flex justify-center">
        <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/[0.06]">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] ${
              billingCycle === "monthly"
                ? "bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.08)]"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] ${
              billingCycle === "yearly"
                ? "bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.08)]"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            Yearly
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-accent">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-[1400px] px-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-4" role="radiogroup" aria-label="Pricing plans">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              index={index}
              billingCycle={billingCycle}
              subscribing={subscribing}
              onSubscribe={handleSubscribe}
              formatPrice={formatPrice}
              isSelected={selectedPlan === plan.idBase}
              onSelect={() => setSelectedPlan(plan.idBase)}
            />
          ))}
        </div>

        <div className="mt-20 flex justify-center">
          <Link
            href="/how-credits-work"
            className="group relative inline-flex items-center gap-4 rounded-2xl bg-white/[0.02] px-8 py-5 ring-1 ring-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] hover:ring-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-accent/0 via-accent/[0.03] to-accent/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/15 transition-colors duration-200 group-hover:bg-accent/15">
              <Sparkles className="h-6 w-6" />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-[17px] font-bold text-white transition-all duration-200">
                Wondering how credits work?
              </span>
              <span className="mt-0.5 text-[14px] text-white/40">
                Learn exactly how simple and fair our pricing is.
              </span>
            </div>

            <div className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-white/40 transition-all duration-200 group-hover:scale-110 group-hover:bg-accent group-hover:text-white">
              <span className="font-bold">→</span>
            </div>
          </Link>
        </div>
        <div className="mt-16 grid gap-3 border-t border-white/[0.06] pt-12 text-sm font-medium tracking-wide text-white/42 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-accent/60" />
            Secure Checkout
          </div>
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-accent/60" />
            Razorpay Secured
          </div>
          <div className="flex items-center gap-3">
            <CircleDollarSign className="h-5 w-5 text-accent/60" />
            Fair Credit Top-ups
          </div>
          <div className="flex items-center gap-3">
            <Headphones className="h-5 w-5 text-accent/60" />
            Human Support
          </div>
        </div>

      </section>
    </main>
  );
}
