import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { deductCredits, getUserCredits } from "@/lib/credit-store";
import { handleRouteError } from "@/lib/api";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/chat");

const STANDARD_COST = 5;
const ULTRA_COST = 10;

const openai = createOpenAI({ apiKey: env.openaiApiKey });

const SYSTEM_PROMPT = `You are an expert automation architect for AutomateCraft, a business automation SaaS.

When a user describes a workflow they want to automate, you must:
1. Acknowledge their request briefly and confidently (1-2 sentences max). No filler words.
2. Immediately call the "buildWorkflow" tool to construct the visual automation graph.

Rules for tool calls:
- ALWAYS call buildWorkflow when the user describes an automation.
- Build nodes in this order: trigger first, then process/transform steps, then action/notification last.
- Node labels must be specific and business-readable (e.g. "New Google Form Submission" not "Trigger").
- Node types: "trigger" for input events, "process" for logic/data/filter steps, "action" for outputs/notifications.
- Include 2-6 nodes total.

Rules for conversation:
- If the user asks a modification, acknowledge briefly and call buildWorkflow again with the full updated nodes array.
- If asked a non-automation question, answer concisely without calling the tool.
- Be the confident expert — short, decisive, technically precise responses.

Supported integrations: Google Forms, Google Sheets, WhatsApp, Email/Gmail, Slack, HubSpot, Salesforce, Razorpay, Webhooks, CRM.`;

export async function POST(req: Request) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────
    const user = await getCurrentUser();
    if (!user) {
      return handleRouteError(
        new Error("Authentication required."),
        "Authentication required.",
        401,
      );
    }

    // ── 2. Parse body ────────────────────────────────────────────
    const body = await req.json();
    const { messages, ultraThinking = false } = body as {
      messages: Array<{ role: string; content: string }>;
      ultraThinking?: boolean;
    };

    if (!messages?.length) {
      return handleRouteError(new Error("No messages provided."), "No messages.", 400);
    }

    // ── 3. Credit check + deduction ───────────────────────────────
    await getUserCredits(user.id);
    const creditCost = ultraThinking ? ULTRA_COST : STANDARD_COST;
    const credited = await deductCredits(
      user.id,
      creditCost,
      ultraThinking ? "Ultra Chat Generation" : "Chat Generation",
    );

    if (!credited) {
      return handleRouteError(new Error("Not enough credits."), "Not enough credits.", 402);
    }

    // ── 4. Stream response with tool support ─────────────────────
    const result = streamText({
      model: openai("gpt-4o"),
      system: SYSTEM_PROMPT,
      messages: messages as any,
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
                })
              )
              .describe("The steps in the workflow."),
            edges: z
              .array(
                z.object({
                  id: z.string().describe("Unique edge ID, e.g. 'e1-2'"),
                  source: z.string().describe("Source node ID"),
                  target: z.string().describe("Target node ID"),
                })
              )
              .describe("The connections between steps. Must form a valid directed acyclic graph."),
          }),
        }),
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    log.error("Chat stream error:", error);
    return handleRouteError(error, "Chat processing failed.");
  }
}
