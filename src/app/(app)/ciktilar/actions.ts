"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { GenerationError } from "@/core/output/errors";
import type { RefineSectionInput } from "@/core/output/refiner";
import { redirect } from "next/navigation";
import { generatedDocumentSchema, type GeneratedDocument } from "@/core/output/document";
import { createShareToken } from "@/core/share/share";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/infrastructure/supabase/server";
import type { ExtractedDecision } from "@/core/ai/decisions";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { proposeDecisionsForProfile, saveDecisionsToProfile } from "@/services/memory-service";
import { EntitlementError } from "@/services/generation-service";
import { JobLimitError, startRefineJob } from "@/services/job-service";

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: string };

export async function saveOutputAction(outputId: string, document: GeneratedDocument): Promise<SaveResult> {
  const parsed = generatedDocumentSchema.safeParse(document);
  if (!parsed.success) return { ok: false, error: "Doküman biçimi geçersiz." };

  // Kullanıcı istemcisi: RLS yalnızca kendi çıktısını güncellemeye izin verir.
  const supabase = await createSupabaseServerClient();
  const updated = await new OutputRepository(supabase).updateDocument(outputId, parsed.data);
  if (!updated) return { ok: false, error: "Çıktı bulunamadı veya erişim yetkiniz yok." };

  revalidatePath("/ciktilar");
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function deleteOutputAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createSupabaseServerClient();
  await new OutputRepository(supabase).delete(id);
  revalidatePath("/ciktilar");
  redirect("/ciktilar");
}

export type ListActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** Planın adını değiştirir (liste sayfasından). */
export async function renameOutputAction(outputId: string, title: string): Promise<ListActionResult> {
  const clean = title.trim().slice(0, 200);
  if (!clean) return { ok: false, error: "Plan adı boş olamaz." };

  const supabase = await createSupabaseServerClient();
  const outputs = new OutputRepository(supabase);
  const output = await outputs.findById(outputId);
  if (!output) return { ok: false, error: "Plan bulunamadı." };

  await outputs.updateDocument(outputId, { ...output.document, title: clean });
  revalidatePath("/ciktilar");
  revalidatePath("/panel");
  return { ok: true };
}

/**
 * Planın bir kopyasını oluşturur ("geçen ayki planı güncelle" senaryosu).
 * Kullanım hakkından düşmez: yapay zekâ çağrılmaz.
 */
export async function copyOutputAction(outputId: string): Promise<ListActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { ok: false, error: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." };

  // Sahiplik: RLS yalnızca kullanıcının kendi planını döndürür.
  const source = await new OutputRepository(await createSupabaseServerClient()).findById(outputId);
  if (!source) return { ok: false, error: "Plan bulunamadı." };

  const parsed = generatedDocumentSchema.safeParse(source.document);
  if (!parsed.success) return { ok: false, error: "Bu plan kopyalanamadı." };

  const title = `${parsed.data.title} (kopya)`.slice(0, 200);
  // Kullanıcıların doğrudan ekleme yetkisi yok (RLS); kayıt sunucu tarafında, kullanıcının adına açılır.
  const id = await new OutputRepository(createSupabaseAdminClient()).create(
    user.id,
    { ...parsed.data, title, generatedAt: new Date().toISOString() },
    { trackSelections: false },
  );
  revalidatePath("/ciktilar");
  revalidatePath("/panel");
  return { ok: true, id };
}

export type ShareResult = { ok: true; token: string | null; views: number } | { ok: false; error: string };

/**
 * Planın paylaşım bağlantısını açar veya kapatır. Yeniden açmak yeni bir
 * bağlantı üretir; eski bağlantı çalışmaz. RLS yalnızca kendi planına izin verir.
 */
export async function setSharingAction(outputId: string, enabled: boolean): Promise<ShareResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { ok: false, error: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." };

  const token = enabled ? createShareToken() : null;
  const updated = await new OutputRepository(await createSupabaseServerClient()).setShareToken(outputId, token);
  if (!updated) return { ok: false, error: "Plan bulunamadı veya erişim yetkiniz yok." };

  revalidatePath("/ciktilar");
  return { ok: true, token, views: 0 };
}

export type RefineResult =
  | { ok: true; jobId: string }
  | { ok: false; error: string; needsSubscription?: boolean };

/**
 * Açık soruların cevaplarıyla bir bölümü güncelleme işini başlatır. Güncelleme
 * arka planda çalışır ve bitince plana kaydedilir; ekran işi takip eder.
 */
export async function refineSectionAction(
  outputId: string,
  document: GeneratedDocument,
  input: RefineSectionInput,
): Promise<RefineResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { ok: false, error: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." };

  const parsed = generatedDocumentSchema.safeParse(document);
  if (!parsed.success) return { ok: false, error: "Doküman biçimi geçersiz." };
  if (!parsed.data.sections[input.sectionIndex]) return { ok: false, error: "Bölüm bulunamadı." };

  // Sahiplik kontrolü: RLS yalnızca kullanıcının kendi çıktısını döndürür.
  const supabase = await createSupabaseServerClient();
  if (!(await new OutputRepository(supabase).findById(outputId))) {
    return { ok: false, error: "Çıktı bulunamadı veya erişim yetkiniz yok." };
  }

  try {
    const job = await startRefineJob(user.id, outputId, parsed.data, input);
    after(job.run);
    return { ok: true, jobId: job.jobId };
  } catch (error) {
    if (error instanceof EntitlementError) return { ok: false, error: error.message, needsSubscription: true };
    if (error instanceof JobLimitError || error instanceof GenerationError) return { ok: false, error: error.message };
    console.error("Plan güncellemesi başlatılamadı:", error);
    return { ok: false, error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." };
  }
}

/** Planın kayıtlı son hâli (arka plan güncellemesi bittikten sonra ekranı yenilemek için). */
export async function loadOutputAction(outputId: string): Promise<GeneratedDocument | null> {
  const output = await new OutputRepository(await createSupabaseServerClient()).findById(outputId);
  if (!output) return null;
  const parsed = generatedDocumentSchema.safeParse(output.document);
  return parsed.success ? parsed.data : null;
}

export type DecisionProposal =
  | { ok: true; decisions: ExtractedDecision[]; profileId: string; profileName: string }
  | { ok: false; error: string };

/** Plandaki kalıcı kararları çıkarır (henüz kaydetmez). */
export async function proposeDecisionsAction(
  outputId: string,
  document: GeneratedDocument,
  profileId: string,
): Promise<DecisionProposal> {
  const user = await getAuthenticatedUser();
  if (!user) return { ok: false, error: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." };

  const parsed = generatedDocumentSchema.safeParse(document);
  if (!parsed.success) return { ok: false, error: "Doküman biçimi geçersiz." };

  const supabase = await createSupabaseServerClient();
  if (!(await new OutputRepository(supabase).findById(outputId))) {
    return { ok: false, error: "Çıktı bulunamadı veya erişim yetkiniz yok." };
  }
  const profile = await new ProfileRepository(supabase).findById(profileId);
  if (!profile) return { ok: false, error: "Profil bulunamadı." };

  try {
    const decisions = await proposeDecisionsForProfile(profileId, parsed.data);
    return { ok: true, decisions, profileId, profileName: profile.name };
  } catch (error) {
    if (error instanceof GenerationError) return { ok: false, error: error.message };
    console.error("Kararlar çıkarılamadı:", error);
    return { ok: false, error: "Kararlar çıkarılamadı. Lütfen tekrar deneyin." };
  }
}

export type SaveDecisionsResult = { ok: true; saved: number } | { ok: false; error: string };

/** Kullanıcının seçtiği kararları profil hafızasına kaydeder. */
export async function saveDecisionsAction(
  profileId: string,
  documentTitle: string,
  decisions: ExtractedDecision[],
): Promise<SaveDecisionsResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { ok: false, error: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." };
  if (decisions.length === 0) return { ok: false, error: "Kaydedilecek madde seçilmedi." };

  try {
    const saved = await saveDecisionsToProfile(user.id, profileId, documentTitle, decisions);
    revalidatePath("/profiller");
    revalidatePath(`/profiller/${profileId}`);
    return { ok: true, saved };
  } catch (error) {
    if (error instanceof GenerationError) return { ok: false, error: error.message };
    console.error("Kararlar kaydedilemedi:", error);
    return { ok: false, error: "Kararlar kaydedilemedi. Lütfen tekrar deneyin." };
  }
}
