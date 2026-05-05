export type AutomationIntegration = {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
};

export type AutomationBlueprint = {
  trigger: string;
  actions: string[];
  output: string;
  integrations: AutomationIntegration[];
  estimatedCost: number;
};

export type MessageRole = "user" | "ai" | "system";

export type AutomationMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  blueprint?: AutomationBlueprint;
  isStreaming?: boolean;
};

export type AutomationSession = {
  id: string;
  title: string;
  createdAt: number;
  messages: AutomationMessage[];
};
