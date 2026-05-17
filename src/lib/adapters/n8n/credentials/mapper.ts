/**
 * Credential mapper — translates AutomateCraft vault credentials into
 * the per-node `credentials` field that n8n nodes consume.
 *
 * After sync, every connection row carries:
 *   metadata.n8nCredentialId    — the n8n credential row's id
 *   metadata.n8nCredentialName  — display name
 *   metadata.n8nCredentialType  — credential type string (e.g. "slackApi")
 *
 * Workflow compilation looks up each node's integration → finds the
 * connection → attaches the n8n credential ID. Nodes then run with
 * fully isolated, n8n-managed secrets.
 */

import {
  getConnection,
} from "@/lib/connections";
import { getOAuthProvider } from "@/lib/oauth";
import type { SupportedIntegration } from "@/lib/workflow";
import type { N8nNodeCredentialAttachment } from "./types";

export type CredentialAttachmentMap = Record<string, N8nNodeCredentialAttachment>;

/**
 * Build the per-integration attachment map for a user. Result keys
 * are n8n credential types ("slackApi" etc.) so node JSON can splice
 * the attachment under `node.credentials[<type>]`.
 */
export async function buildCredentialAttachments(input: {
  userId: string;
  integrations: readonly SupportedIntegration[];
}): Promise<CredentialAttachmentMap> {
  const attachments: CredentialAttachmentMap = {};

  for (const integration of input.integrations) {
    const connection = await getConnection(input.userId, integration);
    const n8nCredentialId =
      (connection?.metadata?.n8nCredentialId as string | undefined) ?? null;
    if (!n8nCredentialId || !connection) continue;

    const providerSlug =
      (connection.metadata.providerSlug as string | undefined) ?? integration;
    let n8nCredentialType: string | undefined;
    try {
      n8nCredentialType = getOAuthProvider(providerSlug).capabilities.n8nCredentialType;
    } catch {
      n8nCredentialType =
        (connection.metadata.n8nCredentialType as string | undefined) ?? undefined;
    }
    if (!n8nCredentialType) continue;

    const n8nCredentialName =
      (connection.metadata.n8nCredentialName as string | undefined) ??
      `automatecraft:${integration}`;

    attachments[n8nCredentialType] = {
      id: n8nCredentialId,
      name: n8nCredentialName,
    };
  }

  return attachments;
}
