"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/browser";

/**
 * Supabase e-posta bağlantıları, izinli yönlendirme adresi tanımlı değilse
 * oturum bilgisini adres çubuğunun "#" kısmında gönderir; sunucu bu kısmı
 * göremediği için şifre sıfırlama sessizce başarısız olur.
 *
 * Bu bileşen o durumu yakalar: token'ları alır, oturumu kurar, adres çubuğunu
 * temizler ve kullanıcıyı doğru sayfaya gönderir.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token") && !hash.includes("error_description")) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const errorDescription = params.get("error_description");

    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (errorDescription || !accessToken || !refreshToken) {
      if (errorDescription) console.error("E-posta bağlantısı hatası:", errorDescription);
      router.replace("/giris?hata=dogrulama");
      return;
    }

    createSupabaseBrowserClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          console.error("Oturum kurulamadı:", error.message);
          router.replace("/giris?hata=dogrulama");
          return;
        }
        router.replace(type === "recovery" ? "/sifre-yenile" : "/panel");
        router.refresh();
      });
  }, [router]);

  return null;
}
