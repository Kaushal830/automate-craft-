/**
 * n8n REST HTTP client.
 *
 * Thin fetch wrapper. Reads `N8N_API_URL` + `N8N_API_KEY` from env at
 * call time (not at import time) so missing config produces a clear
 * runtime error instead of an import failure.
 *
 * The client is deliberately small — it knows about REST verbs and
 * auth headers, but not about workflow shapes. Mappers + adapter own
 * the n8n-shape vocabulary.
 */

import { env, hasN8nConfigured } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import type {
  N8nActivateResponse,
  N8nExecutionResponse,
  N8nExecutionStatus,
  N8nWorkflow,
  N8nWorkflowResponse,
} from "./types";
import type {
  N8nCredentialCreatePayload,
  N8nCredentialResponse,
} from "../credentials/types";

const log = createLogger("adapters/n8n/client");

class N8nNotConfiguredError extends Error {
  constructor() {
    super(
      "n8n adapter not configured. Set N8N_API_URL and N8N_API_KEY in env.",
    );
    this.name = "N8nNotConfiguredError";
  }
}

class N8nApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    message: string,
  ) {
    super(message);
    this.name = "N8nApiError";
  }
}

function ensureConfigured(): { baseUrl: string; apiKey: string } {
  if (!hasN8nConfigured()) {
    throw new N8nNotConfiguredError();
  }
  return {
    baseUrl: env.n8nApiUrl!.replace(/\/+$/, ""),
    apiKey: env.n8nApiKey!,
  };
}

async function request<TBody, TResponse>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: TBody,
  signal?: AbortSignal,
): Promise<TResponse> {
  const { baseUrl, apiKey } = ensureConfigured();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  log.debug("n8n request", { method, path });

  const response = await fetch(url, {
    method,
    headers: {
      "X-N8N-API-KEY": apiKey,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await response.text();
  if (!response.ok) {
    log.error("n8n request failed", { status: response.status, body: text });
    throw new N8nApiError(
      response.status,
      text,
      `n8n ${method} ${path} failed with ${response.status}: ${text.slice(0, 240)}`,
    );
  }

  return text ? (JSON.parse(text) as TResponse) : (undefined as unknown as TResponse);
}

/* ─── Public API ─────────────────────────────────────────────────── */

export const n8nClient = {
  createWorkflow(workflow: N8nWorkflow, signal?: AbortSignal) {
    return request<N8nWorkflow, N8nWorkflowResponse>(
      "POST",
      "/workflows",
      workflow,
      signal,
    );
  },

  updateWorkflow(workflowId: string, patch: Partial<N8nWorkflow>, signal?: AbortSignal) {
    return request<Partial<N8nWorkflow>, N8nWorkflowResponse>(
      "PATCH",
      `/workflows/${workflowId}`,
      patch,
      signal,
    );
  },

  deleteWorkflow(workflowId: string, signal?: AbortSignal) {
    return request<undefined, void>(
      "DELETE",
      `/workflows/${workflowId}`,
      undefined,
      signal,
    );
  },

  activateWorkflow(workflowId: string, signal?: AbortSignal) {
    return request<undefined, N8nActivateResponse>(
      "POST",
      `/workflows/${workflowId}/activate`,
      undefined,
      signal,
    );
  },

  deactivateWorkflow(workflowId: string, signal?: AbortSignal) {
    return request<undefined, N8nActivateResponse>(
      "POST",
      `/workflows/${workflowId}/deactivate`,
      undefined,
      signal,
    );
  },

  triggerExecution(
    workflowId: string,
    payload: unknown,
    signal?: AbortSignal,
  ) {
    return request<{ workflowData?: unknown; payload?: unknown }, N8nExecutionResponse>(
      "POST",
      `/workflows/${workflowId}/execute`,
      { payload },
      signal,
    );
  },

  getExecution(executionId: string, signal?: AbortSignal) {
    return request<undefined, N8nExecutionStatus>(
      "GET",
      `/executions/${executionId}`,
      undefined,
      signal,
    );
  },

  /* ─── Credentials ──────────────────────────────────────────── */

  createCredential(payload: N8nCredentialCreatePayload, signal?: AbortSignal) {
    return request<N8nCredentialCreatePayload, N8nCredentialResponse>(
      "POST",
      `/credentials`,
      payload,
      signal,
    );
  },

  updateCredential(
    credentialId: string,
    payload: N8nCredentialCreatePayload,
    signal?: AbortSignal,
  ) {
    return request<N8nCredentialCreatePayload, N8nCredentialResponse>(
      "PATCH",
      `/credentials/${credentialId}`,
      payload,
      signal,
    );
  },

  deleteCredential(credentialId: string, signal?: AbortSignal) {
    return request<undefined, void>(
      "DELETE",
      `/credentials/${credentialId}`,
      undefined,
      signal,
    );
  },
};

export { N8nApiError, N8nNotConfiguredError };
