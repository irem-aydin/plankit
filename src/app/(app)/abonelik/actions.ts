"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/infrastructure/supabase/server";
import { PAID_PLAN_IDS, type BillingInterval, type PaidPlanId } from "@/core/billing/plans";
import {
  BillingUnavailableError,
  createBillingPortalSession,
  createCheckoutSession,
  createPackCheckoutSession,
} from "@/services/billing-service";

export async function startCheckoutAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/giris?sonra=/abonelik");

  const planValue = String(formData.get("plan"));
  const plan: PaidPlanId = (PAID_PLAN_IDS as readonly string[]).includes(planValue) ? (planValue as PaidPlanId) : "pro";
  const interval: BillingInterval = formData.get("interval") === "year" ? "year" : "month";

  let url: string;
  try {
    url = await createCheckoutSession(user.id, plan, interval);
  } catch (error) {
    if (error instanceof BillingUnavailableError) redirect("/abonelik?durum=yakinda");
    throw error;
  }
  redirect(url);
}

export async function buyPackAction() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/giris?sonra=/abonelik");

  let url: string;
  try {
    url = await createPackCheckoutSession(user.id);
  } catch (error) {
    if (error instanceof BillingUnavailableError) redirect("/abonelik?durum=yakinda");
    throw error;
  }
  redirect(url);
}

export async function openBillingPortalAction() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/giris?sonra=/abonelik");
  redirect(await createBillingPortalSession(user.id));
}
