/**
 * Ortam değişkenlerine tek noktadan, anlaşılır hata mesajlarıyla erişim.
 * NEXT_PUBLIC_* değişkenleri derleme sırasında satır içine gömüldüğü için
 * process.env üzerinden doğrudan okunmalıdır.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Eksik ortam değişkeni: ${name} (.env.local dosyasını kontrol edin)`);
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};

export const serverEnv = {
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  },
  get stripeSecretKey() {
    return required("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY);
  },
  get stripeWebhookSecret() {
    return required("STRIPE_WEBHOOK_SECRET", process.env.STRIPE_WEBHOOK_SECRET);
  },
};

/**
 * Stripe fiyat kimlikleri (Stripe panelinde her plan × dönem için bir fiyat).
 * Tanımlı olmayan fiyatın planı ekranda "yakında" görünür.
 */
export const STRIPE_PRICE_ENV = {
  starter: { month: "STRIPE_PRICE_STARTER_MONTHLY", year: "STRIPE_PRICE_STARTER_YEARLY" },
  pro: { month: "STRIPE_PRICE_PRO_MONTHLY", year: "STRIPE_PRICE_PRO_YEARLY" },
} as const;

export function stripePriceId(plan: "starter" | "pro", interval: "month" | "year"): string | undefined {
  const value = process.env[STRIPE_PRICE_ENV[plan][interval]];
  // Eski tek fiyatlı kurulumla uyumluluk: STRIPE_PRICE_ID = Profesyonel aylık
  if (!value && plan === "pro" && interval === "month") return process.env.STRIPE_PRICE_ID || undefined;
  return value || undefined;
}

/** Stripe fiyat kimliğinden plan (webhook'ta aboneliğin hangi plana ait olduğunu bulmak için). */
export function planForStripePrice(priceId: string | undefined): "starter" | "pro" | null {
  if (!priceId) return null;
  for (const plan of ["starter", "pro"] as const) {
    for (const interval of ["month", "year"] as const) {
      if (stripePriceId(plan, interval) === priceId) return plan;
    }
  }
  return null;
}

/** Online ödeme yapılandırılmış mı? */
export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
