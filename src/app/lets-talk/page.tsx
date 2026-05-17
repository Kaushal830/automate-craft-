"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, ChevronDown, X } from "lucide-react";
import Link from "next/link";

type ConsultationFormState = {
  // Section 1: Basic Info
  name: string;
  email: string;
  company: string;
  role: string;
  
  // Section 2: Business Context
  businessType: string;
  companySize: string;
  volume: string;

  // Section 3: Automation Need
  automationGoal: string;
  toolsUsed: string[];
  bottleneck: string;

  // Section 4: Tech & Complexity
  usedAutomation: boolean | null;
  previousTools: string;
  complexity: string;

  // Section 5: Priority & Budget
  urgency: string;
  budget: string;

  // Section 6: Final Details
  additionalInfo: string;
};

const initialFormState: ConsultationFormState = {
  name: "",
  email: "",
  company: "",
  role: "",
  businessType: "",
  companySize: "",
  volume: "",
  automationGoal: "",
  toolsUsed: [],
  bottleneck: "",
  usedAutomation: null,
  previousTools: "",
  complexity: "",
  urgency: "",
  budget: "",
  additionalInfo: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reusable Field Component to prevent layout shifts
const Field = ({ label, error, children, className = "" }: { label: string, error?: string, children: React.ReactNode, className?: string }) => (
  <div className={`relative flex flex-col pb-[22px] ${className}`}>
    <label className="text-[13px] font-bold text-white/50 mb-2 uppercase tracking-wide">{label}</label>
    {children}
    {error && <span className="absolute bottom-0 left-0 text-[12px] font-medium text-red-400">{error}</span>}
  </div>
);

export default function LetsTalkPage() {
  const [form, setForm] = useState<ConsultationFormState>(initialFormState);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState(1);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [attemptedNext, setAttemptedNext] = useState(false);

  // Update field
  const updateForm = <Key extends keyof ConsultationFormState>(
    field: Key,
    value: ConsultationFormState[Key],
  ) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleTool = (tool: string) => {
    setForm(prev => {
      const exists = prev.toolsUsed.includes(tool);
      return {
        ...prev,
        toolsUsed: exists 
          ? prev.toolsUsed.filter(t => t !== tool)
          : [...prev.toolsUsed, tool]
      };
    });
  };

  const getErrors = () => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (!form.name.trim()) errors.name = "Name is required";
      if (!form.email.trim() || !EMAIL_REGEX.test(form.email)) errors.email = "Valid email required";
      if (!form.company.trim()) errors.company = "Company is required";
      if (!form.role) errors.role = "Role is required";
    }
    if (step === 2) {
      if (!form.businessType.trim()) errors.businessType = "Please describe your business";
      if (!form.companySize) errors.companySize = "Select company size";
      if (!form.volume.trim()) errors.volume = "Required";
    }
    if (step === 3) {
      if (!form.automationGoal.trim()) errors.automationGoal = "Required";
      if (!form.bottleneck.trim()) errors.bottleneck = "Required";
    }
    if (step === 4) {
      if (form.usedAutomation === null) errors.usedAutomation = "Required";
      if (form.usedAutomation === true && !form.previousTools.trim()) errors.previousTools = "Required";
      if (!form.complexity) errors.complexity = "Required";
    }
    if (step === 5) {
      if (!form.urgency) errors.urgency = "Required";
      if (!form.budget) errors.budget = "Required";
    }
    return errors;
  };

  const handleNext = () => {
    const errors = getErrors();
    if (Object.keys(errors).length === 0) {
      setAttemptedNext(false);
      setDirection(1);
      setStep(s => s + 1);
    } else {
      setAttemptedNext(true);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setAttemptedNext(false);
      setDirection(-1);
      setStep(s => s - 1);
    }
  };

  const handleSubmit = async () => {
    const errors = getErrors();
    if (Object.keys(errors).length > 0) {
      setAttemptedNext(true);
      return;
    }
    
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch {
      // Demo purposes
    }

    setLoading(false);
    setSubmitted(true);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 30 : -30,
      opacity: 0,
      position: 'absolute' as const
    })
  };

  const errors = attemptedNext ? getErrors() : {};

  const inputClasses = (hasError?: boolean) => `
    w-full h-[52px] bg-[#111113] border ${hasError ? 'border-red-500/50 focus:border-red-500' : 'border-white/[0.08] focus:border-accent/50'}
    rounded-xl px-4 text-[15px] text-white outline-none transition-all duration-200
    focus:ring-2 ${hasError ? 'focus:ring-red-500/10' : 'focus:ring-accent/10'} focus:shadow-[0_0_16px_rgba(59,130,246,0.06)] hover:border-white/15
  `;

  const textareaClasses = (hasError?: boolean) => `
    w-full min-h-[120px] bg-[#111113] border ${hasError ? 'border-red-500/50 focus:border-red-500' : 'border-white/[0.08] focus:border-accent/50'}
    rounded-xl px-4 py-4 text-[15px] text-white outline-none transition-all duration-200
    focus:ring-2 ${hasError ? 'focus:ring-red-500/10' : 'focus:ring-accent/10'} focus:shadow-[0_0_16px_rgba(59,130,246,0.06)] hover:border-white/15 resize-none
  `;

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-[720px] w-full bg-[#0c0c0c] border border-white/10 rounded-[24px] p-12 text-center shadow-2xl relative overflow-hidden mx-auto"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 mb-8 border border-accent/20">
            <CheckCircle2 className="h-10 w-10 text-accent" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Request Received</h2>
          <p className="text-white/60 leading-relaxed mb-10 text-lg">
            Thanks! We&apos;ll review your requirements and get back to you soon.
          </p>
          <Link href="/" className="inline-flex h-14 px-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all">
            Return to Homepage
          </Link>
        </motion.div>
      </main>
    );
  }

  const sections = [
    { title: "Basic Info", desc: "Let's start with who you are." },
    { title: "Business Context", desc: "Help us understand your scale." },
    { title: "Automation Need", desc: "What are we building?" },
    { title: "Tech & Complexity", desc: "Your technical background." },
    { title: "Priority & Budget", desc: "Project timeline & scope." },
    { title: "Final Details", desc: "Anything else we should know?" }
  ];

  const currentSection = sections[step - 1];

  return (
    <main className="min-h-screen bg-[#050505] pt-24 pb-24 font-sans flex flex-col items-center">
      {/* Close button */}
      <div className="fixed top-5 right-5 z-50 sm:top-6 sm:right-6">
        <Link
          href="/"
          aria-label="Close and return to homepage"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-white/50 transition-all duration-200 hover:bg-white/[0.08] hover:text-white hover:border-white/[0.12]"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>

      {/* Page Header */}
      <div className="text-center mb-10 px-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          Let&apos;s build something <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400">powerful.</span>
        </h1>
        <p className="text-white/50 text-[17px] font-medium max-w-[600px] mx-auto">
          Share your process. We will design the perfect custom automation architecture for your business.
        </p>
      </div>

      {/* Main Fixed-Width Container */}
      <div className="w-full max-w-[720px] px-4 md:px-6 mx-auto relative">
        <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-[24px] shadow-[0_16px_50px_rgba(0,0,0,0.6)] relative flex flex-col overflow-hidden">
          
          {/* Progress Indicator */}
          <div className="h-1.5 w-full bg-white/5 relative">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-blue-400"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / 6) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>

          <div className="flex flex-col min-h-[580px] p-6 md:p-10 relative">
            
            {/* Header / Step Progress */}
            <div className="mb-8 border-b border-white/5 pb-6">
              <span className="text-accent text-[12px] font-bold tracking-[0.2em] uppercase mb-2 block">
                Step {step} of 6
              </span>
              <h2 className="text-2xl font-bold text-white mb-1">{currentSection.title}</h2>
              <p className="text-white/50 text-[15px]">{currentSection.desc}</p>
            </div>

            {/* Form Fields Area with Fixed Structure */}
            <div className="flex-grow relative">
              <AnimatePresence custom={direction} initial={false} mode="wait">
                <motion.div
                  key={step}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
                  className="w-full"
                >
                  
                  {/* STEP 1: Basic Info */}
                  {step === 1 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        <Field label="Full Name" error={errors.name}>
                          <input type="text" value={form.name} onChange={e => updateForm("name", e.target.value)}
                            className={inputClasses(!!errors.name)} placeholder="Jane Doe" />
                        </Field>
                        <Field label="Work Email" error={errors.email}>
                          <input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)}
                            className={inputClasses(!!errors.email)} placeholder="jane@company.com" />
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        <Field label="Company Name" error={errors.company}>
                          <input type="text" value={form.company} onChange={e => updateForm("company", e.target.value)}
                            className={inputClasses(!!errors.company)} placeholder="Acme Corp" />
                        </Field>

                        <Field label="Role / Position" error={errors.role} className="z-[100]">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                              className={inputClasses(!!errors.role) + " flex items-center justify-between !py-0"}
                            >
                              <span className={form.role ? "text-white" : "text-white/40"}>
                                {form.role || "Choose your role..."}
                              </span>
                              <ChevronDown className={`h-5 w-5 text-white/40 transition-transform ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
                            </button>
                            
                            <AnimatePresence>
                              {isRoleDropdownOpen && (
                                <div className="relative">
                                  <div className="fixed inset-0 z-40" onClick={() => setIsRoleDropdownOpen(false)} />
                                  <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="relative w-full bg-[#111] border border-white/10 rounded-xl overflow-hidden z-[100]"
                                  >
                                    {["Founder", "Manager", "Developer", "Other"].map(role => (
                                      <button
                                        key={role}
                                        type="button"
                                        onClick={() => {
                                          updateForm("role", role);
                                          setIsRoleDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-5 py-3.5 text-[15px] font-medium transition-colors hover:bg-white/10 flex items-center justify-between ${form.role === role ? "text-accent bg-accent/5" : "text-white/80"}`}
                                      >
                                        {role}
                                        {form.role === role && <CheckCircle2 className="h-4 w-4 text-accent" />}
                                      </button>
                                    ))}
                                  </motion.div>
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                        </Field>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Business Context */}
                  {step === 2 && (
                    <div className="space-y-2">
                      <Field label="What does your business do?" error={errors.businessType}>
                        <textarea value={form.businessType} onChange={e => updateForm("businessType", e.target.value)}
                          className={textareaClasses(!!errors.businessType)} placeholder="We are a marketing agency..." />
                      </Field>
                      
                      <Field label="Approx company size" error={errors.companySize}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {["1-5", "5-20", "20-100", "100+"].map(size => (
                            <button key={size} type="button" onClick={() => updateForm("companySize", size)}
                              className={`h-[52px] rounded-xl border text-[14px] font-medium transition-all ${form.companySize === size ? "bg-accent/10 border-accent text-accent" : "bg-[#111] border-white/10 text-white/70 hover:border-white/30"}`}>
                              {size}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Monthly leads or operations volume" error={errors.volume}>
                        <input type="text" value={form.volume} onChange={e => updateForm("volume", e.target.value)}
                          className={inputClasses(!!errors.volume)} placeholder="e.g. 500 leads/mo or 200 orders/day" />
                      </Field>
                    </div>
                  )}

                  {/* STEP 3: Automation Need */}
                  {step === 3 && (
                    <div className="space-y-2">
                      <Field label="What do you want to automate?" error={errors.automationGoal}>
                        <textarea value={form.automationGoal} onChange={e => updateForm("automationGoal", e.target.value)}
                          className={textareaClasses(!!errors.automationGoal)} placeholder="Describe the workflow or manual task you hate doing..." />
                      </Field>
                      
                      <Field label="Which tools do you currently use? (Optional)">
                        <div className="flex flex-wrap gap-2 pt-1">
                          {["WhatsApp", "Email", "Google Sheets", "CRM", "Zapier", "Other"].map(tool => (
                            <button key={tool} type="button" onClick={() => toggleTool(tool)}
                              className={`px-5 py-2.5 rounded-full border text-[14px] font-medium transition-all ${form.toolsUsed.includes(tool) ? "bg-accent text-white border-accent" : "bg-[#111] border-white/10 text-white/70 hover:border-white/30 hover:bg-white/5"}`}>
                              {tool}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="What is your biggest bottleneck right now?" error={errors.bottleneck}>
                        <input type="text" value={form.bottleneck} onChange={e => updateForm("bottleneck", e.target.value)}
                          className={inputClasses(!!errors.bottleneck)} placeholder="e.g. Data entry, slow response times..." />
                      </Field>
                    </div>
                  )}

                  {/* STEP 4: Tech & Complexity */}
                  {step === 4 && (
                    <div className="space-y-2">
                      <Field label="Have you used automation tools before?" error={errors.usedAutomation}>
                        <div className="flex gap-4">
                           <button type="button" onClick={() => updateForm("usedAutomation", true)}
                              className={`flex-1 h-[52px] rounded-xl border font-semibold transition-all ${form.usedAutomation === true ? "bg-accent/10 border-accent text-accent" : "bg-[#111] border-white/10 text-white/70 hover:border-white/30"}`}>
                              Yes
                           </button>
                           <button type="button" onClick={() => { updateForm("usedAutomation", false); updateForm("previousTools", ""); }}
                              className={`flex-1 h-[52px] rounded-xl border font-semibold transition-all ${form.usedAutomation === false ? "bg-accent/10 border-accent text-accent" : "bg-[#111] border-white/10 text-white/70 hover:border-white/30"}`}>
                              No
                           </button>
                        </div>
                      </Field>
                      
                      {/* Fixed height placeholder for optional field to prevent jumping */}
                      <div className="h-[96px] w-full">
                        <AnimatePresence>
                          {form.usedAutomation === true && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full">
                              <Field label="Which tools?" error={errors.previousTools}>
                                <input type="text" value={form.previousTools} onChange={e => updateForm("previousTools", e.target.value)}
                                  className={inputClasses(!!errors.previousTools)} placeholder="e.g. Make, Zapier, n8n" />
                              </Field>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <Field label="How complex do you expect your automation to be?" error={errors.complexity}>
                        <div className="space-y-3">
                          {[
                            { id: "Simple", desc: "1-2 steps (e.g. Form to Email)" },
                            { id: "Medium", desc: "Multi-step (e.g. CRM to Sheets)" },
                            { id: "Complex", desc: "Advanced workflows with AI & custom logic" }
                          ].map(com => (
                             <button key={com.id} type="button" onClick={() => updateForm("complexity", com.id)}
                               className={`w-full text-left px-5 py-4 rounded-xl border transition-all flex justify-between items-center ${form.complexity === com.id ? "bg-accent/5 border-accent" : "bg-[#111] border-white/10 hover:border-white/30"}`}>
                               <div>
                                 <div className={`font-bold text-[15px] ${form.complexity === com.id ? "text-accent" : "text-white"}`}>{com.id}</div>
                                 <div className={`text-[13px] mt-0.5 ${form.complexity === com.id ? "text-accent/80" : "text-white/40"}`}>{com.desc}</div>
                               </div>
                               {form.complexity === com.id && <CheckCircle2 className="h-5 w-5 text-accent" />}
                             </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  )}

                  {/* STEP 5: Priority & Budget */}
                  {step === 5 && (
                    <div className="space-y-2">
                      <Field label="How urgent is this project?" error={errors.urgency}>
                        <div className="flex flex-col md:flex-row gap-3">
                          {["Just exploring", "Within 1 month", "ASAP"].map(urg => (
                            <button key={urg} type="button" onClick={() => updateForm("urgency", urg)}
                              className={`flex-1 h-[52px] rounded-xl border text-[14px] font-semibold transition-all ${form.urgency === urg ? "bg-accent/10 border-accent text-accent" : "bg-[#111] border-white/10 text-white/70 hover:border-white/30"}`}>
                              {urg}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Estimated budget range" error={errors.budget}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {["Under ₹10k", "₹10k–₹50k", "₹50k–₹2L", "₹2L+"].map(bud => (
                             <button key={bud} type="button" onClick={() => updateForm("budget", bud)}
                               className={`h-[60px] rounded-xl border text-[16px] font-bold transition-all ${form.budget === bud ? "bg-accent/5 border-accent text-accent" : "bg-[#111] border-white/10 text-white/70 hover:border-white/30"}`}>
                               {bud}
                             </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  )}

                  {/* STEP 6: Final Details */}
                  {step === 6 && (
                    <div className="space-y-2">
                      <Field label="Anything else we should know? (Optional)">
                        <textarea value={form.additionalInfo} onChange={e => updateForm("additionalInfo", e.target.value)}
                          className={textareaClasses()} placeholder="We are specifically looking for someone who understands our industry..." />
                      </Field>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Fixed Footer Buttons */}
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
              <button 
                type="button"
                onClick={handleBack}
                className={`flex items-center gap-2 h-12 px-2 text-[15px] font-bold transition-all text-white/40 hover:text-white ${step === 1 ? "invisible" : "visible"}`}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              
              {step < 6 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-accent to-blue-600 text-white font-bold text-[15px] hover:shadow-[0_8px_28px_rgba(59,130,246,0.35)] transition-all duration-200 shadow-[0_4px_16px_rgba(59,130,246,0.25)] hover:translate-y-[-1px] active:scale-95 active:translate-y-0"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-accent to-blue-600 text-white font-bold text-[15px] transition-all duration-200 shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.4)] hover:translate-y-[-1px] disabled:opacity-50 disabled:active:scale-100 active:scale-95"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Request Consultation"
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
