/**
 * Top-level n8n compile().
 *
 * Pure function: WorkflowIR → N8nWorkflow shape.
 * Does NOT touch n8n API or vault. Output is ready to be POSTed by
 * `adapter.deploy()`.
 *
 * Steps:
 *   1. Map trigger to its n8n trigger node.
 *   2. Map each IR step to its n8n action node (via step-mapper).
 *   3. Build connections from step.next[] (via graph-builder).
 *   4. Wrap in N8nWorkflow shape with metadata.
 */

import type { WorkflowIR } from "@/lib/workflow";
import type { N8nNode, N8nWorkflow } from "../client/types";
import { mapStepToN8nNode } from "./step-mapper";
import {
  mapTriggerToN8nNode,
  N8N_TRIGGER_NODE_NAME,
} from "./trigger-mapper";
import { buildN8nConnections } from "./graph-builder";
import type { CredentialAttachmentMap } from "../credentials/mapper";
import { getOAuthProvider } from "@/lib/oauth";

export type CompileOptions = {
  /**
   * Per-integration n8n credential attachments, keyed by n8n credential
   * TYPE (not integration slug). Built by
   * `buildCredentialAttachments()`. Omit during pure compile-for-test
   * paths.
   */
  credentialAttachments?: CredentialAttachmentMap;
};

export function compileWorkflowToN8n(
  workflow: WorkflowIR,
  options: CompileOptions = {},
): N8nWorkflow {
  const triggerNode: N8nNode = mapTriggerToN8nNode(workflow.trigger);
  const stepNodes: N8nNode[] = workflow.steps.map((step, index) => {
    const node = mapStepToN8nNode(step, index);
    if (step.integration && options.credentialAttachments) {
      attachCredentialToNode(node, step.integration, options.credentialAttachments);
    }
    return node;
  });

  const connections = buildN8nConnections({
    steps: workflow.steps,
    triggerNodeName: N8N_TRIGGER_NODE_NAME,
  });

  return {
    name: workflow.name,
    active: false, // Adapter activates explicitly after create.
    nodes: [triggerNode, ...stepNodes],
    connections,
    settings: {
      saveExecutionProgress: true,
      saveDataSuccessExecution: "all",
    },
    staticData: null,
  };
}

/**
 * Attach the right n8n credential row to a single node based on the
 * step's integration. The attachment map is keyed by n8n credential
 * type so we resolve via the OAuth provider registry.
 */
function attachCredentialToNode(
  node: N8nNode,
  integration: string,
  attachments: CredentialAttachmentMap,
): void {
  let credentialType: string | undefined;
  try {
    credentialType = getOAuthProvider(integration).capabilities.n8nCredentialType;
  } catch {
    return; // No OAuth provider — node likely uses no credentials.
  }
  const attachment = attachments[credentialType];
  if (!attachment) return;
  node.credentials = {
    ...(node.credentials ?? {}),
    [credentialType]: attachment,
  };
}
