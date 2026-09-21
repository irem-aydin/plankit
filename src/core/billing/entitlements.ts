/**
 * Deneme / abonelik hak kuralları (saf fonksiyonlar).
 * Atomik düşüm veritabanındaki consume_credits fonksiyonunda aynı kurallarla
 * yapılır; burası ekranda gösterim ve iş başlatmadan önceki ön kontrol içindir.
 */
import { currentCreditWindow, monthlyCreditLimit, PLANS, type PlanId } from "./plans";

/** Yeni hesaba tanınan ücretsiz plan hakkı; sonrası abonelik. */
export const TRIAL_GENERATION_LIMIT = 1;

export type SubscriptionStatus = "trial" | "active" | "expired";

export interface AccountState {
  subscriptionStatus: SubscriptionStatus;
  trialLimitUsed: number;
  plan?: PlanId;
  creditsUsed?: number;
  creditsPeriodStart?: string;
}

export type EntitlementKind = "trial" | "credits" | "unlimited" | "none";

export interface Entitlement {
  kind: EntitlementKind;
  /** En az 1 hakka/krediye sahip mi */
  canGenerate: boolean;
  /** Kalan: denemede plan sayısı, abonelikte bu ayki kredi; sınırsızda null */
  remaining: number | null;
  /** Denemede plan hakkı, abonelikte aylık kredi limiti; sınırsızda null */
  limit: number | null;
  /** Deneme için kalan hak; denemede değilse null */
  remainingTrial: number | null;
  plan: PlanId | null;
  /** Kredilerin yenileneceği an (abonelikte) */
  resetsAt: string | null;
}

export function getEntitlement(
  account: AccountState,
  trialLimit = TRIAL_GENERATION_LIMIT,
  now: Date = new Date(),
): Entitlement {
  if (account.subscriptionStatus === "active") {
    const plan = account.plan ?? "internal";
    if (plan === "internal" || plan === "free") {
      // Elle aktif edilmiş (işletme sahibi / test) hesap: kota yok, hız sınırları geçerli.
      return { kind: "unlimited", canGenerate: true, remaining: null, limit: null, remainingTrial: null, plan: "internal", resetsAt: null };
    }
    const limit = monthlyCreditLimit(plan);
    const window = currentCreditWindow(new Date(account.creditsPeriodStart ?? now.toISOString()), now);
    const used = window.rolledOver ? 0 : (account.creditsUsed ?? 0);
    const remaining = Math.max(0, limit - used);
    return {
      kind: "credits",
      canGenerate: remaining > 0,
      remaining,
      limit,
      remainingTrial: null,
      plan,
      resetsAt: window.resetsAt.toISOString(),
    };
  }
  if (account.subscriptionStatus === "trial") {
    const remaining = Math.max(0, trialLimit - account.trialLimitUsed);
    return { kind: "trial", canGenerate: remaining > 0, remaining, limit: trialLimit, remainingTrial: remaining, plan: "free", resetsAt: null };
  }
  return { kind: "none", canGenerate: false, remaining: 0, limit: null, remainingTrial: null, plan: null, resetsAt: null };
}

/** Deneme planı maliyetten bağımsız 1 hak sayılır; abonelikte kredi maliyeti geçerlidir. */
export function effectiveCost(entitlement: Entitlement, cost: number): number {
  return entitlement.kind === "trial" ? 1 : cost;
}

/** Bu işlem için yeterli hak var mı? */
export function canAfford(entitlement: Entitlement, cost: number): boolean {
  if (entitlement.kind === "unlimited") return true;
  return (entitlement.remaining ?? 0) >= effectiveCost(entitlement, cost);
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

export interface UsageSummary {
  /** Üst çubuktaki kısa etiket */
  badge: string;
  tone: "plan" | "trial" | "warn";
  /** Panel/ayarlar için büyük değer (ör. "7 / 10") */
  value: string;
  /** Açıklama satırı */
  detail: string;
}

const dayFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });

/** Hakların kullanıcıya gösterilecek özeti (üst çubuk, panel, ayarlar). */
export function usageSummary(e: Entitlement): UsageSummary {
  switch (e.kind) {
    case "unlimited":
      return { badge: "Sınırsız", tone: "plan", value: "Sınırsız", detail: "Yönetici hesabı · kota yok" };
    case "credits": {
      const name = e.plan === "starter" || e.plan === "pro" ? PLANS[e.plan].name : "Abonelik";
      const resets = e.resetsAt ? ` · ${dayFormat.format(new Date(e.resetsAt))} yenilenir` : "";
      return {
        badge: `${name} · ${e.remaining} kredi`,
        tone: (e.remaining ?? 0) > 0 ? "plan" : "warn",
        value: `${e.remaining} / ${e.limit}`,
        detail: `${name} planı · bu ay kalan kredi${resets}`,
      };
    }
    case "trial":
      return (e.remaining ?? 0) > 0
        ? { badge: `Deneme: ${e.remaining} hak`, tone: "trial", value: `${e.remaining} / ${e.limit}`, detail: "ücretsiz deneme hakkı" }
        : { badge: "Plan seç", tone: "warn", value: "0", detail: "deneme hakkı kullanıldı" };
    default:
      return { badge: "Plan seç", tone: "warn", value: "0", detail: "aktif abonelik yok" };
  }
}
