"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface QuickRepliesProps {
  /** Raw clarification text from AI (numbered questions format) */
  content: string;
  /** Called when user clicks a suggestion */
  onSelect: (text: string) => void;
  /** Whether questions are already answered */
  isAnswered?: boolean;
}

// Maps common question patterns to suggested reply chips
const SUGGESTION_MAP: Array<{
  pattern: RegExp;
  chips: string[];
}> = [
  {
    pattern: /google form|which form|form url|form name/i,
    chips: ["Use my Google Form", "Use a Typeform", "Use a Webhook instead"],
  },
  {
    pattern: /google sheet|which sheet|spreadsheet/i,
    chips: ["Use my Google Sheet", "Use Airtable", "No sheet needed"],
  },
  {
    pattern: /whatsapp.*number|who.*receive.*whatsapp|phone number/i,
    chips: ["Send to my number", "Send to a group", "I'll add the number later"],
  },
  {
    pattern: /slack.*channel|which.*channel/i,
    chips: ["Use #general", "Use #notifications", "I'll specify the channel"],
  },
  {
    pattern: /email address|which.*email|inbox/i,
    chips: ["Send to my email", "Send to the lead", "Use a shared inbox"],
  },
  {
    pattern: /which fields|what.*fields|payload|lead details/i,
    chips: ["All fields (name, email, phone)", "Just name + email", "Just name + phone"],
  },
  {
    pattern: /crm.*connect|which crm|hubspot|salesforce/i,
    chips: ["HubSpot", "Salesforce", "I'll connect later"],
  },
  {
    pattern: /webhook|endpoint|api/i,
    chips: ["Use a Webhook URL", "Use an API endpoint", "I'll use a form instead"],
  },
];

function getSuggestionsForContent(content: string): string[] {
  const suggestions: string[] = [];
  for (const { pattern, chips } of SUGGESTION_MAP) {
    if (pattern.test(content)) {
      suggestions.push(...chips);
      if (suggestions.length >= 4) break;
    }
  }
  return suggestions.slice(0, 4);
}

export function QuickReplies({ content, onSelect, isAnswered = false }: QuickRepliesProps) {
  const suggestions = getSuggestionsForContent(content);

  if (suggestions.length === 0 || isAnswered) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}
      >
        <span
          style={{
            width: "100%",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--cc-text-3)",
            marginBottom: 2,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Zap style={{ width: 10, height: 10 }} />
          Quick replies
        </span>
        {suggestions.map((chip) => (
          <motion.button
            key={chip}
            type="button"
            onClick={() => onSelect(chip)}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 20,
              border: "1px solid var(--cc-border)",
              background: "var(--cc-bg-raised)",
              color: "var(--cc-text-1)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cc-accent-border)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--cc-accent-dim)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--cc-accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cc-border)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--cc-bg-raised)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--cc-text-1)";
            }}
          >
            {chip}
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
