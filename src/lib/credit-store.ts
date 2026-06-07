import { isSupabaseMode } from "@/lib/env";
import { readLocalDatabase, updateLocalDatabase, type UsageLogRecord } from "@/lib/local-store";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { createLogger } from "@/lib/logger";

const log = createLogger("credit-store");

export type UserCredits = {
  planCredits: number;
  extraCredits: number;
  totalCredits: number;
  monthlyUsage: number;
  hasSubscription: boolean;
};

export type CreditTransaction = {
  id: string;
  userId: string;
  type: "grant" | "deduct" | "purchase" | "subscription" | "refund" | "adjustment";
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

async function ensureLocalCreditUser(userId: string) {
  if (userId === "guest-user") return;

  await updateLocalDatabase((database) => {
    const existingUser = database.users.find((user) => user.id === userId);
    if (existingUser) return;

    database.users.push({
      id: userId,
      email: `${userId}@supabase.local`,
      name: "Supabase User",
      passwordHash: "supabase-auth-managed",
      createdAt: new Date().toISOString(),
      planCredits: 10,
      extraCredits: 0,
      onboarded: true,
    });

    database.usageLogs.unshift({
      id: crypto.randomUUID(),
      userId,
      action: "Welcome bonus - 10 free credits",
      creditsUsed: 0,
      status: "Success",
      createdAt: new Date().toISOString(),
    });
  });
}

// ─── Get User Credits ─────────────────────────────────────────────

export async function getUserCredits(userId: string): Promise<UserCredits> {
  log.info("Fetching user credits for user:", userId);

  if (userId === "guest-user") {
    return {
      planCredits: 10,
      extraCredits: 0,
      totalCredits: 10,
      monthlyUsage: 0,
      hasSubscription: false,
    };
  }

  if (isSupabaseMode()) {
    log.debug("Using Supabase to get user credits.");
    const supabase = createSupabaseAdminClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("plan_credits, extra_credits")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      log.error("Failed to fetch credits from Supabase", error);
      throw new Error(error.message);
    }

    const planCredits = profile?.plan_credits ?? 10;
    const extraCredits = profile?.extra_credits ?? 0;
    const totalCredits = planCredits + extraCredits;

    // Get monthly usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: usageLogs } = await supabase
      .from("usage_logs")
      .select("credits_used")
      .eq("user_id", userId)
      .eq("status", "Success")
      .gte("created_at", startOfMonth.toISOString());

    const monthlyUsage = (usageLogs ?? []).reduce(
      (sum, entry) => sum + (entry.credits_used || 0),
      0
    );

    // Check active subscription
    const { data: activeSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const hasSubscription = !!activeSub;

    return { planCredits, extraCredits, totalCredits, monthlyUsage, hasSubscription };
  }

  log.debug("Using local database to get user credits.");
  await ensureLocalCreditUser(userId);
  const database = await readLocalDatabase();
  const user = database.users.find((u) => u.id === userId);

  if (!user) {
    throw new Error("User not found");
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyUsage = database.usageLogs
    .filter(
      (entry) =>
        entry.userId === userId &&
        entry.status === "Success" &&
        new Date(entry.createdAt) >= startOfMonth
    )
    .reduce((sum, entry) => sum + entry.creditsUsed, 0);

  const hasSubscription = database.subscriptions.some(
    (s) => s.userId === userId && s.status === "active"
  );

  const planCredits = user.planCredits ?? 10;
  const extraCredits = user.extraCredits ?? 0;
  const totalCredits = planCredits + extraCredits;

  return {
    planCredits,
    extraCredits,
    totalCredits,
    monthlyUsage,
    hasSubscription,
  };
}

// ─── Deduct Credits (Atomic) ──────────────────────────────────────

export async function deductCredits(userId: string, amount: number, actionDesc: string): Promise<boolean> {
  log.info("Deducting credits for user:", userId, "amount:", amount);

  if (userId === "guest-user") {
    log.info("Skipping credit deduction for guest open-access user.");
    return true;
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();

    // Use the atomic database function to prevent race conditions
    const { data, error } = await supabase.rpc("deduct_credits_atomic", {
      p_user_id: userId,
      p_amount: amount,
      p_action: actionDesc,
      p_description: actionDesc,
    });

    if (error) {
      log.error("Atomic deduction RPC failed", error);
      return false;
    }

    const result = data as { success: boolean; error?: string };

    if (!result.success) {
      log.warn("Credit deduction failed:", result.error);
      return false;
    }

    log.info("Credits deducted successfully via atomic RPC");
    return true;
  }

  await ensureLocalCreditUser(userId);
  return updateLocalDatabase((database) => {
    const user = database.users.find((u) => u.id === userId);
    if (!user) return false;

    const currentPlan = user.planCredits ?? 10;
    const currentExtra = user.extraCredits ?? 0;

    if (currentPlan + currentExtra < amount) {
      database.usageLogs.unshift({
        id: crypto.randomUUID(),
        userId,
        action: actionDesc,
        creditsUsed: amount,
        status: "Failed",
        createdAt: new Date().toISOString(),
      });
      return false;
    }

    let newPlan = currentPlan;
    let newExtra = currentExtra;

    if (newPlan >= amount) {
      newPlan -= amount;
    } else {
      const remainder = amount - newPlan;
      newPlan = 0;
      newExtra -= remainder;
    }

    user.planCredits = newPlan;
    user.extraCredits = newExtra;

    database.usageLogs.unshift({
      id: crypto.randomUUID(),
      userId,
      action: actionDesc,
      creditsUsed: amount,
      status: "Success",
      createdAt: new Date().toISOString(),
    });

    return true;
  });
}

// ─── Buy Credits ──────────────────────────────────────────────────

export async function buyCredits(userId: string, amount: number, packageDesc: string): Promise<boolean> {
  log.info("Buying extra credits for user:", userId, "amount:", amount);

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();

    // Use the atomic database function for safe credit addition
    const { data, error } = await supabase.rpc("add_credits_atomic", {
      p_user_id: userId,
      p_amount: amount,
      p_type: "purchase",
      p_description: `Purchased ${packageDesc}`,
    });

    if (error) {
      log.error("Atomic credit addition RPC failed", error);
      return false;
    }

    const result = data as { success: boolean; error?: string };

    if (!result.success) {
      log.warn("Credit purchase failed:", result.error);
      return false;
    }

    log.info("Credits purchased successfully via atomic RPC");
    return true;
  }

  await ensureLocalCreditUser(userId);
  return updateLocalDatabase((database) => {
    const user = database.users.find((u) => u.id === userId);
    if (!user) return false;

    user.extraCredits = (user.extraCredits ?? 0) + amount;

    database.usageLogs.unshift({
      id: crypto.randomUUID(),
      userId,
      action: `Purchased ${packageDesc}`,
      creditsUsed: 0,
      status: "Success",
      createdAt: new Date().toISOString(),
    });

    return true;
  });
}

// ─── Grant Subscription Credits ───────────────────────────────────

export async function grantSubscriptionCredits(
  userId: string,
  planId: string,
  planName: string,
  credits: number,
): Promise<boolean> {
  log.info("Granting subscription credits for user:", userId, "plan:", planName, "credits:", credits);

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();

    // 1. Cancel any existing active subscriptions
    await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", userId)
      .eq("status", "active");

    // 2. Create the new subscription record
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_id: planId,
      plan_name: planName,
      credits_granted: credits,
      status: "active",
      expires_at: expiresAt.toISOString(),
    });

    if (subError) {
      log.error("Failed to create subscription", subError);
      return false;
    }

    // 3. Add credits to the user's plan_credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_credits, extra_credits")
      .eq("id", userId)
      .single();

    if (!profile) return false;

    const newPlanCredits = (profile.plan_credits ?? 0) + credits;
    const totalAfter = newPlanCredits + (profile.extra_credits ?? 0);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ plan_credits: newPlanCredits })
      .eq("id", userId);

    if (updateError) {
      log.error("Failed to update plan credits for subscription", updateError);
      return false;
    }

    // 4. Log the transaction
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      type: "subscription",
      amount: credits,
      balance_after: totalAfter,
      description: `Subscribed to ${planName} — +${credits} credits`,
      metadata: { plan_id: planId, plan_name: planName },
    });

    await supabase.from("usage_logs").insert({
      user_id: userId,
      action: `Subscribed to ${planName} Plan`,
      credits_used: 0,
      status: "Success",
    });

    log.info("Subscription credits granted successfully");
    return true;
  }

  // Local mode fallback
  await ensureLocalCreditUser(userId);
  return updateLocalDatabase((database) => {
    const user = database.users.find((u) => u.id === userId);
    const plan = database.plans.find((p) => p.id === planId);

    if (!user || !plan) return false;

    // Cancel existing active subs
    database.subscriptions
      .filter((s) => s.userId === userId && s.status === "active")
      .forEach((s) => { s.status = "canceled"; });

    database.subscriptions.push({
      id: crypto.randomUUID(),
      userId,
      planId: plan.id,
      startDate: new Date().toISOString(),
      status: "active",
    });

    user.planCredits = (user.planCredits ?? 0) + plan.credits;

    if (plan.credits > 0) {
      database.usageLogs.unshift({
        id: crypto.randomUUID(),
        userId,
        action: `Subscribed to ${plan.name} Plan`,
        creditsUsed: 0,
        status: "Success",
        createdAt: new Date().toISOString(),
      });
    }

    return true;
  });
}

// ─── List Usage Logs ──────────────────────────────────────────────

export async function listUsageLogsForUser(userId: string): Promise<UsageLogRecord[]> {
  log.info("Listing usage logs for user:", userId);

  if (userId === "guest-user") {
    return [];
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("usage_logs")
      .select("id, user_id, action, credits_used, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (response.error) {
      throw new Error(response.error.message);
    }

    return (response.data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.user_id as string,
      action: row.action as string,
      creditsUsed: row.credits_used as number,
      status: row.status as "Success" | "Failed",
      createdAt: row.created_at as string,
    }));
  }

  const database = await readLocalDatabase();
  return database.usageLogs
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 50);
}

// ─── List Credit Transactions ─────────────────────────────────────

export async function listCreditTransactions(userId: string): Promise<CreditTransaction[]> {
  log.info("Listing credit transactions for user:", userId);

  if (userId === "guest-user") {
    return [];
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("credit_transactions")
      .select("id, user_id, type, amount, balance_after, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      log.error("Failed to fetch credit transactions", error);
      throw new Error(error.message);
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as CreditTransaction["type"],
      amount: row.amount as number,
      balanceAfter: row.balance_after as number,
      description: row.description as string,
      createdAt: row.created_at as string,
    }));
  }

  // Local mode — derive transactions from usage logs
  const database = await readLocalDatabase();
  return database.usageLogs
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 100)
    .map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      type: entry.creditsUsed > 0 ? "deduct" as const : "grant" as const,
      amount: entry.creditsUsed,
      balanceAfter: 0, // Not tracked in local mode
      description: entry.action,
      createdAt: entry.createdAt,
    }));
}
