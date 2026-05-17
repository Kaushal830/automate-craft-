/**
 * Connection domain types.
 *
 * A "connection" represents a user's binding to a third-party
 * integration (Slack workspace, Google account, WhatsApp business
 * account, etc.). It has an OAuth/API-key lifecycle independent of the
 * raw secret material (which lives in the vault).
 *
 *   connections        ← who/which/lifecycle
 *   credentials_vault  ← actual secret payload
 *
 * The split keeps responsibilities clean:
 *   - "Is the user connected to Slack?" → query connections
 *   - "Decrypt their token" → query vault (only at deploy time)
 */

import { z } from "zod";
import { integrationSchema } from "@/lib/workflow";

export const connectionStatusSchema = z.enum([
  "pending",
  "connected",
  "expired",
  "revoked",
]);
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;

export const connectionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  integration: integrationSchema,
  status: connectionStatusSchema,
  /** Friendly account name shown in the UI ("ops@company.com"). */
  displayName: z.string().nullable(),
  /** OAuth scopes granted. */
  scopes: z.array(z.string()).default([]),
  /** Free-form per-integration data (workspace ID, user ID, etc.). */
  metadata: z.record(z.string(), z.unknown()).default({}),
  /** When the OAuth access token expires; null for non-OAuth. */
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Connection = z.infer<typeof connectionSchema>;

export type CreateConnectionInput = {
  userId: string;
  integration: Connection["integration"];
  status?: ConnectionStatus;
  displayName?: string | null;
  scopes?: string[];
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
};

export type UpdateConnectionInput = {
  status?: ConnectionStatus;
  displayName?: string | null;
  scopes?: string[];
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
};
