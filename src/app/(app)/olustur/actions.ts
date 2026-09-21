"use server";

import { redirect } from "next/navigation";
import {
  classifyAttachment,
  validateAttachments,
  UNSUPPORTED_FILE_MESSAGE,
  type Attachment,
} from "@/core/ai/attachments";
import { customRequestSchema } from "@/core/ai/custom-document";
import { DETAIL_LEVELS, INTAKE_MODES, LANGUAGES, type DetailLevel, type IntakeMode, type Language } from "@/core/ai/intake";
import { GenerationError } from "@/core/output/errors";
import { getAuthenticatedUser } from "@/infrastructure/supabase/server";
import { buildContextForUser } from "@/services/context-service";
import { EntitlementError, generateForUser } from "@/services/generation-service";

export type GenerateFormState = { error?: string };

/**
 * Web formu → çıktı üretim servisi köprüsü. İş mantığı içermez; yalnızca
 * form verisini servis girdisine çevirir ve sonucu UI'a uyarlar.
 */
export async function generateAction(
  _prev: GenerateFormState,
  formData: FormData,
): Promise<GenerateFormState> {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/giris");

  const subcategoryIds = formData.getAll("subcategoryIds").map(String);
  const categoryId = String(formData.get("categoryId") ?? "");

  // Listede olmayan ihtiyaç: yapay zekâ konuya uygun çerçeveyi kendisi tasarlar.
  let customRequest;
  const customText = String(formData.get("customRequest") ?? "").trim();
  if (customText) {
    const parsedRequest = customRequestSchema.safeParse(customText);
    if (!parsedRequest.success) return { error: parsedRequest.error.issues[0].message };
    customRequest = { categoryId, text: parsedRequest.data };
  }

  let context;
  if (formData.get("ai") === "1") {
    const modeValue = String(formData.get("mode"));
    const mode: IntakeMode = (INTAKE_MODES as readonly string[]).includes(modeValue)
      ? (modeValue as IntakeMode)
      : "quick";

    const answers: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("ctx.") && typeof value === "string") answers[key.slice(4)] = value;
    }

    const detailValue = String(formData.get("detail"));
    const detail: DetailLevel = (DETAIL_LEVELS as readonly string[]).includes(detailValue)
      ? (detailValue as DetailLevel)
      : "summary";

    const languageValue = String(formData.get("language"));
    const language: Language = (LANGUAGES as readonly string[]).includes(languageValue)
      ? (languageValue as Language)
      : "tr";

    const profileId = String(formData.get("profileId") ?? "");
    const extra = String(formData.get("extra") ?? "");

    const result = await buildContextForUser(
      user.id,
      profileId
        ? { source: "profile", profileId, extra, detail, language }
        : customText
          ? { source: "request", requestText: customText, extra, detail, language }
          : {
              source: "intake",
              mode,
              answers,
              detail,
              language,
              saveAsProfileName:
                formData.get("saveAsProfile") === "1" ? String(formData.get("newProfileName") ?? "") : undefined,
            },
    );
    if (!result.ok) return { error: result.error };
    context = result.context;
  }

  // Eklenen dosyalar: yalnızca bu üretimde kullanılır, saklanmaz.
  const attachments: Attachment[] = [];
  if (context) {
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const sizeError = validateAttachments(files.map((f) => ({ name: f.name, size: f.size })));
    if (sizeError) return { error: sizeError };

    for (const file of files) {
      const kind = classifyAttachment(file.type, file.name);
      if (!kind) return { error: `"${file.name}" desteklenmiyor. ${UNSUPPORTED_FILE_MESSAGE}` };

      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        name: file.name.slice(0, 200),
        mediaType: file.type || (kind === "pdf" ? "application/pdf" : "text/plain"),
        kind,
        size: file.size,
        data: kind === "text" ? buffer.toString("utf8") : buffer.toString("base64"),
      });
    }
  }

  let outputId: string;
  try {
    ({ outputId } = await generateForUser(user.id, { subcategoryIds, context, customRequest }, attachments));
  } catch (error) {
    if (error instanceof EntitlementError) redirect("/abonelik?durum=limit");
    if (error instanceof GenerationError) return { error: error.message };
    console.error("Çıktı üretimi başarısız:", error);
    return { error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." };
  }

  redirect(`/ciktilar/${outputId}`);
}
