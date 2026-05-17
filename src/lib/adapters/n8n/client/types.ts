/**
 * Subset of n8n REST API shapes we use.
 *
 * Kept narrow on purpose. We only declare the fields the adapter
 * actually reads/writes. Future n8n version drift only affects the
 * fields here — narrow surface = small breakage area.
 */

export type N8nNodeParameters = Record<string, unknown>;

export type N8nNode = {
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: N8nNodeParameters;
  credentials?: Record<string, { id: string; name: string }>;
  /** Disable a node (used for pause). */
  disabled?: boolean;
};

export type N8nConnections = Record<
  string,
  { main: Array<Array<{ node: string; type: "main"; index: number }>> }
>;

export type N8nWorkflow = {
  name: string;
  active?: boolean;
  nodes: N8nNode[];
  connections: N8nConnections;
  settings?: { saveExecutionProgress?: boolean; saveDataSuccessExecution?: string };
  staticData?: Record<string, unknown> | null;
};

/** Response shape for POST /workflows. */
export type N8nWorkflowResponse = {
  id: string;
  active: boolean;
  name: string;
};

/** Response shape for POST /workflows/{id}/activate. */
export type N8nActivateResponse = {
  id: string;
  active: boolean;
};

/** Execution kick-off response. */
export type N8nExecutionResponse = {
  executionId: string;
};

/** Execution status response. */
export type N8nExecutionStatus = {
  id: string;
  finished: boolean;
  stoppedAt?: string;
  status: "new" | "running" | "success" | "error" | "canceled" | "waiting";
  data?: {
    resultData?: {
      runData?: Record<
        string,
        Array<{
          startTime?: number;
          executionTime?: number;
          error?: { message?: string };
          data?: { main?: Array<Array<Record<string, unknown>>> };
        }>
      >;
    };
  };
};
