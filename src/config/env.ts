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
  get stripePriceId() {
    return required("STRIPE_PRICE_ID", process.env.STRIPE_PRICE_ID);
  },
};
