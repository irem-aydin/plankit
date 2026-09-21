import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/config/env";

/**
 * Service role istemcisi — RLS'i atlar. YALNIZCA sunucuda, kimlik ve yetki
 * kontrolü yapıldıktan sonra kullanılmalıdır.
 */
export function createSupabaseAdminClient() {
  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
