import "server-only";
import { cache } from "react";
import { getEntitlement } from "@/core/billing/entitlements";
import { AccountRepository } from "@/infrastructure/supabase/account-repository";
import { PreferencesRepository } from "@/infrastructure/supabase/preferences-repository";
import {
  createSupabaseServerClient,
  getAuthenticatedUser,
} from "@/infrastructure/supabase/server";

/**
 * Oturumdaki kullanıcı, hesabı ve hakları. Aynı istek içinde tekrar
 * çağrıldığında önbellekten döner.
 */
export const getCurrentSession = cache(async () => {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const [account, preferences] = await Promise.all([
    new AccountRepository(supabase).findById(user.id),
    new PreferencesRepository(supabase).get(user.id),
  ]);
  if (!account) return null;

  return { user, account, preferences, entitlement: getEntitlement(account) };
});
