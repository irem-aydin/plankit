import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "@/config/env";
import { PersonalizationError } from "@/core/ai/personalizer";
import {
  PREVIEW_GLOBAL_DAILY,
  PREVIEW_PER_VISITOR_DAILY,
  previewInputSchema,
  type PlanPreview,
} from "@/core/ai/preview";
import { generatePlanPreview } from "@/infrastructure/ai/claude-previewer";
import { isAiConfigured } from "@/infrastructure/ai/claude-personalizer";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin";

export type PreviewOutcome = { ok: true; preview: PlanPreview } | { ok: false; error: string; limited?: boolean };

/**
 * IP adresinin geri çevrilemez özeti. Gizli anahtarla tuzlanır; aynı IP her
 * gün farklı bir özete dönüşür, yani ziyaretçiler günler arasında izlenemez.
 */
export function visitorKey(ip: string, day = new Date().toISOString().slice(0, 10)): string {
  return createHash("sha256").update(`${serverEnv.supabaseSecretKey}:preview:${day}:${ip}`).digest("hex").slice(0, 32);
}

/** Kayıtsız ziyaretçi için önizleme: doğrulama → kota → yapay zekâ. Metin saklanmaz. */
export async function previewForVisitor(rawText: string, ip: string): Promise<PreviewOutcome> {
  const parsed = previewInputSchema.safeParse(rawText);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!isAiConfigured()) return { ok: false, error: "Önizleme şu anda kullanılamıyor." };

  const { data: allowed, error } = await createSupabaseAdminClient().rpc("consume_preview_quota", {
    p_visitor: visitorKey(ip),
    p_per_visitor: PREVIEW_PER_VISITOR_DAILY,
    p_global: PREVIEW_GLOBAL_DAILY,
  });
  if (error) {
    console.error("Önizleme kotası okunamadı:", error.message);
    return { ok: false, error: "Önizleme şu anda kullanılamıyor. Ücretsiz hesapla hemen tam plan oluşturabilirsin." };
  }
  if (!allowed) {
    return {
      ok: false,
      limited: true,
      error: "Bugünkü ücretsiz önizleme hakkın doldu. Ücretsiz hesap açarak tam planını hemen oluşturabilirsin.",
    };
  }

  try {
    const preview = await generatePlanPreview(parsed.data);
    if (!preview) {
      return { ok: false, error: "Bu istek için önizleme hazırlanamadı. İş veya proje planlamayla ilgili bir durum anlatır mısın?" };
    }
    return { ok: true, preview };
  } catch (e) {
    return { ok: false, error: e instanceof PersonalizationError ? e.message : "Önizleme hazırlanamadı. Lütfen tekrar dene." };
  }
}
