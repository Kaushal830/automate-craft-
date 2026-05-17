"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BrandMark from "@/components/BrandMark"; 
import { ArrowRight, Briefcase, User, Code, PenTool, LayoutDashboard, Search, BarChart3, Settings, UserCheck, Users, Building, Globe, Loader2 } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/automation";

const ROLES = [
  { id: "founder", label: "Founder", icon: Briefcase },
  { id: "product", label: "Product", icon: LayoutDashboard },
  { id: "designer", label: "Designer", icon: PenTool },
  { id: "engineer", label: "Engineer", icon: Code },
  { id: "consultant", label: "Consultant", icon: Search },
  { id: "marketing", label: "Sales & Mktg", icon: BarChart3 },
  { id: "operations", label: "Operations", icon: Settings },
  { id: "other", label: "Other", icon: User },
];

const COMPANY_SIZES = [
  { id: "solo", label: "Solo", icon: UserCheck },
  { id: "2-20", label: "2 - 20", icon: Users },
  { id: "21-200", label: "21 - 200", icon: Building },
  { id: "200+", label: "200+", icon: Globe },
];

export default function OnboardingFlow({ user }: { user: AuthenticatedUser }) {
  const router = useRouter();
  const nextParam = "/";

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState({
    fullName: user.name || "",
    role: "",
    companySize: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextStep = () => {
    setDirection(1);
    setStep(s => s + 1);
  };

  const handleNameSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.fullName.trim()) nextStep();
  };

  const handleRoleSelect = (roleId: string) => {
    setFormData((prev) => ({ ...prev, role: roleId }));
    nextStep();
  };

  const handleCompanySizeSelect = async (sizeId: string) => {
    setFormData((prev) => ({ ...prev, companySize: sizeId }));
    await submitOnboarding(sizeId);
  };

  const submitOnboarding = async (finalCompanySize: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          role: formData.role,
          companySize: finalCompanySize,
        }),
      });

      if (res.ok) {
        setTimeout(() => {
          router.push(nextParam);
        }, 500);
      } else {
        setIsSubmitting(false); 
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir < 0 ? 20 : -20,
      opacity: 0,
    }),
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center selection:bg-white/10 selection:text-white">
      <div className="card-surface relative w-full max-w-[460px] rounded-[1.5rem] p-8 mx-4 overflow-hidden">
        
        <div className="mb-8 pl-1">
          <BrandMark compact showName />
        </div>

        <div className="relative w-full min-h-[300px]">
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="w-full flex flex-col"
              >
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
                    What should we call you?
                  </h1>
                  <p className="mt-2 text-[0.95rem] text-foreground/50">
                    Let&apos;s personalize your AutomateCraft experience.
                  </p>
                </div>

                <form onSubmit={handleNameSubmit} className="w-full">
                  <div className="mb-8">
                    <label className="mb-2 block text-sm font-medium text-foreground/80">Full name</label>
                    <input
                      type="text"
                      autoFocus
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                      placeholder="Jane Doe"
                      className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.02] px-4 text-[15px] text-foreground outline-none transition-all placeholder:text-foreground/30 focus:border-accent focus:bg-white/5 focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!formData.fullName.trim()}
                    className="btn-dark flex w-full items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 text-[14px] font-semibold transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="w-full flex flex-col"
              >
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
                    Which role fits you best?
                  </h1>
                  <p className="mt-2 text-[0.95rem] text-foreground/50">
                    We&apos;ll tailor your automations to your expertise.
                  </p>
                </div>

                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                  {ROLES.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleRoleSelect(role.id)}
                      className="group flex flex-col items-center justify-center gap-2.5 rounded-[14px] border border-white/10 bg-white/5 p-4 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:shadow-sm"
                    >
                      <role.icon className="h-5 w-5 text-foreground/40 transition-colors group-hover:text-foreground" />
                      <span className="text-xs font-semibold text-foreground/70 group-hover:text-foreground">
                        {role.label}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="w-full flex flex-col"
              >
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
                    How many people work at your company?
                  </h1>
                  <p className="mt-2 text-[0.95rem] text-foreground/50">
                    This determines your team collaboration features.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-3">
                  {COMPANY_SIZES.map((size) => (
                    <button
                      key={size.id}
                      disabled={isSubmitting}
                      onClick={() => handleCompanySizeSelect(size.id)}
                      className={`group flex w-full items-center gap-4 rounded-[14px] border p-4 transition-all outline-none 
                      ${formData.companySize === size.id ? 'border-foreground bg-white/10 ring-1 ring-foreground scale-[0.98]' : 'border-white/5 bg-[#121212] hover:bg-white/5 hover:border-white/10'} 
                      ${isSubmitting && formData.companySize === size.id ? 'opacity-80' : ''}`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${formData.companySize === size.id ? 'bg-foreground text-background' : 'bg-white/5 text-foreground/50 group-hover:bg-white/10 group-hover:text-foreground/70'}`}>
                        {isSubmitting && formData.companySize === size.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <size.icon className="h-5 w-5" />}
                      </div>
                      <span className={`text-[15px] font-semibold ${formData.companySize === size.id ? 'text-foreground' : 'text-foreground/80'}`}>
                        {size.label}
                      </span>
                      <div className="ml-auto pointer-events-none">
                        <ArrowRight className={`h-4 w-4 transition-all ${formData.companySize === size.id ? 'text-foreground translate-x-1 opacity-100' : 'text-foreground/30 opacity-0 group-hover:opacity-100'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Minimal Progress Dots */}
        <div className="mt-6 flex justify-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-4 bg-foreground"
                  : s < step
                  ? "w-1.5 bg-foreground/30"
                  : "w-1.5 bg-foreground/10"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
