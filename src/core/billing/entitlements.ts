/**
 * Deneme / abonelik hak kuralları (saf fonksiyonlar).
 * Atomik kredi düşümü veritabanındaki consume_generation_credit fonksiyonunda
 * aynı kurallarla yapılır; burası UI ve ön kontrol içindir.
 */
export const TRIAL_GENERATION_LIMIT = 3;

export type SubscriptionStatus = "trial" | "active" | "expired";

export interface AccountState {
  subscriptionStatus: SubscriptionStatus;
  trialLimitUsed: number;
}

export interface Entitlement {
  canGenerate: boolean;
  unlimited: boolean;
  /** Deneme için kalan hak; abonelikte null */
  remainingTrial: number | null;
}

export function getEntitlement(
  account: AccountState,
  trialLimit = TRIAL_GENERATION_LIMIT,
): Entitlement {
  if (account.subscriptionStatus === "active") {
    return { canGenerate: true, unlimited: true, remainingTrial: null };
  }
  const remaining =
    account.subscriptionStatus === "trial"
      ? Math.max(0, trialLimit - account.trialLimitUsed)
      : 0;
  return { canGenerate: remaining > 0, unlimited: false, remainingTrial: remaining };
}

/**
 * Stripe abonelik durumunu uygulama durumuna eşler.
 * null → durum değiştirilmemeli (ör. ödeme henüz tamamlanmadı).
 */
export function mapStripeSubscriptionStatus(
  stripeStatus: string,
): SubscriptionStatus | null {
  switch (stripeStatus) {
    case "active":
    case "trialing":
    case "past_due": // Stripe tahsilatı yeniden denerken erişimi koru
      return "active";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "expired";
    default: // "incomplete"
      return null;
  }
}
