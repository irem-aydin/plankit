"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/infrastructure/supabase/server";
import { createBillingPortalSession, createCheckoutSession } from "@/services/billing-service";

export async function startCheckoutAction() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/giris?sonra=/abonelik");
  redirect(await createCheckoutSession(user.id));
}

export async function openBillingPortalAction() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/giris?sonra=/abonelik");
  redirect(await createBillingPortalSession(user.id));
}
