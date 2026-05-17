/**
 * Deployment domain types.
 *
 * A `Deployment` represents one adapter's deployable view of an
 * automation. There is at most one ACTIVE deployment per (automation,
 * adapter); historical rows (failed, replaced) coexist for audit.
 */

import { z } from "zod";
import { DEPLOYMENT_STATES } from "../states";

export const deploymentStateSchema = z.enum(DEPLOYMENT_STATES);

export const deploymentSchema = z.object({
  id: z.string().uuid(),
  automationId: z.string().uuid(),
  userId: z.string().uuid(),
  versionId: z.string().uuid(),
  adapter: z.string().min(1),
  state: deploymentStateSchema,
  /** Adapter-opaque handle. n8n: { workflowId, ... }. */
  externalRef: z.record(z.string(), z.unknown()).nullable(),
  lastError: z.string().nullable(),
  deployedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Deployment = z.infer<typeof deploymentSchema>;

export type CreateDeploymentInput = {
  automationId: string;
  userId: string;
  versionId: string;
  adapter: string;
  state?: Deployment["state"];
  externalRef?: Record<string, unknown> | null;
};
