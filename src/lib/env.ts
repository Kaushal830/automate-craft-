const openaiBaseUrl = process.env.OPENAI_BASE_URL;
const defaultOpenAIModel = openaiBaseUrl?.includes("openrouter.ai")
  ? "openai/gpt-oss-120b:free"
  : "gpt-4o";

export const env = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiBaseUrl,
  openaiModel: process.env.OPENAI_MODEL || defaultOpenAIModel,
  openrouterSiteUrl:
    process.env.OPENROUTER_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000",
  openrouterAppName: process.env.OPENROUTER_APP_NAME || "AutomateCraft",
  /**
   * Active workflow generation provider. One of: "openai" | "claude" | "gemini".
   * Defaults to "openai". Provider implementations live under src/lib/ai/providers.
   */
  workflowProvider: process.env.WORKFLOW_PROVIDER || "openai",
  /** Reserved for Phase 2 — Anthropic Claude provider. */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4",
  /** Reserved for Phase 2 — Google Gemini provider. */
  googleApiKey: process.env.GOOGLE_API_KEY,
  googleModel: process.env.GOOGLE_MODEL || "gemini-1.5-pro",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openAccessMode: process.env.OPEN_ACCESS_MODE,
  sessionSecret: process.env.SESSION_SECRET || "automatecraft-dev-session-secret",

  /* ── Execution adapter (Phase 2) ─────────────────────────────── */
  /** Active execution adapter. One of: "n8n" | "temporal" | "inngest". */
  executionAdapter: process.env.EXECUTION_ADAPTER || "n8n",

  /* ── n8n adapter ─────────────────────────────────────────────── */
  /** Self-hosted n8n base URL. Example: https://n8n.example.com/api/v1 */
  n8nApiUrl: process.env.N8N_API_URL,
  /** n8n personal access token. */
  n8nApiKey: process.env.N8N_API_KEY,
  /** Optional shared secret for n8n → backend webhook callbacks. */
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET,

  /* ── Credential vault (Phase 2) ──────────────────────────────── */
  /**
   * 32-byte AES-256-GCM key (base64). REQUIRED in production. In
   * development, a deterministic dev key is auto-generated if missing
   * and a warning is logged.
   */
  credentialVaultKey: process.env.CREDENTIAL_VAULT_KEY,
  /** Logical key version. Allows future key rotation without rewrites. */
  credentialVaultKeyId: process.env.CREDENTIAL_VAULT_KEY_ID || "v1",

  /* ── Rate limiting (Phase 2) ─────────────────────────────────── */
  /** "memory" (default) or "redis" (future). */
  rateLimitDriver: process.env.RATE_LIMIT_DRIVER || "memory",
  rateLimitRedisUrl: process.env.RATE_LIMIT_REDIS_URL,

  /** Public site URL — used by webhook URL builders. */
  publicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",

  /** App environment — drives dev-mode safety toggles. */
  nodeEnv: process.env.NODE_ENV || "development",

  /* ── OAuth provider credentials (Phase 4) ────────────────────── */
  oauth: {
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    },
    slack: {
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
    },
    hubspot: {
      clientId: process.env.HUBSPOT_CLIENT_ID,
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    },
    notion: {
      clientId: process.env.NOTION_CLIENT_ID,
      clientSecret: process.env.NOTION_CLIENT_SECRET,
    },
    stripe: {
      clientId: process.env.STRIPE_CLIENT_ID,
      clientSecret: process.env.STRIPE_CLIENT_SECRET,
    },
    airtable: {
      clientId: process.env.AIRTABLE_CLIENT_ID,
      clientSecret: process.env.AIRTABLE_CLIENT_SECRET,
    },
    salesforce: {
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    },
  },
} as const;

/* LOGIC EXPLAINED:
Supabase auth was previously treated as "configured" only when the service-role
key was present. That blocked normal email/password login even though Supabase
Auth only needs the public URL and publishable key. This fix separates public
auth mode from admin/database mode so sign up, login, and sessions work with
the provided frontend credentials, while admin-only database features still
check for the service-role key explicitly.
*/
export function isSupabaseAuthEnabled() {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export function isSupabaseMode() {
  return Boolean(isSupabaseAuthEnabled() && env.supabaseServiceRoleKey);
}

/** Enterprise SSO (Supabase SAML). Set NEXT_PUBLIC_ENABLE_SSO=false to hide until SAML is configured. */
export function isSsoEnabled() {
  return (
    isSupabaseAuthEnabled() && process.env.NEXT_PUBLIC_ENABLE_SSO !== "false"
  );
}

export function hasOpenAIKey() {
  return Boolean(env.openaiApiKey);
}

export function isOpenAccessMode() {
  return env.openAccessMode === "true";
}

/* ── Phase 2 helpers ───────────────────────────────────────────── */

export function isProduction() {
  return env.nodeEnv === "production";
}

/** True when n8n adapter has both URL and API key configured. */
export function hasN8nConfigured() {
  return Boolean(env.n8nApiUrl && env.n8nApiKey);
}

/** True when a real (non-dev) credential vault key is present. */
export function hasCredentialVaultKey() {
  return Boolean(env.credentialVaultKey);
}
