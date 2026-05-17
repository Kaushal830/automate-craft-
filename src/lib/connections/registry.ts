/**
 * Integration registry.
 *
 * Per-integration metadata used by the connection service:
 *   - display name + tagline (UI)
 *   - auth kind (oauth2 / api_key / no_auth)
 *   - default vault credential name (`"default"`)
 *   - OAuth URL builder + callback path (Phase 4)
 *
 * Phase 2 ships a metadata-only registry; OAuth flow implementations
 * land in Phase 4. The interface stays stable so adding a new provider
 * is one entry here + one provider file.
 */

import type { SupportedIntegration } from "@/lib/workflow";

export type IntegrationAuthKind = "oauth2" | "api_key" | "no_auth";

export type IntegrationMetadata = {
  integration: SupportedIntegration;
  displayName: string;
  tagline: string;
  authKind: IntegrationAuthKind;
  /** Default vault credential name used by deploy resolver. */
  defaultCredentialName: string;
  /** OAuth scopes requested when authKind="oauth2". */
  defaultScopes: readonly string[];
  /** Documentation URL — shown in UI. */
  docsUrl?: string;
};

const REGISTRY: Record<SupportedIntegration, IntegrationMetadata> = {
  google: {
    integration: "google",
    displayName: "Google",
    tagline: "Google Workspace — Drive, Forms, Sheets.",
    authKind: "oauth2",
    defaultCredentialName: "default",
    defaultScopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/forms.responses.readonly",
    ],
  },
  whatsapp: {
    integration: "whatsapp",
    displayName: "WhatsApp Business",
    tagline: "Send messages and templates via the WhatsApp Business API.",
    authKind: "api_key",
    defaultCredentialName: "default",
    defaultScopes: [],
  },
  email: {
    integration: "email",
    displayName: "Email",
    tagline: "Transactional email via SMTP or provider API.",
    authKind: "api_key",
    defaultCredentialName: "default",
    defaultScopes: [],
  },
  slack: {
    integration: "slack",
    displayName: "Slack",
    tagline: "Post messages and react to events in Slack workspaces.",
    authKind: "oauth2",
    defaultCredentialName: "default",
    defaultScopes: ["chat:write", "channels:read"],
  },
  hubspot: {
    integration: "hubspot",
    displayName: "HubSpot",
    tagline: "Sync contacts and deals with HubSpot CRM.",
    authKind: "oauth2",
    defaultCredentialName: "default",
    defaultScopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"],
  },
  salesforce: {
    integration: "salesforce",
    displayName: "Salesforce",
    tagline: "Sync leads and opportunities with Salesforce.",
    authKind: "oauth2",
    defaultCredentialName: "default",
    defaultScopes: ["api", "refresh_token"],
  },
  razorpay: {
    integration: "razorpay",
    displayName: "Razorpay",
    tagline: "Accept payments and trigger workflows on Razorpay events.",
    authKind: "api_key",
    defaultCredentialName: "default",
    defaultScopes: [],
  },
  stripe: {
    integration: "stripe",
    displayName: "Stripe",
    tagline: "Accept payments and react to Stripe events.",
    authKind: "api_key",
    defaultCredentialName: "default",
    defaultScopes: [],
  },
  webhook: {
    integration: "webhook",
    displayName: "Webhooks",
    tagline: "Inbound and outbound HTTP webhooks.",
    authKind: "no_auth",
    defaultCredentialName: "default",
    defaultScopes: [],
  },
  forms: {
    integration: "forms",
    displayName: "Forms",
    tagline: "Capture form submissions from any provider.",
    authKind: "no_auth",
    defaultCredentialName: "default",
    defaultScopes: [],
  },
  sheets: {
    integration: "sheets",
    displayName: "Google Sheets",
    tagline: "Read and write rows in Google Sheets.",
    authKind: "oauth2",
    defaultCredentialName: "default",
    defaultScopes: ["https://www.googleapis.com/auth/spreadsheets"],
  },
  crm: {
    integration: "crm",
    displayName: "Generic CRM",
    tagline: "Connect any CRM via standard contact and deal endpoints.",
    authKind: "api_key",
    defaultCredentialName: "default",
    defaultScopes: [],
  },
};

export function getIntegrationMetadata(
  integration: SupportedIntegration,
): IntegrationMetadata {
  return REGISTRY[integration];
}

export function listIntegrationMetadata(): IntegrationMetadata[] {
  return Object.values(REGISTRY);
}

export function requiresCredential(integration: SupportedIntegration): boolean {
  return REGISTRY[integration].authKind !== "no_auth";
}
