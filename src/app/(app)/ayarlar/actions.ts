"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/config/env";
import { ACCOUNT_DELETE_CONFIRMATION, passwordSchema } from "@/core/account/security";
import { DETAIL_LEVELS } from "@/core/ai/intake";
import { PreferencesRepository } from "@/infrastructure/supabase/preferences-repository";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/infrastructure/supabase/server";
import { deleteUserAccount } from "@/services/account-service";

export type SettingsState = { error?: string; message?: string };

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/giris?sonra=/ayarlar");
  return { user, supabase: await createSupabaseServerClient() };
}

// ------------------------------------------------------------------ hesap

export async function updateDisplayNameAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { user, supabase } = await requireUser();
  const parsed = z.string().trim().max(80, "Ad en fazla 80 karakter olabilir.").safeParse(formData.get("displayName"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await new PreferencesRepository(supabase).update(user.id, { displayName: parsed.data || null });
  revalidatePath("/", "layout");
  return { message: "Adın güncellendi." };
}

export async function updateEmailAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { user, supabase } = await requireUser();
  const parsed = z.email("Geçerli bir e-posta adresi girin.").safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.toLowerCase() === user.email?.toLowerCase()) return { error: "Bu zaten mevcut e-posta adresin." };

  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/ayarlar` },
  );
  if (error) {
    return {
      error: error.code === "email_exists" ? "Bu e-posta başka bir hesapta kullanılıyor." : "E-posta güncellenemedi.",
    };
  }
  return {
    message: "Onay bağlantısı gönderildi. Değişikliğin tamamlanması için e-postadaki bağlantıya tıkla.",
  };
}

// ---------------------------------------------------------------- güvenlik

export async function changePasswordAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { user, supabase } = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = passwordSchema.safeParse(formData.get("newPassword"));
  if (!next.success) return { error: next.error.issues[0].message };
  if (next.data !== formData.get("confirmPassword")) return { error: "Yeni şifreler birbiriyle eşleşmiyor." };
  if (next.data === current) return { error: "Yeni şifre mevcut şifreden farklı olmalı." };
  if (!user.email) return { error: "Hesabında e-posta bulunamadı." };

  // Oturum çalınmış olsa bile şifre değiştirilemesin diye mevcut şifre doğrulanır.
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (verifyError) return { error: "Mevcut şifren hatalı." };

  const { error } = await supabase.auth.updateUser({ password: next.data });
  if (error) {
    return {
      error: error.code === "weak_password" ? "Şifre çok zayıf; daha güçlü bir şifre seç." : "Şifre güncellenemedi.",
    };
  }
  return { message: "Şifren güncellendi." };
}

export async function signOutEverywhereAction() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/giris?durum=cikis");
}

// ---------------------------------------------------------- kişiselleştirme

const preferencesSchema = z.object({
  personalizationEnabled: z.boolean(),
  autoRemember: z.boolean(),
  defaultDetail: z.enum(DETAIL_LEVELS),
  defaultProfileId: z.union([z.uuid(), z.literal("")]),
});

export async function updatePreferencesAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { user, supabase } = await requireUser();
  const parsed = preferencesSchema.safeParse({
    personalizationEnabled: formData.get("personalizationEnabled") === "on",
    autoRemember: formData.get("autoRemember") === "on",
    defaultDetail: formData.get("defaultDetail"),
    defaultProfileId: String(formData.get("defaultProfileId") ?? ""),
  });
  if (!parsed.success) return { error: "Ayarlar geçersiz." };

  if (parsed.data.defaultProfileId) {
    const exists = await new ProfileRepository(supabase).findById(parsed.data.defaultProfileId);
    if (!exists) return { error: "Seçilen profil bulunamadı." };
  }

  await new PreferencesRepository(supabase).update(user.id, {
    ...parsed.data,
    defaultProfileId: parsed.data.defaultProfileId || null,
  });
  revalidatePath("/", "layout");
  return { message: "Kişiselleştirme ayarların kaydedildi." };
}

// ----------------------------------------------------------- veri & gizlilik

export async function clearAllMemoriesAction(): Promise<SettingsState> {
  const { supabase } = await requireUser();
  await new ProfileRepository(supabase).deleteAllMemories();
  revalidatePath("/profiller");
  return { message: "Tüm profillerin hafızası silindi. Profil bilgilerin duruyor." };
}

export async function deleteAccountAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { user, supabase } = await requireUser();
  if (formData.get("confirmation") !== ACCOUNT_DELETE_CONFIRMATION) {
    return { error: `Onaylamak için kutuya tam olarak "${ACCOUNT_DELETE_CONFIRMATION}" yaz.` };
  }
  if (!user.email) return { error: "Hesabında e-posta bulunamadı." };

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: String(formData.get("password") ?? ""),
  });
  if (verifyError) return { error: "Şifren hatalı." };

  try {
    await deleteUserAccount(user.id);
  } catch (error) {
    console.error(error);
    return { error: "Hesap silinirken bir sorun oluştu. Lütfen tekrar dene." };
  }
  await supabase.auth.signOut();
  redirect("/?durum=hesap-silindi");
}
