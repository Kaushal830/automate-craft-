/**
 * IR step graph → n8n connections graph.
 *
 * n8n represents connections as:
 *   { "<sourceNodeName>": { "main": [[ { node, type:"main", index } ]] } }
 *
 * IR uses `step.next: string[]` where each entry is a target step ID.
 * We translate by:
 *   - First entry of next[] → connections[<source>].main[0]
 *   - Second entry of next[] → connections[<source>].main[1] (n8n branches)
 *   - etc.
 *
 * The trigger node is always connected to the first IR step (the
 * "root") via main[0]. Pure function — no side effects.
 */

import type { Step } from "@/lib/workflow";
import type { N8nConnections } from "../client/types";

export type GraphBuilderInput = {
  steps: Step[];
  triggerNodeName: string;
};

export function buildN8nConnections(input: GraphBuilderInput): N8nConnections {
  const connections: N8nConnections = {};

  // Identify root step (no incoming edge) for trigger → root link.
  const incoming = new Set<string>();
  for (const step of input.steps) {
    for (const target of step.next) incoming.add(target);
  }
  const rootStep = input.steps.find((s) => !incoming.has(s.id));
  if (rootStep) {
    connections[input.triggerNodeName] = {
      main: [[{ node: rootStep.id, type: "main", index: 0 }]],
    };
  }

  for (const step of input.steps) {
    if (step.next.length === 0) continue;
    connections[step.id] = {
      main: step.next.map((target) => [
        { node: target, type: "main" as const, index: 0 },
      ]),
    };
  }

  return connections;
}
