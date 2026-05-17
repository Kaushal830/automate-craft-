/**
 * n8n credential REST API shapes.
 *
 * Narrow on purpose — we only declare fields the adapter reads/writes.
 */

export type N8nCredentialCreatePayload = {
  name: string;
  type: string;
  data: Record<string, unknown>;
};

export type N8nCredentialResponse = {
  id: string;
  name: string;
  type: string;
};

/**
 * Per-node attachment shape used inside n8n workflow JSON.
 *
 *   credentials: {
 *     "<n8n credential type>": { id: "...", name: "..." }
 *   }
 */
export type N8nNodeCredentialAttachment = {
  id: string;
  name: string;
};
