import "server-only";
import {
  buildIntakeContext,
  MIN_CONTEXT_CHARS,
  type DetailLevel,
  type IntakeContext,
  type IntakeMode,
  type Language,
} from "@/core/ai/intake";
import {
  MAX_MEMORIES_PER_PROFILE,
  MAX_PROFILES_PER_USER,
  memoryFromAnswer,
  profileDetailsFromQuickAnswers,
  profileToContextEntries,
} from "@/core/profile/profile";
import { PreferencesRepository } from "@/infrastructure/supabase/preferences-repository";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export type ContextRequest = { detail: DetailLevel; language: Language } & (
  | { source: "profile"; profileId: string; extra: string }
  /** Kullanıcı "ne oluşturmak istiyorsun" kutusuna yazdı: soruları tekrar sormayız */
  | { source: "request"; requestText: string; extra: string }
  | { source: "intake"; mode: IntakeMode; answers: Record<string, string>; saveAsProfileName?: string }
);

type ContextResult = { ok: true; context: IntakeContext } | { ok: false; error: string };

/**
 * Yapay zekâ bağlamını hazırlar: seçilen profil + hafızası (+ plana özel ek
 * bilgi) veya tek seferlik soru cevapları. İsteğe bağlı olarak cevapları yeni
 * bir profil olarak kaydeder. Kullanıcı istemcisiyle (RLS) çalışır.
 */
export async function buildContextForUser(userId: string, request: ContextRequest): Promise<ContextResult> {
  const supabase = await createSupabaseServerClient();
  const profiles = new ProfileRepository(supabase);

  if (request.source === "profile") {
    const prefs = await new PreferencesRepository(supabase).get(userId);
    if (!prefs.personalizationEnabled) {
      return { ok: false, error: "Kişiselleştirme ayarlarından kapalı. Profil kullanmak için Ayarlar'dan açabilirsin." };
    }

    const profile = await profiles.findById(request.profileId);
    if (!profile) return { ok: false, error: "Seçilen profil bulunamadı." };

    const memories = await profiles.listMemories(profile.id);
    const entries = profileToContextEntries(profile, memories);
    const extra = request.extra.trim().slice(0, 8_000);
    if (extra) entries.push({ question: "Bu plana özel ek bilgi", answer: extra });

    const chars = entries.slice(1).reduce((n, e) => n + e.answer.length, 0);
    if (chars < MIN_CONTEXT_CHARS) {
      return {
        ok: false,
        error: "Bu profilde yeterli bilgi yok. Profili doldur ya da bu plana özel birkaç cümle ekle.",
      };
    }

    return {
      ok: true,
      context: {
        mode: "free",
        detail: request.detail,
        language: request.language,
        entries,
        profile: { id: profile.id, name: profile.name },
      },
    };
  }

  if (request.source === "request") {
    // Serbest istek tek başına bağlamdır; ek bilgi verilmişse eklenir.
    const entries = [{ question: "Kullanıcının isteği", answer: request.requestText.trim().slice(0, 8_000) }];
    const extra = request.extra.trim().slice(0, 8_000);
    if (extra) entries.push({ question: "Ek bilgi", answer: extra });

    const chars = entries.reduce((n, e) => n + e.answer.length, 0);
    if (chars < MIN_CONTEXT_CHARS) {
      return { ok: false, error: "Ne istediğini biraz daha açık yazar mısın? (En az birkaç cümle)" };
    }
    return { ok: true, context: { mode: "free", detail: request.detail, language: request.language, entries } };
  }

  const built = buildIntakeContext(request.mode, request.answers, request.detail, request.language);
  if (!built.ok) return built;

  const name = request.saveAsProfileName?.trim();
  if (name) {
    if ((await profiles.count()) >= MAX_PROFILES_PER_USER) {
      return { ok: false, error: `En fazla ${MAX_PROFILES_PER_USER} profil oluşturabilirsin.` };
    }
    const details =
      request.mode === "free"
        ? { notes: (request.answers.free ?? "").trim().slice(0, 2_000) }
        : profileDetailsFromQuickAnswers(request.answers);
    const profileId = await profiles.create(userId, { name: name.slice(0, 80), kind: "work", details });
    built.context.profile = { id: profileId, name: name.slice(0, 80) };
  }

  return built;
}

/**
 * Otomatik hatırlama açıksa, açık sorulara verilen cevapları profil hafızasına ekler.
 * Hata üretimi engellemez; yalnızca kaydedilir.
 */
export async function rememberAnswers(
  userId: string,
  profileId: string | undefined,
  answers: { question: string; answer: string }[],
): Promise<number> {
  if (!profileId || answers.length === 0) return 0;
  try {
    const supabase = await createSupabaseServerClient();
    const prefs = await new PreferencesRepository(supabase).get(userId);
    if (!prefs.personalizationEnabled || !prefs.autoRemember) return 0;

    const profiles = new ProfileRepository(supabase);
    if (!(await profiles.findById(profileId))) return 0;

    const room = MAX_MEMORIES_PER_PROFILE - (await profiles.countMemories(profileId));
    const contents = answers.slice(0, Math.max(0, room)).map((a) => memoryFromAnswer(a.question, a.answer));
    await profiles.addMemories(userId, profileId, contents, "plan_answer");
    return contents.length;
  } catch (error) {
    console.error("Hafızaya kaydedilemedi:", error);
    return 0;
  }
}
