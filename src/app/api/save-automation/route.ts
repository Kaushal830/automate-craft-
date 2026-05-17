/**
 * POST /api/save-automation
 *
 * Persists a generated workflow as a new automation. Accepts EITHER:
 *   - { ir, formInputs, integrationStatus, prompt? }            (preferred — Phase 1+)
 *   - { workflow (legacy), formInputs, integrationStatus }       (backward-compat — Phase 0)
 *
 * Save flow:
 *   1. Auth check.
 *   2. Validate input shape.
 *   3. If only legacy workflow provided, project it back to IR.
 *   4. Run full IR validation (sanitize → schema parse → semantic).
 *   5. Persist via `saveNewAutomationWithVersion()`:
 *        - Create automation row (legacy + IR dual-write).
 *        - Create workflow_versions row (activated=true).
 *        - Patch automation.current_version_id.
 *
 * Response shape:
 *   {
 *     automation:  AutomationRecord,
 *     ir:          WorkflowIR,
 *     version:     { id, versionNumber, source, createdAt, cost }
 *   }
 */

import { z } from "zod";
import {
  automationConfigSchema,
  automationWorkflowSchema,
  connectionStatusSchema,
} from "@/lib/automation";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/api";
import { createLogger } from "@/lib/logger";
import {
  isWorkflowError,
  projectLegacyToIR,
  sanitizeWorkflowIR,
  validateWorkflow,
  workflowIRSchema,
  WorkflowSchemaError,
  type PlanTier,
  type VersionSource,
  type WorkflowIR,
} from "@/lib/workflow";
import { getUserCredits } from "@/lib/credit-store";
import { saveNewAutomationWithVersion } from "@/lib/workflow-store";

const log = createLogger("api/save-automation");

const integrationStatusMap = z.record(z.string(), connectionStatusSchema);

const saveWithIRSchema = z.object({
  ir: z.unknown(),
  formInputs: automationConfigSchema,
  integrationStatus: integrationStatusMap,
  prompt: z.string().trim().max(2000).optional(),
  source: z
    .enum(["openai", "claude", "gemini", "fallback", "manual", "import"])
    .optional()
    .default("manual"),
  cost: z.number().int().nonnegative().optional().default(0),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const saveLegacySchema = z.object({
  workflow: automationWorkflowSchema,
  formInputs: automationConfigSchema,
  integrationStatus: integrationStatusMap,
  prompt: z.string().trim().max(2000).optional(),
  source: z
    .enum(["openai", "claude", "gemini", "fallback", "manual", "import"])
    .optional()
    .default("manual"),
  cost: z.number().int().nonnegative().optional().default(0),
});

type ParsedRequest = {
  ir: WorkflowIR;
  formInputs: Record<string, string>;
  integrationStatus: Record<string, "connected" | "disconnected">;
  prompt: string | null;
  source: VersionSource;
  cost: number;
  metadata: Record<string, unknown>;
};

function parseRequest(body: unknown, plan: PlanTier): ParsedRequest {
  // Try the IR-shaped payload first.
  const irAttempt = saveWithIRSchema.safeParse(body);
  if (irAttempt.success) {
    const sanitized = sanitizeWorkflowIR(irAttempt.data.ir);
    const parsed = workflowIRSchema.safeParse(sanitized);
    if (!parsed.success) {
      throw WorkflowSchemaError.fromZodError(parsed.error, "save-automation IR");
    }
    const validation = validateWorkflow(parsed.data, { plan });
    return {
      ir: validation.workflow,
      formInputs: irAttempt.data.formInputs,
      integrationStatus: irAttempt.data.integrationStatus,
      prompt: irAttempt.data.prompt ?? null,
      source: irAttempt.data.source,
      cost: irAttempt.data.cost,
      metadata: irAttempt.data.metadata,
    };
  }

  // Fallback: legacy workflow shape from older clients.
  const legacyAttempt = saveLegacySchema.parse(body);
  const ir = projectLegacyToIR(legacyAttempt.workflow);
  const validation = validateWorkflow(ir, { plan });
  return {
    ir: validation.workflow,
    formInputs: legacyAttempt.formInputs,
    integrationStatus: legacyAttempt.integrationStatus,
    prompt: legacyAttempt.prompt ?? null,
    source: legacyAttempt.source,
    cost: legacyAttempt.cost,
    metadata: { promotedFromLegacy: true },
  };
}

export async function POST(request: Request) {
  log.info("Request received.");

  try {
    /* ── Auth ────────────────────────────────────────────── */
    const user = await getCurrentUser();
    if (!user) {
      return handleRouteError(
        new Error("Authentication required."),
        "Authentication required.",
        401,
      );
    }

    /* ── Plan tier ───────────────────────────────────────── */
    const credits = await getUserCredits(user.id);
    const planTier: PlanTier = credits.hasSubscription ? "plus" : "starter";

    /* ── Parse + validate body ───────────────────────────── */
    const body = await request.json().catch(() => null);
    const parsed = parseRequest(body, planTier);

    /* ── Persist (dual-write automation + version) ──────── */
    const outcome = await saveNewAutomationWithVersion({
      userId: user.id,
      ir: parsed.ir,
      formInputs: parsed.formInputs,
      integrationStatus: parsed.integrationStatus,
      status: "active",
      prompt: parsed.prompt,
      source: parsed.source,
      cost: parsed.cost,
      metadata: parsed.metadata,
    });

    log.info("Automation saved with version.", {
      automationId: outcome.automation.id,
      versionId: outcome.version.id,
      versionNumber: outcome.version.versionNumber,
    });

    return Response.json({
      automation: outcome.automation,
      ir: parsed.ir,
      version: {
        id: outcome.version.id,
        versionNumber: outcome.version.versionNumber,
        source: outcome.version.source,
        createdAt: outcome.version.createdAt,
        cost: outcome.version.cost,
      },
    });
  } catch (error) {
    log.error("Request failed.", error);
    if (isWorkflowError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not save automation.");
  }
}
