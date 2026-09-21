import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { PersonalizationError } from "@/core/ai/personalizer";
import {
  normalizePreview,
  PREVIEW_SYSTEM_PROMPT,
  previewResponseSchema,
  type PlanPreview,
  type PreviewResponse,
} from "@/core/ai/preview";

/**
 * Kayıtsız önizleme herkese açık olduğu için tam planlardan daha ekonomik
 * bir model kullanılır (~10-15 sn, istek başına ~0,01-0,02 $). Haiku denendi;
 * Türkçe yazım hataları ilk izlenim için kabul edilemez bulundu.
 */
const PREVIEW_MODEL = "claude-sonnet-5";

export async function generatePlanPreview(text: string, client = new Anthropic()): Promise<PlanPreview | null> {
  let message;
  try {
    message = await client.beta.messages.create({
      model: PREVIEW_MODEL,
      max_tokens: 1_200,
      output_config: { format: betaZodOutputFormat(previewResponseSchema) },
      system: PREVIEW_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Ziyaretçinin anlattığı durum:\n"""\n${text}\n"""` }],
    });
  } catch (error) {
    console.error("Önizleme çağrısı başarısız:", error instanceof Error ? error.message : error);
    throw new PersonalizationError("Önizleme şu anda hazırlanamadı. Birkaç dakika sonra tekrar dene.", error);
  }

  if (message.stop_reason === "refusal") return null;
  const text0 = message.content.find((b) => b.type === "text");
  if (!text0 || text0.type !== "text") throw new PersonalizationError("Önizleme okunamadı. Lütfen tekrar dene.");

  let parsed: PreviewResponse;
  try {
    parsed = previewResponseSchema.parse(JSON.parse(text0.text));
  } catch {
    throw new PersonalizationError("Önizleme okunamadı. Lütfen tekrar dene.");
  }
  return normalizePreview(parsed);
}
