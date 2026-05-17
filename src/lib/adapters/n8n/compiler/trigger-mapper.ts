/**
 * IR Trigger → n8n trigger node mapper.
 *
 * Each IR trigger kind maps to a specific n8n trigger node type.
 * The mapping table lives here; adding a kind = entry + handler.
 */

import type { Trigger } from "@/lib/workflow";
import type { N8nNode } from "../client/types";

const TRIGGER_NODE_NAME = "automatecraft_trigger";

export function mapTriggerToN8nNode(trigger: Trigger): N8nNode {
  switch (trigger.kind) {
    case "manual":
      return {
        name: TRIGGER_NODE_NAME,
        type: "n8n-nodes-base.manualTrigger",
        typeVersion: 1,
        position: [240, 300],
        parameters: {},
      };

    case "webhook":
      return {
        name: TRIGGER_NODE_NAME,
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [240, 300],
        parameters: {
          httpMethod: "POST",
          path: trigger.config.event ?? "automatecraft",
          responseMode: "lastNode",
          options: {},
        },
      };

    case "form":
      return {
        name: TRIGGER_NODE_NAME,
        type: "n8n-nodes-base.formTrigger",
        typeVersion: 2,
        position: [240, 300],
        parameters: {
          formTitle: "Submission",
          formDescription: "Triggered by AutomateCraft",
          formFields: [],
        },
      };

    case "schedule":
      return {
        name: TRIGGER_NODE_NAME,
        type: "n8n-nodes-base.scheduleTrigger",
        typeVersion: 1,
        position: [240, 300],
        parameters: {
          rule: {
            interval: [
              {
                field: "cronExpression",
                expression: trigger.config.cron,
              },
            ],
          },
          timezone: trigger.config.timezone,
        },
      };

    case "event":
      // Event-style triggers are integration-specific. n8n typically
      // exposes these as dedicated nodes (e.g. Stripe Trigger). Phase
      // 4 will expand the lookup table; for now route through webhook.
      return {
        name: TRIGGER_NODE_NAME,
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [240, 300],
        parameters: {
          httpMethod: "POST",
          path: `event/${trigger.integration}/${trigger.config.eventName}`,
          responseMode: "lastNode",
          options: {},
        },
      };

    default: {
      const exhaustive: never = trigger;
      void exhaustive;
      throw new Error("Unsupported trigger kind.");
    }
  }
}

export const N8N_TRIGGER_NODE_NAME = TRIGGER_NODE_NAME;
