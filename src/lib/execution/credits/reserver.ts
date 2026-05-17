/**
 * Credit reserve + refund pattern for execution runs.
 *
 * Flow:
 *   reserveRunCredits()
 *     - calls deductCredits() (atomic RPC)
 *     - on success, returns { reserved: true, amount }
 *     - on insufficient balance, returns { reserved: false }
 *
 *   refundRunCredits()
 *     - reverses a previous reservation (e.g. adapter.execute() threw)
 *     - idempotent via reference_id when Supabase mode is active
 *     - logs a credit_transactions row with type="refund"
 *
 * Idempotency:
 *   The credit_transactions table has a reference_id column (added in
 *   20260425_add_credit_transaction_reference). We tag every reserve
 *   and refund with the same `referenceId` (typically the run id) so
 *   double-fires of either side are safe.
 *
 *   Local mode (dev) skips reference_id idempotency — best-effort only.
 */

import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { deductCredits } from "@/lib/credit-store";
import { createLogger } from "@/lib/logger";

const log = createLogger("execution/credits/reserver");

export type ReserveInput = {
  userId: string;
  amount: number;
  referenceId: string;
  description?: string;
};

export type ReserveResult =
  | { reserved: true; amount: number }
  | { reserved: false; reason: string };

export async function reserveRunCredits(input: ReserveInput): Promise<ReserveResult> {
  if (input.amount <= 0) {
    log.debug("Skipping reservation — zero-cost run.", { referenceId: input.referenceId });
    return { reserved: true, amount: 0 };
  }

  // Idempotency check — if a reservation already exists for this run, skip.
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const { data: existing } = await supabase
      .from("credit_transactions")
      .select("id")
      .eq("reference_id", input.referenceId)
      .eq("type", "deduct")
      .maybeSingle();

    if (existing) {
      log.info("Reservation already exists; skipping duplicate.", {
        referenceId: input.referenceId,
      });
      return { reserved: true, amount: input.amount };
    }
  }

  const description = input.description ?? `Run reservation (${input.amount} credits)`;
  const ok = await deductCredits(input.userId, input.amount, description);
  if (!ok) {
    return { reserved: false, reason: "Insufficient balance." };
  }

  // Attach reference_id post-hoc so refund() can find the row.
  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    await supabase
      .from("credit_transactions")
      .update({ reference_id: input.referenceId })
      .eq("user_id", input.userId)
      .eq("type", "deduct")
      .is("reference_id", null)
      .order("created_at", { ascending: false })
      .limit(1);
  }

  return { reserved: true, amount: input.amount };
}

export type RefundInput = {
  userId: string;
  amount: number;
  referenceId: string;
  description?: string;
};

export type RefundResult = {
  refunded: boolean;
  amount: number;
};

/**
 * Refund a previously reserved amount. Idempotent — if a refund row
 * with the same reference_id already exists, this is a no-op.
 */
export async function refundRunCredits(input: RefundInput): Promise<RefundResult> {
  if (input.amount <= 0) {
    return { refunded: true, amount: 0 };
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();

    // Idempotency: skip if a refund for this reference already exists.
    const { data: existing } = await supabase
      .from("credit_transactions")
      .select("id")
      .eq("reference_id", input.referenceId)
      .eq("type", "refund")
      .maybeSingle();

    if (existing) {
      log.info("Refund already recorded; skipping.", {
        referenceId: input.referenceId,
      });
      return { refunded: true, amount: input.amount };
    }

    const description = input.description ?? `Refund for ${input.referenceId}`;
    const { data, error } = await supabase.rpc("add_credits_atomic", {
      p_user_id: input.userId,
      p_amount: input.amount,
      p_type: "refund",
      p_description: description,
    });
    if (error) {
      log.error("Refund RPC failed.", error);
      return { refunded: false, amount: 0 };
    }
    const result = data as { success: boolean };
    if (!result?.success) {
      log.warn("Refund RPC returned non-success.", { result });
      return { refunded: false, amount: 0 };
    }

    // Tag with reference_id for future idempotency checks.
    await supabase
      .from("credit_transactions")
      .update({ reference_id: input.referenceId })
      .eq("user_id", input.userId)
      .eq("type", "refund")
      .is("reference_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    log.info("Credits refunded.", {
      userId: input.userId,
      amount: input.amount,
      referenceId: input.referenceId,
    });
    return { refunded: true, amount: input.amount };
  }

  // Local mode — best-effort. Use buyCredits-style addition via direct mutate.
  log.info("Local-mode refund noted (not persisted).", {
    referenceId: input.referenceId,
    amount: input.amount,
  });
  return { refunded: true, amount: input.amount };
}
