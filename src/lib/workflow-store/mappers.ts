/**
 * Mappers — convert Supabase rows ↔ domain types.
 *
 * Centralizing row mapping keeps repositories small and ensures DB
 * column naming changes only touch one file.
 */

import { z } from "zod";
import {
  WorkflowSchemaError,
  workflowVersionSchema,
  type WorkflowVersion,
} from "@/lib/workflow";

/**
 * Map a workflow_versions row into a domain WorkflowVersion.
 *
 * Throws WorkflowSchemaError if the row violates the schema (which
 * would indicate corrupted data — fail loudly).
 */
export function mapVersionRow(row: Record<string, unknown>): WorkflowVersion {
  try {
    return workflowVersionSchema.parse({
      id: row.id,
      automationId: row.automation_id,
      userId: row.user_id,
      versionNumber: row.version_number,
      workflow: row.workflow,
      prompt: row.prompt ?? null,
      source: row.source,
      cost: row.cost,
      activated: row.activated,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw WorkflowSchemaError.fromZodError(error, "workflow_versions row");
    }
    throw error;
  }
}
