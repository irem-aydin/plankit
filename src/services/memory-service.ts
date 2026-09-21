import "server-only";
import {
  decisionToMemory,
  type DecisionExtractionRequest,
  type ExtractedDecision,
} from "@/core/ai/decisions";
import type { GeneratedDocument } from "@/core/output/document";
import { GenerationError } from "@/core/output/errors";
import { renderDocumentMarkdown } from "@/core/output/markdown";
import { MAX_MEMORIES_PER_PROFILE } from "@/core/profile/profile";
import { ClaudePersonalizer, isAiConfigured } from "@/infrastructure/ai/claude-personalizer";
import { PreferencesRepository } from "@/infrastructure/supabase/preferences-repository";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

/**
 * Tamamlanmış bir plandan, profil hafızasına alınacak kalıcı kararları çıkarır.
 * Yazma yapmaz; kullanıcı hangilerini kaydedeceğini seçer.
 */
export async function proposeDecisionsForProfile(
  profileId: string,
  document: GeneratedDocument,
): Promise<ExtractedDecision[]> {
  if (!isAiConfigured()) {
    throw new GenerationError("AI_UNAVAILABLE", "Yapay zekâ özelliği şu anda kullanılamıyor.");
  }

  const profiles = new ProfileRepository(await createSupabaseServerClient());
  const profile = await profiles.findById(profileId);
  if (!profile) throw new GenerationError("UNKNOWN_SUBCATEGORY", "Profil bulunamadı.");

  const existing = await profiles.listMemories(profileId);
  const request: DecisionExtractionRequest = {
    documentMarkdown: renderDocumentMarkdown(document),
    documentTitle: document.title,
    existingMemories: existing.map((m) => m.content),
    context: document.context,
  };

  return new ClaudePersonalizer().extractDecisions(request);
}

/** Seçilen kararları profil hafızasına yazar; kaydedilen sayıyı döner. */
export async function saveDecisionsToProfile(
  userId: string,
  profileId: string,
  documentTitle: string,
  decisions: ExtractedDecision[],
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const prefs = await new PreferencesRepository(supabase).get(userId);
  if (!prefs.personalizationEnabled) {
    throw new GenerationError("AI_UNAVAILABLE", "Kişiselleştirme kapalı. Ayarlar'dan açabilirsin.");
  }

  const profiles = new ProfileRepository(supabase);
  if (!(await profiles.findById(profileId))) {
    throw new GenerationError("UNKNOWN_SUBCATEGORY", "Profil bulunamadı.");
  }

  const room = MAX_MEMORIES_PER_PROFILE - (await profiles.countMemories(profileId));
  if (room <= 0) {
    throw new GenerationError(
      "TOO_MANY_SELECTIONS",
      `Bu profilin hafızası dolu (${MAX_MEMORIES_PER_PROFILE} kayıt). Profil sayfasından eski kayıtları silebilirsin.`,
    );
  }

  const contents = decisions.slice(0, room).map((d) => decisionToMemory(d, documentTitle));
  await profiles.addMemories(userId, profileId, contents, "decision");
  return contents.length;
}
