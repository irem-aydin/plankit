import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeInternalPath } from "@/core/account/security";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * E-posta bağlantılarının dönüş noktası.
 *
 * Supabase e-posta şablonuna göre iki biçim gelebilir:
 *  - PKCE akışı:    ?code=...
 *  - OTP bağlantısı: ?token_hash=...&type=recovery|signup|email_change...
 * İkisi de desteklenir; aksi halde şifre sıfırlama bağlantısı çalışmaz.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash") ?? searchParams.get("token");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeInternalPath(searchParams.get("next"), defaultNext(type));

  // Supabase hata döndürdüyse (süresi dolmuş, tekrar kullanılmış bağlantı)
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  if (errorCode) {
    console.error("E-posta bağlantısı hatası:", errorCode, searchParams.get("error_description"));
    return NextResponse.redirect(`${origin}/giris?hata=dogrulama`);
  }

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("Kod oturuma çevrilemedi:", error.message);
  }

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("Bağlantı doğrulanamadı:", error.message);
  }

  return NextResponse.redirect(`${origin}/giris?hata=dogrulama`);
}

function defaultNext(type: EmailOtpType | null): string {
  return type === "recovery" ? "/sifre-yenile" : "/panel";
}
