import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  automationWorkflowSchema,
  buildDeterministicWorkflow,
} from "@/lib/automation";
import { env, hasOpenAIKey } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("openai");

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.openaiApiKey,
      ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
    });
  }
  return openaiClient;
}

/* ─────────────────────────────────────────────────────────────────
   STANDARD system prompt (5 credits)
   ─────────────────────────────────────────────────────────────── */
const standardInstructions = `
You are an automation architect for a business automation SaaS.
Convert user prompts into a deterministic automation workflow that matches the provided schema.

Rules:
- Do not invent unrelated workflows or integrations.
- Base the trigger, steps, and required fields on the user's prompt only.
- Keep the trigger concise and business-relevant.
- Return between 2 and 6 steps.
- Only use these integrations: google, whatsapp, email, slack, hubspot, salesforce, razorpay, webhook, forms, sheets, crm.
- Only use these requiredFields when needed: phoneNumber, message, formId, emailAddress, subject, sheetId, webhookUrl, leadSource, customerName, companyName.
- setupFields must be a user-facing dynamic form tailored to the prompt.
- setupFields should use specific labels like "Client WhatsApp number" or "Google Form connection" instead of vague generic names.
- setupFields keys must be short snake_case or kebab-case identifiers.
- setupFields should include the integration when the field belongs to a connected app.
- Prefer 2 to 8 setupFields, and do not duplicate the same question twice.
- details must be a flat object whose values are strings.
- Use steps that can be simulated safely by the platform.
- Prefer webhook or form-driven automations when the user describes an external event.
- For prompts that mention Google Forms and WhatsApp together, include fields for the form connection, the internal WhatsApp number, the submitter's WhatsApp field, and the greeting message content.
`;

/* ─────────────────────────────────────────────────────────────────
   ULTRA THINKING — STARTER PLAN (10 credits)
   Deeper analysis, more precise steps, smarter field mapping.
   Still within the bounds of a Starter plan (up to 6 steps).
   ─────────────────────────────────────────────────────────────── */
const ultraStarterInstructions = `
You are an expert automation architect for a business automation SaaS.
The user has enabled Ultra Thinking mode. Apply deep analysis to produce a MORE PRECISE and USEFUL automation than a standard request.

Ultra Thinking rules for Starter plan:
- Carefully analyze the intent behind the prompt — go beyond the literal words.
- Identify implicit requirements the user may not have stated (e.g., error handling, logging, fallback actions).
- Produce 3 to 6 well-ordered steps with clear, specific names that describe the real business action.
- Each step's details must include a clear "description" and, where applicable, a "fallback" strategy.
- setupFields must be exhaustive: cover every piece of information needed to wire the automation, with detailed helpText.
- Field labels must be business-friendly (e.g., "Team WhatsApp group link" not "phone number").
- Infer the most likely integration for each step even if not explicitly stated by the user.
- Add a data validation or normalization step if the input might be messy (e.g., phone numbers, email formats).
- Only use these integrations: google, whatsapp, email, slack, hubspot, salesforce, razorpay, webhook, forms, sheets, crm.
- Only use these requiredFields when needed: phoneNumber, message, formId, emailAddress, subject, sheetId, webhookUrl, leadSource, customerName, companyName.
- details must be a flat object whose values are strings.
- Max 6 steps (Starter plan limit).
- Do NOT invent steps unrelated to the user's actual request.
`;

/* ─────────────────────────────────────────────────────────────────
   ULTRA THINKING — PLUS / PRO PLAN (10 credits)
   Full deep-reasoning mode: complex multi-step pipelines, advanced
   branching logic, richer field definitions, higher step count.
   ─────────────────────────────────────────────────────────────── */
const ultraPlusInstructions = `
You are a senior automation systems architect for a business automation SaaS.
The user has enabled Ultra Thinking mode on a Plus (or higher) plan. 
Produce the most comprehensive, precise, and production-ready automation workflow possible.

Ultra Thinking — Full Mode rules:
- Perform deep intent analysis: understand the business process end-to-end.
- Identify ALL implicit steps: data validation, error recovery, retries, logging, notifications on failure.
- Produce 4 to 8 steps ordered to reflect a real production pipeline.
- Each step must have a clear, human-readable name that describes the specific business action.
- Each step's details must include: "description", "fallback" (what happens on error), and "dataFlow" (what data moves between steps).
- setupFields must be comprehensive and production-ready:
  - Cover every credential, configuration, and mapping the automation needs.
  - Write helpText as if explaining to a non-technical business owner.
  - Use field types precisely: phone for WhatsApp numbers, email for email fields, select for enumerable options.
  - Prefer specific labels like "Lead's WhatsApp number from form field" over "phone".
- Add a conditional branching step if the workflow has multiple outcomes (e.g., new vs. returning customer).
- Add a logging or audit step at the end when the automation modifies data.
- Infer the best integrations based on the business context, even if not explicitly stated.
- Only use these integrations: google, whatsapp, email, slack, hubspot, salesforce, razorpay, webhook, forms, sheets, crm.
- Only use these requiredFields when needed: phoneNumber, message, formId, emailAddress, subject, sheetId, webhookUrl, leadSource, customerName, companyName.
- details must be a flat object whose values are strings.
- Max 8 steps.
- The output must feel like it was designed by a senior solutions engineer, not an AI chatbot.
`;

/* ─────────────────────────────────────────────────────────────────
   Exported generation options type
   ─────────────────────────────────────────────────────────────── */
export type GenerationOptions = {
  ultraThinking?: boolean;
  hasSubscription?: boolean; // true = Plus or above
};

/* ─────────────────────────────────────────────────────────────────
   Choose system prompt based on mode + plan
   ─────────────────────────────────────────────────────────────── */
function resolveSystemPrompt(opts: GenerationOptions): string {
  if (!opts.ultraThinking) return standardInstructions;
  return opts.hasSubscription ? ultraPlusInstructions : ultraStarterInstructions;
}

/* ─────────────────────────────────────────────────────────────────
   Choose model reasoning effort based on mode + plan
   ─────────────────────────────────────────────────────────────── */
function resolveReasoningEffort(opts: GenerationOptions): "low" | "medium" | "high" {
  if (!opts.ultraThinking) return "low";
  return opts.hasSubscription ? "high" : "medium";
}

/* ─────────────────────────────────────────────────────────────────
   Main generation function
   ─────────────────────────────────────────────────────────────── */
export async function generateWorkflowFromPrompt(
  prompt: string,
  opts: GenerationOptions = {}
) {
  log.info("Starting workflow generation. Ultra:", opts.ultraThinking, "Plan:", opts.hasSubscription ? "plus" : "starter");

  if (!hasOpenAIKey()) {
    log.info("No OPENAI_API_KEY found. Using fallback generator.");
    return {
      workflow: buildDeterministicWorkflow(prompt),
      source: "fallback" as const,
      ultraThinking: opts.ultraThinking ?? false,
    };
  }

  try {
    const systemPrompt = resolveSystemPrompt(opts);
    const reasoningEffort = resolveReasoningEffort(opts);

    log.info("Using OpenAI model:", env.openaiModel, "| reasoning effort:", reasoningEffort);

    const openai = getOpenAIClient();
    const response = await openai.responses.parse({
      model: env.openaiModel,
      reasoning: { effort: reasoningEffort },
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      text: {
        format: zodTextFormat(automationWorkflowSchema, "automation_workflow"),
      },
    });

    const workflow = automationWorkflowSchema.parse(response.output_parsed);
    log.info("Workflow generation succeeded.");

    return {
      workflow,
      source: "openai" as const,
      ultraThinking: opts.ultraThinking ?? false,
    };
  } catch (error) {
    log.error("Workflow generation failed.", error);
    throw error;
  }
}
