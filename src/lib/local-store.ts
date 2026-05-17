import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AutomationRecord,
  AutomationRunRecord,
  IntegrationConnectionRecord,
} from "@/lib/automation";
import type { WorkflowRunRecord, StepLogRecord } from "@/lib/workflow-run-store";
import type { WorkflowVersion } from "@/lib/workflow";
import { isOpenAccessMode } from "@/lib/env";
import { GUEST_USER_EMAIL, GUEST_USER_ID, GUEST_USER_NAME } from "@/lib/guest-access";
import { createLogger } from "@/lib/logger";

const log = createLogger("local-store");

export type LocalUserRecord = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: string;
  planCredits: number;
  extraCredits: number;
  onboarded?: boolean;
  role?: string;
  companySize?: string;
};

export type UsageLogRecord = {
  id: string;
  userId: string;
  action: string;
  creditsUsed: number;
  status: "Success" | "Failed";
  createdAt: string;
};

export type PlanRecord = {
  id: string;
  name: string;
  price: string;
  credits: number;
  features: string[];
};

export type UserSubscriptionRecord = {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  status: "active" | "canceled";
};

export type ConsultationRequestRecord = {
  id: string;
  name: string;
  email: string;
  company: string;
  automationRequirement: string;
  budget: string;
  createdAt: string;
};

export type LocalCredentialRecord = {
  id: string;
  userId: string;
  integration: string;
  name: string;
  keyId: string;
  encryptedBlobBase64: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalConnectionRecord = {
  id: string;
  userId: string;
  integration: string;
  status: "pending" | "connected" | "expired" | "revoked";
  displayName: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalDeploymentRecord = {
  id: string;
  automationId: string;
  userId: string;
  versionId: string;
  adapter: string;
  state:
    | "draft"
    | "validated"
    | "deployable"
    | "deployed"
    | "active"
    | "paused"
    | "failed";
  externalRef: Record<string, unknown> | null;
  lastError: string | null;
  deployedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalStepExecutionRecord = {
  id: string;
  runId: string;
  stepId: string;
  status: "pending" | "running" | "success" | "error" | "skipped";
  startedAt: string | null;
  finishedAt: string | null;
  output: Record<string, unknown> | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type LocalRuntimeEventRecord = {
  id: string;
  runId: string;
  stepId: string | null;
  kind: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type LocalOAuthStateRecord = {
  state: string;
  userId: string;
  provider: string;
  issuedAt: string;
  consumedAt: string | null;
  extra: Record<string, unknown>;
};

export type LocalScheduleRecord = {
  id: string;
  userId: string;
  automationId: string;
  cron: string;
  timezone: string;
  status: "active" | "paused";
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type LocalDatabase = {
  users: LocalUserRecord[];
  automations: AutomationRecord[];
  automationRuns: AutomationRunRecord[];
  connections: IntegrationConnectionRecord[];
  consultationRequests: ConsultationRequestRecord[];
  usageLogs: UsageLogRecord[];
  plans: PlanRecord[];
  subscriptions: UserSubscriptionRecord[];
  workflowRuns: WorkflowRunRecord[];
  stepLogs: StepLogRecord[];
  workflowVersions: WorkflowVersion[];
  credentialsVault: LocalCredentialRecord[];
  connectionsV2: LocalConnectionRecord[];
  deployments: LocalDeploymentRecord[];
  stepExecutions: LocalStepExecutionRecord[];
  runtimeEvents: LocalRuntimeEventRecord[];
  oauthState: LocalOAuthStateRecord[];
  schedules: LocalScheduleRecord[];
};

const STORAGE_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(STORAGE_DIR, "automatecraft-local.json");

/**
 * Vercel and other serverless runtimes use a read-only filesystem.
 * The local file-based store cannot work in those environments.
 * Supabase environment variables must be configured for production use.
 */
function assertWritableRuntime() {
  // /var/task is the Vercel serverless function root — it is read-only.
  if (process.cwd().startsWith("/var/task")) {
    throw new Error(
      "AutomateCraft is running on a serverless platform (e.g. Vercel) where the " +
        "local file-based database is not supported. " +
        "Please configure your NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, " +
        "and SUPABASE_SERVICE_ROLE_KEY environment variables in your Vercel project settings."
    );
  }
}

const emptyDatabase: LocalDatabase = {
  users: [],
  automations: [],
  automationRuns: [],
  connections: [],
  consultationRequests: [],
  usageLogs: [],
  workflowRuns: [],
  stepLogs: [],
  workflowVersions: [],
  credentialsVault: [],
  connectionsV2: [],
  deployments: [],
  stepExecutions: [],
  runtimeEvents: [],
  oauthState: [],
  schedules: [],
  plans: [
    {
      id: "plan_starter",
      name: "Starter",
      price: "₹999",
      credits: 500,
      features: ["500 Credits/month", "Basic automations", "Email support"],
    },
    {
      id: "plan_starter_yearly",
      name: "Starter (Yearly)",
      price: "₹9990",
      credits: 6000,
      features: ["6000 Credits/year", "Basic automations", "Email support"],
    },
    {
      id: "plan_plus",
      name: "Plus",
      price: "₹2000",
      credits: 1500,
      features: ["1500 Credits/month", "WhatsApp + Email + CRM", "Faster execution", "Priority support"],
    },
    {
      id: "plan_plus_yearly",
      name: "Plus (Yearly)",
      price: "₹20000",
      credits: 18000,
      features: ["18000 Credits/year", "WhatsApp + Email + CRM", "Faster execution", "Priority support"],
    },
    {
      id: "plan_pro",
      name: "Pro",
      price: "₹3500",
      credits: 3000,
      features: ["3000 Credits/month", "Advanced workflows", "Priority execution", "Advanced analytics", "Dedicated support"],
    },
    {
      id: "plan_pro_yearly",
      name: "Pro (Yearly)",
      price: "₹35000",
      credits: 36000,
      features: ["36000 Credits/year", "Advanced workflows", "Priority execution", "Advanced analytics", "Dedicated support"],
    },
    {
      id: "plan_enterprise",
      name: "Enterprise",
      price: "Let's Talk",
      credits: 0,
      features: ["Custom credits", "Unlimited workflows", "Dedicated infrastructure", "Custom integrations", "Account manager"],
    },
  ],
  subscriptions: [],
};

function normalizeLocalDatabase(
  database: Partial<LocalDatabase> | null | undefined,
): LocalDatabase {
  const normalized = {
    users: database?.users ?? [],
    automations: database?.automations ?? [],
    automationRuns: database?.automationRuns ?? [],
    connections: database?.connections ?? [],
    consultationRequests: database?.consultationRequests ?? [],
    usageLogs: database?.usageLogs ?? [],
    plans: database?.plans && database.plans.length > 0 ? database.plans : emptyDatabase.plans,
    subscriptions: database?.subscriptions ?? [],
    workflowRuns: database?.workflowRuns ?? [],
    stepLogs: database?.stepLogs ?? [],
    workflowVersions: database?.workflowVersions ?? [],
    credentialsVault: database?.credentialsVault ?? [],
    connectionsV2: database?.connectionsV2 ?? [],
    deployments: database?.deployments ?? [],
    stepExecutions: database?.stepExecutions ?? [],
    runtimeEvents: database?.runtimeEvents ?? [],
    oauthState: database?.oauthState ?? [],
    schedules: database?.schedules ?? [],
  };

  if (
    isOpenAccessMode() &&
    !normalized.users.some((user) => user.id === GUEST_USER_ID)
  ) {
    normalized.users.unshift({
      id: GUEST_USER_ID,
      email: GUEST_USER_EMAIL,
      name: GUEST_USER_NAME,
      passwordHash: "guest-access-disabled",
      createdAt: new Date().toISOString(),
      planCredits: 10,
      extraCredits: 0,
    });
  }

  return normalized;
}

async function ensureStorage() {
  log.debug("Ensuring local storage exists.");
  assertWritableRuntime();
  await mkdir(STORAGE_DIR, { recursive: true });

  try {
    await readFile(STORAGE_FILE, "utf8");
  } catch {
    log.info("Local storage file missing. Creating a new one.");
    await writeFile(STORAGE_FILE, JSON.stringify(emptyDatabase, null, 2), "utf8");
  }
}

export async function readLocalDatabase(): Promise<LocalDatabase> {
  log.debug("Reading local database.");
  await ensureStorage();
  const raw = await readFile(STORAGE_FILE, "utf8");
  return normalizeLocalDatabase(JSON.parse(raw) as Partial<LocalDatabase>);
}

export async function writeLocalDatabase(database: LocalDatabase) {
  log.debug("Writing local database to disk.");
  await ensureStorage();
  await writeFile(STORAGE_FILE, JSON.stringify(database, null, 2), "utf8");
}

// --- Async mutex to serialize concurrent writes ---
let writeLock: Promise<void> = Promise.resolve();

export async function updateLocalDatabase<T>(
  updater: (database: LocalDatabase) => T | Promise<T>,
) {
  let releaseLock!: () => void;
  const previousLock = writeLock;
  writeLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await previousLock;
  log.debug("Write lock acquired.");

  try {
    const database = normalizeLocalDatabase(await readLocalDatabase());
    const result = await updater(database);
    await writeLocalDatabase(database);
    log.debug("Database update committed.");
    return result;
  } finally {
    releaseLock();
    log.debug("Write lock released.");
  }
}

export async function createConsultationRequest(input: {
  name: string;
  email: string;
  company: string;
  automationRequirement: string;
  budget: string;
}) {
  log.info("Saving consultation request for:", input.email);

  return updateLocalDatabase((database) => {
    const consultationRequest: ConsultationRequestRecord = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      company: input.company,
      automationRequirement: input.automationRequirement,
      budget: input.budget,
      createdAt: new Date().toISOString(),
    };

    database.consultationRequests.push(consultationRequest);
    log.info("Consultation request saved:", consultationRequest.id);
    return consultationRequest;
  });
}
