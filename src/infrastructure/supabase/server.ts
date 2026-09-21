import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/config/env";

/**
 * İstek bazlı, kullanıcının oturumuyla çalışan Supabase istemcisi (RLS geçerli).
 * Her istekte yeniden oluşturulmalıdır.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component içinden çağrıldığında cookie yazılamaz;
          // oturum yenilemeyi proxy.ts üstlenir.
        }
      },
    },
  });
}

/** Doğrulanmış kullanıcı kimliği (JWT imzası doğrulanır) veya null. */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: (data.claims.email as string | undefined) ?? null };
}
