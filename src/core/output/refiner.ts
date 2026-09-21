/**
 * Kişiselleştirilmiş bir bölümü, kullanıcının açık sorulara verdiği cevaplarla
 * günceller. Mevcut içerik (kullanıcı düzenlemeleri dahil) korunarak revize edilir.
 * generator.ts gibi framework'ten bağımsızdır ve veritabanına yazmaz.
 */
import { z } from "zod";
import type { ContentPersonalizer } from "../ai/personalizer";
import { PersonalizationError } from "../ai/personalizer";
import type { GeneratedDocument } from "./document";
import { GenerationError } from "./errors";

export const refineSectionInputSchema = z.object({
  sectionIndex: z.number().int().min(0),
  answers: z
    .array(z.object({ question: z.string().max(500), answer: z.string().max(4_000) }))
    .max(20),
});

export type RefineSectionInput = z.infer<typeof refineSectionInputSchema>;

export async function refineSection(
  document: GeneratedDocument,
  rawInput: RefineSectionInput,
  personalizer: ContentPersonalizer,
  options: { now?: () => Date } = {},
): Promise<GeneratedDocument> {
  const input = refineSectionInputSchema.parse(rawInput);
  const section = document.sections[input.sectionIndex];

  if (!section || section.body.kind !== "template" || !section.personalization || !document.context) {
    throw new GenerationError("INVALID_CONTENT", "Bu bölüm yapay zekâ ile güncellenemez.");
  }

  const answers = input.answers
    .map((a) => ({ question: a.question.trim(), answer: a.answer.trim() }))
    .filter((a) => a.question && a.answer);
  if (answers.length === 0) {
    throw new GenerationError("EMPTY_SELECTION", "Planı güncellemek için en az bir soruyu cevaplayın.");
  }

  const now = options.now?.() ?? new Date();
  let result;
  try {
    result = await personalizer.personalizeTemplate({
      template: section.body,
      subcategoryName: section.subcategoryName,
      categoryName: section.categoryName,
      relatedTopics: document.sections.filter((_, i) => i !== input.sectionIndex).map((s) => s.subcategoryName),
      context: document.context,
      today: now.toISOString().slice(0, 10),
      revision: { answers, previousAssumptions: section.personalization.assumptions },
    });
  } catch (error) {
    if (error instanceof PersonalizationError) throw new GenerationError("AI_FAILED", error.message);
    throw error;
  }

  const answeredQuestions = new Set(answers.map((a) => a.question));

  return {
    ...document,
    // Yeni cevaplar bağlama eklenir; sonraki güncellemeler de bunları bilir.
    context: {
      ...document.context,
      entries: [
        ...document.context.entries.filter((e) => !answeredQuestions.has(e.question)),
        ...answers,
      ].slice(-MAX_CONTEXT_ENTRIES),
    },
    sections: document.sections.map((s, i) =>
      i === input.sectionIndex
        ? {
            ...s,
            body: result.template,
            personalization: {
              model: result.model,
              keyFindings: result.keyFindings,
              assumptions: result.assumptions,
              openQuestions: result.openQuestions,
            },
          }
        : s,
    ),
  };
}

const MAX_CONTEXT_ENTRIES = 60;
