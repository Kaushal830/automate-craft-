/**
 * Credential resolver.
 *
 * Walks a `WorkflowIR` and produces an `Credentials` map ready to pass
 * to `adapter.deploy()`. Resolves:
 *   - Every `ParamRef { source: "secret", ref: "<name>" }` → vault entry
 *   - Every integration referenced by trigger/steps that requires a
 *     credential (per integration metadata, Phase 4)
 *
 * The resolver is the ONLY place that converts vault rows into
 * plaintext destined for an external executor. Failure modes:
 *   - missing vault row → `WorkflowValidationError` with details
 *   - integration unknown → ignored (orchestrator decides)
 *
 * Phase 2 implements the "explicit secret refs" path. Phase 4 will
 * extend this with per-integration credential auto-discovery (e.g.
 * any step using slack → resolve "slack/default").
 */

import {
  WorkflowValidationError,
  type SupportedIntegration,
  type WorkflowIR,
} from "@/lib/workflow";
import type { Credentials } from "@/lib/adapters";
import { createLogger } from "@/lib/logger";
import { getCredential } from "./vault";
import type { DecryptedCredential } from "./types";

const log = createLogger("credentials/resolver");

export type ResolveCredentialsInput = {
  userId: string;
  workflow: WorkflowIR;
};

/**
 * Resolve every credential referenced by the workflow.
 *
 * Output shape: `{ "<integration>::<name>": { type, data } }`. Adapters
 * key into this map at deploy time.
 */
export async function resolveCredentialsForWorkflow(
  input: ResolveCredentialsInput,
): Promise<Credentials> {
  const refs = collectSecretRefs(input.workflow);
  const credentials: Credentials = {};

  log.info("Resolving credentials.", {
    userId: input.userId,
    refCount: refs.length,
  });

  for (const ref of refs) {
    const decrypted = await getCredential({
      userId: input.userId,
      integration: ref.integration,
      name: ref.name,
    });

    if (!decrypted) {
      throw new WorkflowValidationError(
        `Missing credential "${ref.name}" for integration "${ref.integration}".`,
        {
          integration: ref.integration,
          credentialName: ref.name,
          stepId: ref.sourceStepId,
        },
      );
    }

    credentials[`${ref.integration}::${ref.name}`] = toAdapterCredential(decrypted);
  }

  return credentials;
}

/* ─── Internal: collect refs from IR ─────────────────────────────── */

type SecretRef = {
  integration: SupportedIntegration | string;
  name: string;
  sourceStepId: string | null;
};

/**
 * Walk the IR and collect every distinct (integration, name) credential
 * reference. Today we look at `ParamRef { source: "secret" }`.
 *
 * The integration is inferred from the step that owns the param. If the
 * step has no integration (built-in transform/condition/etc.), we skip
 * the ref — built-ins should not need credentials.
 */
function collectSecretRefs(workflow: WorkflowIR): SecretRef[] {
  const seen = new Set<string>();
  const refs: SecretRef[] = [];

  for (const step of workflow.steps) {
    if (!step.integration) continue;
    for (const paramRef of Object.values(step.params)) {
      if (paramRef.source !== "secret") continue;
      const key = `${step.integration}::${paramRef.ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({
        integration: step.integration,
        name: paramRef.ref,
        sourceStepId: step.id,
      });
    }
  }

  return refs;
}

/**
 * Map a vault row into the adapter-facing credential shape.
 * The adapter is responsible for translating into its native
 * credential format (n8n credentials API, etc.).
 */
function toAdapterCredential(
  decrypted: DecryptedCredential,
): { type: string; data: Record<string, unknown> } {
  return {
    type: decrypted.integration,
    data: decrypted.payload,
  };
}
