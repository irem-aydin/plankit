/**
 * Abonelik planları ve kredi kuralları (tek kaynak). Fiyatlar TL, KDV dahil
 * gösterim içindir; tahsil edilen tutar Stripe'taki fiyatlardır — değişiklikte
 * ikisi birlikte güncellenmelidir.
 *
 * Kredi maliyetleri ölçülen yapay zekâ maliyetine göre belirlendi
 * (özet plan ~0,13-0,25 $, detaylı plan ve güncelleme daha pahalı).
 */

export const PAID_PLAN_IDS = ["starter", "pro"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];
export type PlanId = "free" | PaidPlanId | "internal";
export type BillingInterval = "month" | "year";

export interface PaidPlan {
  id: PaidPlanId;
  name: string;
  tagline: string;
  monthlyCredits: number;
  /** Aylık ödemede aylık fiyat */
  priceMonthly: number;
  /** Yıllık ödemede toplam fiyat */
  priceYearly: number;
  highlight?: boolean;
  features: string[];
}

export const PLANS: Record<PaidPlanId, PaidPlan> = {
  starter: {
    id: "starter",
    name: "Başlangıç",
    tagline: "Ara sıra plan hazırlayan girişimciler ve serbest çalışanlar için",
    monthlyCredits: 8,
    priceMonthly: 249,
    priceYearly: 2_388,
    features: [
      "Ayda 8 kredi (8 özet veya 4 detaylı plan)",
      "Tüm alanlar ve hazır şablonlar",
      "Dosya ve görsel ekleme",
      "Profiller ve karar hafızası",
      "Word, PDF ve paylaşım bağlantısı",
    ],
  },
  pro: {
    id: "pro",
    name: "Profesyonel",
    tagline: "Düzenli plan hazırlayan yöneticiler, danışmanlar ve ekipler için",
    monthlyCredits: 25,
    priceMonthly: 499,
    priceYearly: 4_788,
    highlight: true,
    features: [
      "Ayda 25 kredi (25 özet veya 12 detaylı plan)",
      "Başlangıç'taki her şey",
      "Yoğun kullanım için 3 kat kredi",
      "Öncelikli destek",
      "Yeni özelliklere erken erişim",
    ],
  },
};

/**
 * Tek seferlik kredi paketi: abonelik gerektirmez, süre sınırı yoktur.
 * Kredi başı fiyatı abonelikten yüksektir; sık kullanan için abonelik daha avantajlı kalır.
 */
export const CREDIT_PACK = {
  name: "Tek seferlik paket",
  credits: 3,
  price: 149,
} as const;

/**
 * Kuruluş dönemi fiyatı etiketi. Stripe mevcut aboneliklerde eski fiyatı
 * korur; fiyat artışında yalnızca yeni fiyatlar tanımlanır, sonra bu false yapılır.
 */
export const LAUNCH_PRICING = true;

/** Ücretsiz deneme: yeni hesaba tanınan plan sayısı. */
export const FREE_PLAN_FEATURES = [
  "1 ücretsiz plan",
  "Kayıt olmadan önizleme",
  "Word, PDF ve paylaşım bağlantısı",
];

export const CREDIT_COSTS = {
  /** Özet plan */
  plan: 1,
  /** Detaylı plan (daha uzun çıktı, daha yüksek maliyet) */
  detailedPlan: 2,
  /** Açık soruların cevaplarıyla bölüm güncelleme */
  refine: 1,
} as const;

export function planCreditCost(detail: "summary" | "detailed" | undefined): number {
  return detail === "detailed" ? CREDIT_COSTS.detailedPlan : CREDIT_COSTS.plan;
}

export function monthlyCreditLimit(plan: PlanId): number {
  if (plan === "starter" || plan === "pro") return PLANS[plan].monthlyCredits;
  return 0;
}

/** Yıllık ödemede aylığa düşen fiyat (yuvarlanmış) */
export function yearlyMonthlyEquivalent(plan: PaidPlan): number {
  return Math.round(plan.priceYearly / 12);
}

/** Yıllık ödemenin aylık ödemeye göre indirimi (%) */
export function yearlyDiscountPercent(plan: PaidPlan): number {
  return Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100);
}

export function formatPrice(amount: number): string {
  return `${new Intl.NumberFormat("tr-TR").format(amount)} ₺`;
}

/**
 * Aylık kredi penceresi: başlangıçtan itibaren her ay yenilenir. Veritabanı
 * fonksiyonu (consume_credits) ile aynı kural; ekranda kalan hakkı göstermek için.
 */
export function currentCreditWindow(periodStart: Date, now: Date = new Date()): { start: Date; resetsAt: Date; rolledOver: boolean } {
  let start = new Date(periodStart);
  let rolledOver = false;
  for (let i = 0; i < 1200; i++) {
    const next = addMonths(start, 1);
    if (next > now) return { start, resetsAt: next, rolledOver };
    start = next;
    rolledOver = true;
  }
  return { start, resetsAt: addMonths(start, 1), rolledOver };
}

/** Postgres'teki "+ interval '1 month'" ile aynı: ay sonu taşmasında ayın son gününe sabitlenir. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}
