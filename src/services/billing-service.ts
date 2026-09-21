import "server-only";
import type Stripe from "stripe";
import { publicEnv, serverEnv } from "@/config/env";
import { mapStripeSubscriptionStatus } from "@/core/billing/entitlements";
import { getStripe } from "@/infrastructure/stripe";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin";
import { AccountRepository } from "@/infrastructure/supabase/account-repository";

function accounts() {
  return new AccountRepository(createSupabaseAdminClient());
}

async function ensureStripeCustomer(userId: string): Promise<string> {
  const repo = accounts();
  const account = await repo.findById(userId);
  if (!account) throw new Error("Hesap bulunamadı.");
  if (account.stripeCustomerId) return account.stripeCustomerId;

  const customer = await getStripe().customers.create(
    { email: account.email ?? undefined, metadata: { user_id: userId } },
    { idempotencyKey: `customer-${userId}` },
  );
  await repo.setStripeCustomerId(userId, customer.id);
  return customer.id;
}

/** Abonelik için Stripe Checkout oturumu açar ve yönlendirme URL'ini döner. */
export async function createCheckoutSession(userId: string): Promise<string> {
  const customer = await ensureStripeCustomer(userId);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: userId,
    line_items: [{ price: serverEnv.stripePriceId, quantity: 1 }],
    subscription_data: { metadata: { user_id: userId } },
    allow_promotion_codes: true,
    success_url: `${publicEnv.siteUrl}/abonelik?durum=basarili`,
    cancel_url: `${publicEnv.siteUrl}/abonelik?durum=iptal`,
  });
  if (!session.url) throw new Error("Stripe ödeme sayfası oluşturulamadı.");
  return session.url;
}

/** Aboneliği yönetme (kart, iptal, fatura) için Stripe Customer Portal. */
export async function createBillingPortalSession(userId: string): Promise<string> {
  const account = await accounts().findById(userId);
  if (!account?.stripeCustomerId) throw new Error("Aktif bir Stripe müşterisi yok.");
  const session = await getStripe().billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${publicEnv.siteUrl}/abonelik`,
  });
  return session.url;
}

/** Webhook olayını doğrular. Geçersiz imzada hata fırlatır. */
export async function constructWebhookEvent(payload: string, signature: string) {
  return getStripe().webhooks.constructEventAsync(
    payload,
    signature,
    serverEnv.stripeWebhookSecret,
  );
}

/** Stripe olayını işler; ilgisiz olayları yok sayar. İdempotenttir. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) return;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription, session.client_reference_id);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed": {
      // Olay sırası garanti değil; en güncel durumu Stripe'tan oku.
      const subscription = await getStripe().subscriptions.retrieve(event.data.object.id);
      await syncSubscription(subscription, null);
      return;
    }
    default:
      return;
  }
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  fallbackUserId: string | null,
) {
  const repo = accounts();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const userId =
    subscription.metadata?.user_id ??
    fallbackUserId ??
    (await repo.findByStripeCustomerId(customerId))?.id;

  if (!userId) {
    console.warn(`Stripe aboneliği bir kullanıcıyla eşleşmedi: ${subscription.id}`);
    return;
  }

  const status = mapStripeSubscriptionStatus(subscription.status);

  // Eski bir aboneliğin iptali, yeni ve aktif aboneliği ezmesin.
  const account = await repo.findById(userId);
  if (
    status !== "active" &&
    account?.stripeSubscriptionId &&
    account.stripeSubscriptionId !== subscription.id &&
    account.subscriptionStatus === "active"
  ) {
    return;
  }

  const periodEnd = subscription.items.data[0]?.current_period_end;

  await repo.updateSubscription(userId, {
    status: status ?? undefined,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  });
}
