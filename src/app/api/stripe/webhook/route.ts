import { constructWebhookEvent, handleStripeEvent } from "@/services/billing-service";

/**
 * Stripe webhook uç noktası.
 * Dinlenen olaylar: checkout.session.completed, checkout.session.async_payment_succeeded,
 * customer.subscription.*
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const payload = await request.text();

  let event;
  try {
    event = await constructWebhookEvent(payload, signature);
  } catch (error) {
    console.error("Stripe webhook imzası doğrulanamadı:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    // 500 → Stripe olayı daha sonra yeniden dener.
    console.error(`Stripe olayı işlenemedi (${event.type} ${event.id}):`, error);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}
