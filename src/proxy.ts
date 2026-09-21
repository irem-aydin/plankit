import type { NextRequest } from "next/server";
import { updateSession } from "@/infrastructure/supabase/session-proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Statik dosyalar, görseller ve Stripe webhook'u hariç her şey
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
