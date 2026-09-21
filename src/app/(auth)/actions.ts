"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/config/env";
import { passwordSchema, safeInternalPath } from "@/core/account/security";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/infrastructure/supabase/server";

export type AuthFormState = { error?: string; message?: string };

const emailSchema = z.email("Geçerli bir e-posta adresi girin.");

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Şifrenizi girin."),
});

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "E-posta adresinizi henüz doğrulamadınız. Gelen kutunuzu kontrol edin."
          : error.status === 429
            ? "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin."
            : "E-posta veya şifre hatalı.",
    };
  }

  redirect(safeInternalPath(formData.get("next"), "/panel"));
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const next = safeInternalPath(formData.get("next"), "/panel?hosgeldin=1");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin."
          : error.code === "weak_password"
            ? "Şifre çok zayıf; daha güçlü bir şifre seçin."
            : "Hesap oluşturulamadı. Lütfen tekrar deneyin.",
    };
  }

  if (data.session) redirect(next);

  return {
    message: "Hesabınız oluşturuldu. Devam etmek için e-postanıza gelen doğrulama bağlantısına tıklayın.",
  };
}

export async function requestPasswordResetAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/sifre-yenile`,
  });

  // Hesabın var olup olmadığını açığa çıkarmamak için her durumda aynı mesaj.
  return {
    message: "Bu adrese kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Gelen kutunu (ve spam klasörünü) kontrol et.",
  };
}

export async function resetPasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Bağlantının süresi dolmuş. Lütfen yeniden şifre sıfırlama isteği gönder." };

  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data !== formData.get("confirmPassword")) return { error: "Şifreler birbiriyle eşleşmiyor." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Yeni şifre eski şifrenden farklı olmalı."
          : error.code === "weak_password"
            ? "Şifre çok zayıf; daha güçlü bir şifre seç."
            : "Şifre güncellenemedi.",
    };
  }

  redirect("/panel?durum=sifre-yenilendi");
}
