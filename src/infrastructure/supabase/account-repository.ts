import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountState, SubscriptionStatus } from "@/core/billing/entitlements";
import type { PlanId } from "@/core/billing/plans";

export interface Account extends AccountState {
  id: string;
  email: string | null;
  trialStartedAt: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
}

type UserRow = {
  id: string;
  email: string | null;
  subscription_status: SubscriptionStatus;
  trial_started_at: string;
  trial_limit_used: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  plan: PlanId;
  credits_used: number;
  credits_period_start: string;
};

const COLUMNS =
  "id, email, subscription_status, trial_started_at, trial_limit_used, stripe_customer_id, stripe_subscription_id, current_period_end, plan, credits_used, credits_period_start";

function toAccount(row: UserRow): Account {
  return {
    id: row.id,
    email: row.email,
    subscriptionStatus: row.subscription_status,
    trialStartedAt: row.trial_started_at,
    trialLimitUsed: row.trial_limit_used,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    currentPeriodEnd: row.current_period_end,
    plan: row.plan,
    creditsUsed: row.credits_used,
    creditsPeriodStart: row.credits_period_start,
  };
}

/** public.users tablosu. Yazma işlemleri service role gerektirir. */
export class AccountRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(userId: string): Promise<Account | null> {
    const { data, error } = await this.client
      .from("users")
      .select(COLUMNS)
      .eq("id", userId)
      .maybeSingle<UserRow>();
    if (error) throw new Error(`Hesap okunamadı: ${error.message}`);
    return data ? toAccount(data) : null;
  }

  async findByStripeCustomerId(customerId: string): Promise<Account | null> {
    const { data, error } = await this.client
      .from("users")
      .select(COLUMNS)
      .eq("stripe_customer_id", customerId)
      .maybeSingle<UserRow>();
    if (error) throw new Error(`Hesap okunamadı: ${error.message}`);
    return data ? toAccount(data) : null;
  }

  /**
   * Hakkı atomik olarak düşer: denemede 1 plan, abonelikte aylık krediden
   * `cost`. Hak yoksa false döner ve hiçbir şey değişmez.
   */
  async consumeCredits(userId: string, cost: number, trialLimit: number, monthlyLimit: number): Promise<boolean> {
    const { data, error } = await this.client.rpc("consume_credits", {
      p_user_id: userId,
      p_cost: cost,
      p_trial_limit: trialLimit,
      p_monthly_limit: monthlyLimit,
    });
    if (error) throw new Error(`Kullanım hakkı düşülemedi: ${error.message}`);
    return data === true;
  }

  async setStripeCustomerId(userId: string, customerId: string) {
    const { error } = await this.client
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
    if (error) throw new Error(`Stripe müşteri kaydedilemedi: ${error.message}`);
  }

  async updateSubscription(
    userId: string,
    patch: {
      status?: SubscriptionStatus;
      stripeCustomerId: string;
      stripeSubscriptionId: string | null;
      currentPeriodEnd: string | null;
      plan?: PlanId;
      /** Yeni abonelikte kredi penceresini bu andan başlatır ve sayacı sıfırlar */
      resetCreditsFrom?: string;
    },
  ) {
    const { error } = await this.client
      .from("users")
      .update({
        ...(patch.status ? { subscription_status: patch.status } : {}),
        ...(patch.plan ? { plan: patch.plan } : {}),
        ...(patch.resetCreditsFrom ? { credits_used: 0, credits_period_start: patch.resetCreditsFrom } : {}),
        stripe_customer_id: patch.stripeCustomerId,
        stripe_subscription_id: patch.stripeSubscriptionId,
        current_period_end: patch.currentPeriodEnd,
      })
      .eq("id", userId);
    if (error) throw new Error(`Abonelik güncellenemedi: ${error.message}`);
  }
}
