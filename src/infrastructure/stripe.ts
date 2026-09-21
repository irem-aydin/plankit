import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/config/env";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  client ??= new Stripe(serverEnv.stripeSecretKey, {
    apiVersion: "2026-08-26.dahlia",
    typescript: true,
    appInfo: { name: "PlanKit" },
  });
  return client;
}
