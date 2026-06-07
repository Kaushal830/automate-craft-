import { createOpenAI } from "@ai-sdk/openai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { deductCredits, getUserCredits } from "@/lib/credit-store";
import { handleRouteError, jsonError } from "@/lib/api";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { withRetry, RETRY_POLICIES } from "@/lib/retry";
import { checkRateLimit } from "./rate-limit";
import {
  CONTEXT_WINDOW_ERROR_MESSAGE,
  MAX_ASSISTANT_TEXT_PART_CHARS,
  MAX_MODEL_IMAGE_DATA_URL_CHARS,
  MAX_MODEL_IMAGE_PARTS,
  MAX_MODEL_MESSAGES,
  MAX_MODEL_TEXT_CONTEXT_CHARS,
  MAX_MODEL_TEXT_PART_CHARS,
  truncateText,
} from "@/lib/ai/context-limits";

const log = createLogger("api/chat");

const STANDARD_COST = 5;
const ULTRA_COST = 10;
const CHAT_DEBUG = process.env.CHAT_DEBUG === "true" || process.env.NODE_ENV !== "production";
const CHAT_FREE_TEST_MODE =
  process.env.CHAT_FREE_TEST_MODE === "true" && process.env.NODE_ENV !== "production";

function readPositiveIntEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const STANDARD_MAX_OUTPUT_TOKENS = readPositiveIntEnv("CHAT_MAX_OUTPUT_TOKENS", 1200);
const ULTRA_MAX_OUTPUT_TOKENS = readPositiveIntEnv("CHAT_ULTRA_MAX_OUTPUT_TOKENS", 1800);

const isOpenRouter = Boolean(env.openaiBaseUrl?.includes("openrouter.ai"));
let openaiProvider: ReturnType<typeof createOpenAI> | null = null;

function getOpenAIProvider() {
  if (!openaiProvider) {
    const headers = isOpenRouter
      ? {
          "HTTP-Referer": env.openrouterSiteUrl,
          "X-Title": env.openrouterAppName,
        }
      : undefined;

    openaiProvider = createOpenAI({
      apiKey: env.openaiApiKey,
      ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
      ...(headers ? { headers } : {}),
      ...(isOpenRouter ? { name: "openrouter" } : {}),
    });
  }

  return openaiProvider;
}

const SYSTEM_PROMPT = `You are an expert automation architect for AutomateCraft, a business automation SaaS.

Conversation orchestration:
- Gather required implementation details before building a workflow.
- If this conversation already contains your clarification questions and the user has answered them, proceed with workflow generation.
- The server performs missing-detail gating before this prompt. If an automation request reaches this workflow-ready path, do not ask more clarification questions.
- Names or labels such as "Website Lead Form" and "Sales Alerts" are sufficient for draft workflow generation; credentials and exact IDs can be connected later.
- Never invent credentials, destination IDs, channel names, phone numbers, form names, or payload fields.
- Never claim questions were auto-answered. Wait for the user.

When the workflow is ready to build:
1. Acknowledge the resolved request briefly and confidently (1-2 sentences max). No filler words.
2. Call the "buildWorkflow" tool to construct the visual automation graph.

Rules for tool calls:
- Call buildWorkflow only after critical setup details are present or after the user has answered clarification questions.
- For workflow-ready automation requests, call buildWorkflow instead of asking for more details.
- Build nodes in this order: trigger first, then process/transform steps, then action/notification last.
- Node labels must be specific and business-readable (e.g. "New Google Form Submission" not "Trigger").
- Node types: "trigger" for input events, "process" for logic/data/filter steps, "action" for outputs/notifications.
- Include 2-6 nodes total.

Rules for file attachments:
- When the user attaches IMAGES, analyze them carefully. They may contain screenshots of workflows, UI mockups, data tables, or business processes. Describe what you see and build an automation that matches the visual content.
- When the user attaches DOCUMENTS (text, CSV, JSON, markdown), read the content thoroughly. Use the data structure, field names, and context to build a precise automation pipeline.
- If images show a workflow diagram or process flow, replicate it as automation nodes.
- If documents contain data schemas or sample records, create automations that process that specific data shape.

Rules for conversation:
- If the user asks a modification, acknowledge briefly and call buildWorkflow again with the full updated nodes array.
- If asked a non-automation question, answer concisely without calling the tool.
- Be the confident expert - short, decisive, technically precise responses.

Supported integrations: Google Forms, Google Sheets, WhatsApp, Email/Gmail, Slack, HubSpot, Salesforce, Razorpay, Webhooks, CRM.`;

function createWorkflowName(nodes: Array<{ type: string; label: string }>) {
  const trigger = nodes.find((node) => node.type === "trigger")?.label;
  const action = nodes.find((node) => node.type === "action")?.label;

  if (action?.toLowerCase().includes("whatsapp")) return "WhatsApp Automation";
  if (action?.toLowerCase().includes("email")) return "Email Automation";
  if (trigger?.toLowerCase().includes("form")) return "Form Automation";

  return "Automation Workflow";
}

function createWorkflowSummary(nodes: Array<{ label: string }>) {
  if (nodes.length === 0) return "Your automation workflow is ready to review.";
  return nodes.map((node) => node.label).join(" -> ");
}

function getLatestUserText(messages: UIMessage[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) return "";

  return latestUserMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

const AUTOMATION_INTENT_RE =
  /\b(automate|automation|workflow|when|whenever|if|trigger|send|notify|create|update|sync|route|lead|form|submission|webhook|sheet|email|whatsapp|slack|crm|hubspot|salesforce)\b/i;

/* ── Workflow output detection ── */

function messageHasWorkflowOutput(message: UIMessage) {
  return (message.parts || []).some((part) => {
    const toolPart = part as { type?: string; toolName?: string; state?: string; output?: unknown };
    return (
      (toolPart.type === "tool-buildWorkflow" ||
        (toolPart.type === "dynamic-tool" && toolPart.toolName === "buildWorkflow")) &&
      toolPart.state === "output-available" &&
      typeof toolPart.output === "object" &&
      toolPart.output !== null
    );
  });
}

function hasWorkflowOutput(messages: UIMessage[]) {
  return messages.some(messageHasWorkflowOutput);
}

/* ══════════════════════════════════════════════════════════════════
   CLARIFICATION ORCHESTRATION ENGINE (stateful conversation scanner)
   ══════════════════════════════════════════════════════════════════

   Design: every POST request already receives the full conversation
   history in `messages[]`. We scan that history ONCE to:
     1. Detect the workflow's declared INTENT (what integrations it
        involves) from the earliest automation-intent user message.
     2. Accumulate RESOLVED FACTS from ALL user messages combined.
     3. Ask only for facts that are STILL MISSING given the intent.

   This is entirely server-side — no DB, no client changes.
*/

interface WorkflowIntent {
  mentionsForm: boolean;
  mentionsSheet: boolean;
  mentionsWebhook: boolean;
  mentionsWhatsapp: boolean;
  mentionsSlack: boolean;
  mentionsEmail: boolean;
  mentionsCrm: boolean;
  mentionsGenericTrigger: boolean;
  hasKnownSource: boolean;       // intent already names the source
  hasKnownDestination: boolean;  // intent already names the destination
  hasPayloadFields: boolean;     // intent already specifies field list
}

interface ResolvedFacts {
  triggerSource: boolean;       // form / sheet / webhook named or identified
  whatsappRecipient: boolean;   // phone number or named group
  slackChannel: boolean;        // #channel or named channel
  emailRecipient: boolean;      // email address or "send to them / lead"
  payloadFields: boolean;       // which fields to include
  crmTarget: boolean;           // hubspot / salesforce identified
}

// ── Intent scanner — run against the FIRST automation message ──────

function scanIntent(text: string): WorkflowIntent {
  const n = text.toLowerCase();

  const mentionsForm    = /\b(form|google form|typeform|jotform|submission|lead form)\b/.test(n);
  const mentionsSheet   = /\b(sheet|spreadsheet|google sheets|row|airtable)\b/.test(n);
  const mentionsWebhook = /\b(webhook|api|endpoint)\b/.test(n);
  const mentionsWhatsapp = /\b(whatsapp|wa message|wa notification)\b/.test(n);
  const mentionsSlack   = /\b(slack|slack channel)\b/.test(n);
  const mentionsEmail   = /\b(email|gmail|inbox|mail)\b/.test(n);
  const mentionsCrm     = /\b(crm|hubspot|salesforce|pipedrive)\b/.test(n);
  const mentionsGenericTrigger =
    /\b(when|whenever|if|trigger|new lead|new signup|signs up|signup|submitted)\b/.test(n);

  // Source is already named if text contains a specific form/sheet/webhook identifier
  const hasKnownSource =
    /\b(google form[s]?|typeform|jotform|contact form|signup form|lead form|website form|website lead form|typeform|hubspot form|airtable|razorpay|stripe|shopify|woocommerce|google sheets|sheet named|spreadsheet named|webhook url|endpoint url)\b/.test(n);

  // Destination is already named with an address/number/channel
  const hasKnownDestination =
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(n) ||   // email address
    /\+?[\d][\d\s().-]{6,}/.test(n) ||       // phone number
    /#[a-z0-9_-]+/.test(n) ||                // slack #channel
    /\b(sales alerts|support alerts|ops alerts|team whatsapp|team slack|alerts group|group named|group called|named group)\b/.test(n);

  const hasPayloadFields =
    /\b(all fields|field|fields|name and|name \+|include name|14 fields|lead details|payload|all 14|name, email|name and email)\b/.test(n);

  return {
    mentionsForm, mentionsSheet, mentionsWebhook,
    mentionsWhatsapp, mentionsSlack, mentionsEmail,
    mentionsCrm, mentionsGenericTrigger,
    hasKnownSource, hasKnownDestination, hasPayloadFields,
  };
}

// ── Fact extractor — run against COMBINED text of ALL user messages ─

function extractResolvedFacts(allUserText: string): ResolvedFacts {
  const n = allUserText.toLowerCase();

  // triggerSource: named form, sheet, webhook, or platform
  const triggerSource =
    /\b(google form[s]?|typeform|jotform|contact form|signup form|lead form|website form|website lead form|hubspot form|google sheets|sheet named|spreadsheet named|webhook url|endpoint url|razorpay|stripe|shopify|woocommerce|airtable|pipedrive|salesforce|hubspot)\b/.test(n) ||
    /\bform (id|name|url)\b/.test(n) ||
    /\bmy (form|sheet|spreadsheet|webhook)\b/.test(n);

  // whatsappRecipient: phone number, named group, or team reference
  const whatsappRecipient =
    /\+?[\d][\d\s().-]{6,}/.test(n) ||   // phone number (7+ digits)
    /\b(sales alerts|support alerts|ops alerts|team whatsapp|alerts group)\b/.test(n) ||
    /\b[a-z][a-z0-9 ]{1,28}\s+group\b/.test(n) ||  // "sales team group", "X group"
    /\b(group named|group called|group id|whatsapp group)\b/.test(n) ||
    /\bmy (number|phone|whatsapp)\b/.test(n);

  // slackChannel: #channel or named channel
  const slackChannel =
    /#[a-z0-9_-]+/.test(n) ||
    /\b(channel named|channel called|channel id|slack workspace|workspace named)\b/.test(n) ||
    /\bmy (channel|slack)\b/.test(n);

  // emailRecipient: email address or "send to them / lead / user"
  const emailRecipient =
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(allUserText) ||  // actual email address
    /\b(send to them|send to the user|send to lead|send to customer|send to subscriber|their email|user.s email)\b/.test(n) ||
    /\b(inbox alias|shared inbox|support inbox|sales inbox)\b/.test(n) ||
    /\bmy (email|inbox)\b/.test(n);

  // payloadFields: user specified which fields to include
  const payloadFields =
    /\b(all fields|all 14|name and (email|phone)|name, email|name \+ phone|include (name|phone|email|all)|just name|only name|full details|lead details|14 fields|all information)\b/.test(n);

  // crmTarget: specific CRM named
  const crmTarget =
    /\b(hubspot|salesforce|pipedrive|zoho|crm named|crm called)\b/.test(n);

  return { triggerSource, whatsappRecipient, slackChannel, emailRecipient, payloadFields, crmTarget };
}

// ── Question builder — only emits what's STILL MISSING ─────────────

function buildRemainingQuestions(intent: WorkflowIntent, facts: ResolvedFacts): string[] {
  const questions: string[] = [];

  // Q1 — trigger source
  if (!facts.triggerSource && !intent.hasKnownSource) {
    if (intent.mentionsForm) {
      questions.push("Which Google Form should I watch? Share the form URL or name.");
    } else if (intent.mentionsSheet) {
      questions.push("Which Google Sheet should I monitor? Share the sheet name or URL.");
    } else if (intent.mentionsWebhook) {
      questions.push("Which webhook or source endpoint should trigger this workflow?");
    } else if (intent.mentionsGenericTrigger) {
      questions.push("Which app, form, sheet, or event should trigger this workflow?");
    }
  }

  // Q2 — destination / recipient
  if (!intent.hasKnownDestination) {
    if (intent.mentionsWhatsapp && !facts.whatsappRecipient) {
      questions.push("Who should receive the WhatsApp notification? Share the phone number or group name.");
    } else if (intent.mentionsSlack && !facts.slackChannel) {
      questions.push("Which Slack workspace/channel should receive the notification?");
    } else if (intent.mentionsEmail && !facts.emailRecipient) {
      questions.push("Which email address or inbox should receive the message?");
    }
  }

  // Q3 — payload fields (only if sending a notification without field spec)
  if (!facts.payloadFields && !intent.hasPayloadFields) {
    const needsFieldSpec = intent.mentionsWhatsapp || intent.mentionsSlack || intent.mentionsEmail;
    if (needsFieldSpec) {
      questions.push("Which lead fields should appear in the message — just name + phone, or all 14 fields?");
    }
  }

  // Q4 — CRM target (only if CRM vaguely mentioned without naming one)
  if (intent.mentionsCrm && !facts.crmTarget) {
    questions.push("Which CRM should this connect to — HubSpot, Salesforce, or another?");
  }

  return questions.slice(0, 4);
}

// ── Low-signal answer guard ─────────────────────────────────────────

function isLowSignalClarificationAnswer(text: string) {
  return /^(yes|ok|okay|sure|go ahead|proceed|continue|do it|you choose|whatever|anything|not sure)$/i.test(text.trim());
}

// ── Main gate ───────────────────────────────────────────────────────

function shouldGateForClarification(messages: UIMessage[]) {
  // Never intercept once a workflow has been successfully built.
  if (hasWorkflowOutput(messages)) {
    log.info("[clarification-gate] bypassed — workflow already built");
    return null;
  }

  const latestUserText = getLatestUserText(messages);
  if (!latestUserText) return null;

  // Low-signal answer: user said "yes/ok/sure" without specifics.
  // Give them a unified re-ask rather than re-running detection.
  if (isLowSignalClarificationAnswer(latestUserText)) {
    const allUserText = messages
      .filter((m) => m.role === "user")
      .map(getMessageText)
      .join(" ");
    const firstIntentMsg = messages
      .filter((m) => m.role === "user")
      .find((m) => AUTOMATION_INTENT_RE.test(getMessageText(m)));
    if (!firstIntentMsg) return null;

    const intent = scanIntent(getMessageText(firstIntentMsg));
    if (!intent.mentionsForm && !intent.mentionsSheet && !intent.mentionsWebhook &&
        !intent.mentionsWhatsapp && !intent.mentionsSlack && !intent.mentionsEmail &&
        !intent.mentionsGenericTrigger) {
      return null;
    }

    const facts = extractResolvedFacts(allUserText);
    const remaining = buildRemainingQuestions(intent, facts);
    if (remaining.length === 0) return null;

    log.info("[clarification-gate] low-signal answer, re-asking remaining", { remaining });
    return { questions: remaining };
  }

  // Find the FIRST user message that expressed automation intent.
  // This is our source of truth for what the workflow NEEDS.
  const allUserMessages = messages.filter((m) => m.role === "user");
  const firstIntentMsg = allUserMessages.find((m) => AUTOMATION_INTENT_RE.test(getMessageText(m)));
  if (!firstIntentMsg) return null;

  const intentText = getMessageText(firstIntentMsg);
  const intent = scanIntent(intentText);

  // If the first intent message has no recognizable integration signals, skip gating.
  const hasIntegrationSignal =
    intent.mentionsForm || intent.mentionsSheet || intent.mentionsWebhook ||
    intent.mentionsWhatsapp || intent.mentionsSlack || intent.mentionsEmail ||
    intent.mentionsCrm || intent.mentionsGenericTrigger;

  if (!hasIntegrationSignal) {
    log.info("[clarification-gate] no integration signal — letting LLM handle");
    return null;
  }

  // Accumulate ALL facts from ALL user messages in the thread.
  const allUserText = allUserMessages.map(getMessageText).join(" ");
  const facts = extractResolvedFacts(allUserText);

  log.info("[clarification-gate] intent scan", {
    intentText: intentText.slice(0, 120),
    intent,
    facts,
  });

  const remaining = buildRemainingQuestions(intent, facts);

  if (remaining.length === 0) {
    log.info("[clarification-gate] all facts resolved — proceeding to LLM");
    return null;
  }

  log.info("[clarification-gate] gating with remaining questions", { remaining });
  return { questions: remaining };
}

/* ── Clarification response helpers ──────────────────────────────── */

function isAutomationRequest(text: string) {
  return AUTOMATION_INTENT_RE.test(text);
}

function createClarificationText(questions: string[]) {
  return [
    "I need a few implementation details before I build this workflow:",
    "",
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    "",
    "Answer these and I will generate the workflow.",
  ].join("\n");
}

function splitStreamText(text: string) {
  return text.match(/.{1,48}(?:\s|$)/g) ?? [text];
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClarificationResponse(messages: UIMessage[], questions: string[]) {
  const clarificationText = createClarificationText(questions);
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const textId = crypto.randomUUID();
      writer.write({ type: "text-start", id: textId });

      for (const delta of splitStreamText(clarificationText)) {
        writer.write({ type: "text-delta", id: textId, delta });
        await wait(18);
      }

      writer.write({ type: "text-end", id: textId });
    },
    onError: createPublicProviderError,
  });

  return createUIMessageStreamResponse({ stream });
}

type UIMessagePart = UIMessage["parts"][number];
type UITextPart = Extract<UIMessagePart, { type: "text" }>;
type UIFilePart = Extract<UIMessagePart, { type: "file" }>;

function isTextPart(part: UIMessagePart): part is UITextPart {
  return part.type === "text";
}

function isImageFilePart(part: UIMessagePart): part is UIFilePart {
  return part.type === "file" && part.mediaType.startsWith("image/");
}

function createTextOnlyMessages(messages: UIMessage[]): UIMessage[] {
  const textOnlyMessages = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message): UIMessage | null => {
      const textParts = message.parts.filter(isTextPart);
      const imageParts = message.parts.filter(isImageFilePart);
      const allParts: UIMessage["parts"] = [...textParts, ...imageParts];

      if (textParts.length === 0 && imageParts.length === 0) return null;

      return {
        ...message,
        parts: allParts.length > 0 ? allParts : [{ type: "text" as const, text: getMessageText(message) }],
      };
    })
    .filter(
      (message): message is UIMessage =>
        message !== null &&
        message.parts.length > 0 &&
        (message.parts.some((part) => isTextPart(part) && part.text.length > 0) ||
          message.parts.some(isImageFilePart)),
    );

  return textOnlyMessages.length > 0 ? textOnlyMessages : messages;
}

function trimConversationHistory(messages: UIMessage[], maxMessages = MAX_MODEL_MESSAGES): UIMessage[] {
  if (messages.length <= maxMessages) return messages;
  return messages.slice(-maxMessages);
}

function addOmittedAttachmentNote(parts: UIMessage["parts"], name: string, reason: string) {
  parts.push({
    type: "text",
    text: `[Attachment "${name}" omitted: ${reason}.]`,
  });
}

function sanitizeMessagesForModel(messages: UIMessage[]): UIMessage[] {
  const recentMessages = createTextOnlyMessages(trimConversationHistory(messages));
  const sanitizedReversed: UIMessage[] = [];
  let remainingTextChars = MAX_MODEL_TEXT_CONTEXT_CHARS;
  let imagePartsKept = 0;

  for (const message of [...recentMessages].reverse()) {
    const parts: UIMessage["parts"] = [];

    for (const part of message.parts) {
      if (part.type === "text") {
        const text = part.text.trim();
        if (!text || remainingTextChars <= 0) continue;

        const partLimit =
          message.role === "assistant"
            ? MAX_ASSISTANT_TEXT_PART_CHARS
            : MAX_MODEL_TEXT_PART_CHARS;
        const nextText = truncateText(text, Math.min(partLimit, remainingTextChars));
        remainingTextChars -= nextText.length;
        parts.push({ ...part, text: nextText });
        continue;
      }

      const filePart = part as Extract<UIMessage["parts"][number], { type: "file" }>;
      if (filePart.type !== "file" || !filePart.mediaType?.startsWith("image/")) {
        continue;
      }

      const filename = filePart.filename || "image";
      const isDataUrl = filePart.url.startsWith("data:");
      const isTooLarge = isDataUrl && filePart.url.length > MAX_MODEL_IMAGE_DATA_URL_CHARS;
      const isOverLimit = imagePartsKept >= MAX_MODEL_IMAGE_PARTS;

      if (isTooLarge || isOverLimit) {
        if (remainingTextChars > 0) {
          addOmittedAttachmentNote(
            parts,
            filename,
            isTooLarge ? "image is too large for this request" : "image limit reached",
          );
          remainingTextChars -= parts[parts.length - 1]?.type === "text"
            ? (parts[parts.length - 1] as Extract<UIMessage["parts"][number], { type: "text" }>).text.length
            : 0;
        }
        continue;
      }

      imagePartsKept += 1;
      parts.push(filePart);
    }

    if (parts.length > 0) {
      sanitizedReversed.push({ ...message, parts });
    }
  }

  return sanitizedReversed.reverse();
}

function errorText(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) {
    const cause = "cause" in error ? errorText(error.cause) : "";
    return `${error.name} ${error.message} ${cause}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isContextWindowError(error: unknown) {
  const text = errorText(error).toLowerCase();
  return (
    text.includes("context_length_exceeded") ||
    text.includes("context window") ||
    text.includes("maximum context") ||
    text.includes("too many tokens")
  );
}

function resolveChatModelId() {
  const fallbackModel = isOpenRouter ? "openai/gpt-oss-120b:free" : "gpt-4o";
  const configuredModel = (env.openaiModel || "").trim() || fallbackModel;
  if (isOpenRouter && !configuredModel.includes("/")) {
    return `openai/${configuredModel}`;
  }

  return configuredModel;
}

function safeErrorMessage(error: unknown) {
  const text = errorText(error) || "Unknown provider error.";
  return text
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .slice(0, 1200);
}

function createPublicProviderError(error: unknown) {
  if (isContextWindowError(error)) return CONTEXT_WINDOW_ERROR_MESSAGE;
  return `AI provider error: ${safeErrorMessage(error)}`;
}

// Chat-specific retry policy — 3 attempts, exponential backoff, provider errors only
const CHAT_RETRY_POLICY = {
  ...RETRY_POLICIES.quick,
  maxAttempts: 3,
  baseDelayMs: 1200,
  maxDelayMs: 8000,
  isRetryable: (error: unknown) => {
    if (error instanceof TypeError) return true; // network failure
    const e = error as { status?: number; code?: string };
    if (typeof e?.status === "number") {
      // Retry on 5xx, 429 (rate limit from provider), 408 (timeout)
      return e.status >= 500 || e.status === 429 || e.status === 408;
    }
    if (e?.code === "ECONNRESET" || e?.code === "ETIMEDOUT") return true;
    return false;
  },
} as const;

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleRouteError(
        new Error("Authentication required."),
        "Authentication required.",
        401,
      );
    }

    // ── Per-user rate limiting ────────────────────────────────────
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil(rateCheck.retryAfterMs / 1000);
      return new Response(
        JSON.stringify({ error: `Too many requests. Please wait ${retryAfterSec}s before trying again.` }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSec),
          },
        },
      );
    }

    const body = await req.json();
    const { messages, ultraThinking = false } = body as {
      messages: UIMessage[];
      ultraThinking?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return handleRouteError(new Error("No messages provided."), "No messages.", 400);
    }

    const modelMessages = sanitizeMessagesForModel(messages);
    if (modelMessages.length === 0) {
      return jsonError("Please enter a shorter prompt or attach a smaller file.", 400);
    }

    if (!modelMessages.some((message) => message.role === "user")) {
      return jsonError("Please enter a message before sending.", 400);
    }

    const modelId = resolveChatModelId();
    const latestUserText = getLatestUserText(modelMessages);
    const clarificationGate = shouldGateForClarification(modelMessages);

    if (CHAT_DEBUG) {
      log.info(`[${requestId}] outgoing chat payload`, {
        messageCount: messages.length,
        modelMessageCount: modelMessages.length,
        latestUserText,
        clarificationGate: Boolean(clarificationGate),
        ultraThinking,
        configuredModel: env.openaiModel,
        resolvedModel: modelId,
        baseURL: env.openaiBaseUrl || "default",
      });
    }

    if (clarificationGate) {
      if (CHAT_DEBUG) {
        log.info(`[${requestId}] clarification gate active`, {
          questions: clarificationGate.questions,
        });
      }

      return createClarificationResponse(modelMessages, clarificationGate.questions);
    }

    if (!env.openaiApiKey) {
      return jsonError(
        "OPENAI_API_KEY is missing. Add it to .env.local and restart the dev server.",
        500,
      );
    }

    if (isOpenRouter && modelId !== env.openaiModel) {
      log.warn("Normalized OpenRouter model slug", {
        configuredModel: env.openaiModel,
        resolvedModel: modelId,
      });
    }

    const creditCost = ultraThinking ? ULTRA_COST : STANDARD_COST;
    await getUserCredits(user.id);

    const credited = CHAT_FREE_TEST_MODE
      ? true
      : await deductCredits(
          user.id,
          creditCost,
          ultraThinking ? "Ultra Chat Generation" : "Chat Generation",
        );

    if (!credited) {
      return handleRouteError(new Error("Not enough credits."), "Not enough credits.", 402);
    }

    const openai = getOpenAIProvider();

    // ── Build streamText result — wrapped in retry for transient provider errors ──
    const result = await withRetry(
      async () => {
        const modelMsgs = await convertToModelMessages(modelMessages, { ignoreIncompleteToolCalls: true });
        return streamText({
          model: isOpenRouter ? openai.chat(modelId) : openai(modelId),
          system: SYSTEM_PROMPT,
          messages: modelMsgs,
      maxOutputTokens: ultraThinking ? ULTRA_MAX_OUTPUT_TOKENS : STANDARD_MAX_OUTPUT_TOKENS,
      stopWhen: stepCountIs(3),
      toolChoice: isAutomationRequest(latestUserText) ? "required" : "auto",
      onError: ({ error }) => {
        log.error(`[${requestId}] streamText provider error`, error);
      },
      onFinish: ({ text, finishReason, usage, totalUsage }) => {
        if (!CHAT_DEBUG) return;
        log.info(`[${requestId}] model stream finished`, {
          finishReason,
          usage,
          totalUsage,
          assistantPreview: text.slice(0, 500),
        });
      },
      tools: {
        buildWorkflow: tool({
          description:
            "Build or update the visual automation workflow graph displayed in the canvas panel. Call this every time the user describes or modifies an automation.",
          inputSchema: z.object({
            nodes: z
              .array(
                z.object({
                  id: z.string().describe("Unique node ID, e.g. 'n1', 'n2', 'n3'"),
                  type: z
                    .enum(["trigger", "process", "action"])
                    .describe("trigger = input event, process = logic/transform, action = output"),
                  label: z
                    .string()
                    .min(3)
                    .max(60)
                    .describe("Short, specific, business-readable label for this step"),
                  detail: z
                    .string()
                    .max(80)
                    .optional()
                    .describe("Optional one-line detail shown beneath the label"),
                  icon: z
                    .string()
                    .optional()
                    .describe("Lucide icon name if appropriate, e.g., 'Mail', 'Slack', 'Database'"),
                }),
              )
              .describe("The steps in the workflow."),
            edges: z
              .array(
                z.object({
                  id: z.string().describe("Unique edge ID, e.g. 'e1-2'"),
                  source: z.string().describe("Source node ID"),
                  target: z.string().describe("Target node ID"),
                }),
              )
              .describe("The connections between steps. Must form a valid directed acyclic graph."),
          }),
          execute: async ({ nodes, edges }) => {
            log.info("Workflow tool executed", { nodes: nodes.length, edges: edges.length });
            return {
              nodes,
              edges,
              workflowName: createWorkflowName(nodes),
              summary: createWorkflowSummary(nodes),
            };
          },
        }),
      },
      });
      },
      CHAT_RETRY_POLICY,
    );

    return result.toUIMessageStreamResponse({
      originalMessages: modelMessages,
      consumeSseStream: CHAT_DEBUG
        ? async ({ stream }) => {
            const reader = stream.getReader();
            let raw = "";
            let truncated = false;

            try {
              while (raw.length < 12000) {
                const { done, value } = await reader.read();
                if (done) break;
                raw += value;
              }

              if (raw.length >= 12000) {
                truncated = true;
                await reader.cancel();
              }

              log.info(`[${requestId}] raw API response`, {
                raw: truncated ? `${raw.slice(0, 12000)}\n...[truncated]` : raw,
              });
            } catch (error) {
              log.error(`[${requestId}] failed to read raw API response`, error);
            } finally {
              reader.releaseLock();
            }
          }
        : undefined,
      onFinish: ({ responseMessage, messages: finishedMessages, finishReason }) => {
        if (!CHAT_DEBUG) return;

        const assistantText = responseMessage.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("");

        log.info(`[${requestId}] parsed assistant message`, {
          finishReason,
          messageCount: finishedMessages.length,
          partTypes: responseMessage.parts.map((part) => part.type),
          assistantPreview: assistantText.slice(0, 500),
        });
      },
      onError: (error) => {
        log.error(`[${requestId}] provider stream failed`, error);
        return createPublicProviderError(error);
      },
    });
  } catch (error) {
    log.error(`[${requestId}] chat stream error`, error);
    if (isContextWindowError(error)) {
      return jsonError(CONTEXT_WINDOW_ERROR_MESSAGE, 413);
    }
    return handleRouteError(error, createPublicProviderError(error));
  }
}
