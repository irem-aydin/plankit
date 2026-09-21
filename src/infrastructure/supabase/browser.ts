"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Tarayıcı istemcisi. Yalnızca e-posta bağlantılarının adres çubuğundaki
 * "#" kısmıyla döndüğü durumda oturumu kurmak için kullanılır; normal akışta
 * tüm kimlik işlemleri sunucuda yapılır.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
