import React from "react";
import { motion } from "framer-motion";
import { HelpCircle, Check } from "lucide-react";

interface ClarificationCardProps {
  content: string;
  isAnswered: boolean;
}

export function ClarificationCard({ content, isAnswered }: ClarificationCardProps) {
  const lines = content.split('\n');
  const questions = lines
    .filter((line) => /^\d+\./.test(line.trim()))
    .map((line) => line.replace(/^\d+\.\s*/, '').trim());

  if (questions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mt-1 mb-2 rounded-xl overflow-hidden"
      style={{
        background: "var(--cc-bg-raised)",
        border: "1px solid var(--cc-border)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-2.5 px-5 py-4"
        style={{ borderBottom: "1px solid var(--cc-border-subtle)", background: "rgba(59, 130, 246, 0.05)" }}
      >
        <div style={{ color: "var(--cc-accent)" }}>
          <HelpCircle className="h-[18px] w-[18px]" />
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--cc-accent)", letterSpacing: "-0.01em" }}>
          Agent is asking a question. Please answer to continue:
        </span>
      </div>

      {/* Questions */}
      <div className="px-5 py-6 flex flex-col gap-4.5" role="list" aria-label="Clarification questions">
        {questions.map((q, i) => (
          <div key={i} className="flex items-start gap-3.5" role="listitem">
            <span style={{ 
              fontSize: 14.5, 
              color: "var(--cc-text-2)",
              fontFamily: "var(--cc-mono)",
              marginTop: 1 
            }}>
              {i + 1}.
            </span>
            <span style={{ 
              fontSize: 14.5, 
              color: "var(--cc-text-0)", 
              lineHeight: 1.6,
              letterSpacing: "-0.01em"
            }}>
              {q}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div 
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderTop: "1px solid var(--cc-border-subtle)", background: "rgba(255,255,255,0.01)" }}
      >
        <span style={{ fontSize: 12, color: "var(--cc-text-3)", fontWeight: 400 }}>
          {questions.length} question{questions.length !== 1 && 's'}
        </span>
        
        {isAnswered ? (
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" 
            style={{ 
              background: "rgba(59, 130, 246, 0.12)", 
              border: "1px solid rgba(59, 130, 246, 0.2)" 
            }}
          >
             <span style={{ fontSize: 12, fontWeight: 500, color: "var(--cc-accent)" }}>Answered</span>
             <Check className="h-3.5 w-3.5" style={{ color: "var(--cc-accent)" }} />
          </div>
        ) : (
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" 
            style={{ 
              background: "rgba(255, 255, 255, 0.05)", 
              border: "1px solid var(--cc-border-subtle)" 
            }}
          >
             <span style={{ fontSize: 12, fontWeight: 500, color: "var(--cc-text-2)" }}>Awaiting response</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
