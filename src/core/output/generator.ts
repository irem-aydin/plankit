/**
 * ÇIKTI ÜRETİM MOTORU
 *
 * Seçilen alt başlıklardan aktif içerik kalıplarını çeker, doğrular ve tek bir
 * doldurulabilir dokümanda birleştirir.
 *
 * Bu modül bilinçli olarak framework'ten bağımsızdır: Next.js, React, Supabase
 * veya kimlik doğrulama bilmez. Girdi olarak düz bir nesne ve bir
 * CatalogRepository alır. Bugün web formu (server action), ileride şirket
 * entegrasyonları için bir REST API aynı fonksiyonu çağırır.
 *
 * Girdide kullanıcının durumu (context) varsa, şablon bölümleri enjekte edilen
 * ContentPersonalizer (yapay zekâ) ile kişiye özel doldurulur.
 *
 * Veritabanına yazmaz (kayıt, kredi düşme vb. services/ katmanındadır).
 */
import { z } from "zod";
import type { Attachment } from "../ai/attachments";
import { customRequestSchema } from "../ai/custom-document";
import { intakeContextSchema } from "../ai/intake";
import { PersonalizationError, type ContentPersonalizer } from "../ai/personalizer";
import type { CatalogEntry, CatalogRepository } from "./catalog-repository";
import {
  blueprintContentSchema,
  type BlueprintContent,
  type ChecklistContent,
  type GuideContent,
  type OutputType,
  type TemplateContent,
} from "./content-schema";
import type {
  ChecklistInstance,
  DocumentSection,
  GeneratedDocument,
  GuideInstance,
  SectionBody,
  TemplateInstance,
} from "./document";
import { GenerationError } from "./errors";

export const MAX_SELECTIONS = 50;

/** Kataloğa bağlı olmayan (serbest istekle üretilen) bölümün kimliği */
export const CUSTOM_SECTION_ID = "custom";
/** Şablonu yapay zekânın tasarladığı bölümler için şablon kimliği */
export const AI_DESIGNED_TEMPLATE_ID = "ai-designed";

/** Bu bölüm kataloğa bağlı mı? (raporlama kayıtları yalnızca katalog için tutulur) */
export function isCatalogSection(section: Pick<DocumentSection, "subcategoryId" | "templateId">): boolean {
  return section.subcategoryId !== CUSTOM_SECTION_ID;
}

export const generateOutputInputSchema = z.object({
  subcategoryIds: z.array(z.uuid()).max(MAX_SELECTIONS),
  title: z.string().trim().max(200).optional(),
  /** Verilirse şablonlar yapay zekâ ile bu duruma göre doldurulur */
  context: intakeContextSchema.optional(),
  /** Listede olmayan bir ihtiyaç: yapay zekâ konuya uygun şablonu kendisi tasarlar */
  customRequest: z.object({ categoryId: z.uuid(), text: customRequestSchema }).optional(),
});

export type GenerateOutputInput = z.infer<typeof generateOutputInputSchema>;

export interface GenerateOutputOptions {
  now?: () => Date;
  /** Kullanıcının eklediği dosyalar; saklanmaz, yalnızca üretimde kullanılır */
  attachments?: Attachment[];
  /** input.context verildiğinde zorunlu */
  personalizer?: ContentPersonalizer;
}

export async function generateOutput(
  rawInput: GenerateOutputInput,
  repository: CatalogRepository,
  options: GenerateOutputOptions = {},
): Promise<GeneratedDocument> {
  const parsed = generateOutputInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const tooMany = parsed.error.issues.some((i) => i.code === "too_big");
    throw tooMany
      ? new GenerationError(
          "TOO_MANY_SELECTIONS",
          `En fazla ${MAX_SELECTIONS} alt başlık seçilebilir.`,
        )
      : new GenerationError(
          "UNKNOWN_SUBCATEGORY",
          "Geçersiz alt başlık kimliği.",
          parsed.error.issues,
        );
  }

  const ids = [...new Set(parsed.data.subcategoryIds)];
  if (ids.length === 0 && !parsed.data.customRequest) {
    throw new GenerationError(
      "EMPTY_SELECTION",
      "Çıktı oluşturmak için en az bir alt başlık seçin.",
    );
  }

  const entries = await repository.findEntriesBySubcategoryIds(ids);

  const found = new Set(entries.map((e) => e.subcategory.id));
  const unknown = ids.filter((id) => !found.has(id));
  if (unknown.length > 0) {
    throw new GenerationError(
      "UNKNOWN_SUBCATEGORY",
      "Seçilen alt başlıklardan bazıları bulunamadı.",
      { unknown },
    );
  }

  const ordered = [...entries].sort(
    (a, b) =>
      a.category.sortOrder - b.category.sortOrder ||
      a.subcategory.sortOrder - b.subcategory.sortOrder,
  );

  const sections: DocumentSection[] = [];
  const missing: GeneratedDocument["missing"] = [];

  const toDesign: CatalogEntry[] = [];
  for (const entry of ordered) {
    if (!entry.template) {
      // Hazır içerik yok: bağlam verildiyse yapay zekâ tasarlar, verilmediyse atlanır.
      if (parsed.data.context) toDesign.push(entry);
      else missing.push({ subcategoryId: entry.subcategory.id, name: entry.subcategory.name });
      continue;
    }
    sections.push(buildSection(entry, entry.template));
  }

  if (sections.length === 0 && toDesign.length === 0 && !parsed.data.customRequest) {
    throw new GenerationError(
      "NO_CONTENT",
      "Seçilen alt başlıklar için henüz içerik hazırlanmadı.",
      { missing },
    );
  }

  const now = options.now?.() ?? new Date();

  if (parsed.data.context) {
    const context = parsed.data.context;
    const personalizer = options.personalizer;
    if (!personalizer) {
      throw new GenerationError("AI_UNAVAILABLE", "Yapay zekâ özelliği şu anda kullanılamıyor.");
    }

    const designed = await designSections(
      toDesign,
      parsed.data.customRequest,
      [...sections, ...toDesign.map((e) => ({ subcategoryName: e.subcategory.name }))],
      context,
      personalizer,
      repository,
      now,
      options.attachments,
    );
    await personalizeSections(sections, context, personalizer, now, options.attachments);
    sections.push(...designed);
  }

  return {
    schemaVersion: 1,
    title: parsed.data.title || documentTitle(parsed.data.title, sections, ordered),
    generatedAt: now.toISOString(),
    sections,
    missing,
    context: parsed.data.context,
    attachments: (options.attachments ?? []).map(({ name, mediaType, kind, size }) => ({
      name,
      mediaType,
      kind,
      size,
    })),
  };
}

/**
 * Hazır şablonu olmayan başlıklar ve serbest istek için yapay zekâ şablonu
 * tasarlar ve doldurur. Sonuçlar ayrı bölümler olarak döner.
 */
async function designSections(
  entries: CatalogEntry[],
  customRequest: GenerateOutputInput["customRequest"],
  allTopics: { subcategoryName: string }[],
  context: NonNullable<GenerateOutputInput["context"]>,
  personalizer: ContentPersonalizer,
  repository: CatalogRepository,
  now: Date,
  attachments?: Attachment[],
): Promise<DocumentSection[]> {
  const jobs: { topic: string; description?: string; category: CatalogEntry["category"]; subcategoryId: string }[] =
    entries.map((e) => ({
      topic: e.subcategory.name,
      description: e.subcategory.description,
      category: e.category,
      subcategoryId: e.subcategory.id,
    }));

  if (customRequest) {
    const category = await repository.findCategoryById(customRequest.categoryId);
    if (!category) {
      throw new GenerationError("UNKNOWN_SUBCATEGORY", "Seçilen kategori bulunamadı.");
    }
    jobs.push({ topic: customRequest.text, category, subcategoryId: CUSTOM_SECTION_ID });
  }

  if (jobs.length === 0) return [];

  const today = now.toISOString().slice(0, 10);
  try {
    return await Promise.all(
      jobs.map(async (job) => {
        const result = await personalizer.designDocument({
          topic: job.topic,
          topicDescription: job.description,
          categoryName: job.category.name,
          relatedTopics: allTopics.map((t) => t.subcategoryName).filter((name) => name !== job.topic),
          context,
          today,
          attachments,
        });

        return {
          subcategoryId: job.subcategoryId,
          subcategoryName: job.subcategoryId === CUSTOM_SECTION_ID ? result.title.slice(0, 80) : job.topic,
          categoryId: job.category.id,
          categoryName: job.category.name,
          templateId: AI_DESIGNED_TEMPLATE_ID,
          templateVersion: 1,
          body: result.template,
          personalization: {
            model: result.model,
            keyFindings: result.keyFindings,
            assumptions: result.assumptions,
            openQuestions: result.openQuestions,
          },
        } satisfies DocumentSection;
      }),
    );
  } catch (error) {
    if (error instanceof PersonalizationError) throw new GenerationError("AI_FAILED", error.message);
    throw error;
  }
}

/** Şablon tipindeki bölümleri paralel olarak kişiselleştirir (yerinde günceller). */
async function personalizeSections(
  sections: DocumentSection[],
  context: NonNullable<GenerateOutputInput["context"]>,
  personalizer: ContentPersonalizer | undefined,
  now: Date,
  attachments?: Attachment[],
) {
  const targets = sections.filter((s) => supportsPersonalization(s.body.kind));
  if (targets.length === 0) return;
  if (!personalizer) {
    throw new GenerationError("AI_UNAVAILABLE", "Yapay zekâ özelliği şu anda kullanılamıyor.");
  }

  const topics = sections.map((s) => s.subcategoryName);
  try {
    await Promise.all(
      targets.map(async (section) => {
        if (section.body.kind !== "template") return;
        const result = await personalizer.personalizeTemplate({
          template: section.body,
          subcategoryName: section.subcategoryName,
          categoryName: section.categoryName,
          relatedTopics: topics.filter((t) => t !== section.subcategoryName),
          context,
          today: now.toISOString().slice(0, 10),
          attachments,
        });
        section.body = result.template;
        section.personalization = {
          model: result.model,
          keyFindings: result.keyFindings,
          assumptions: result.assumptions,
          openQuestions: result.openQuestions,
        };
      }),
    );
  } catch (error) {
    if (error instanceof PersonalizationError) {
      throw new GenerationError("AI_FAILED", error.message);
    }
    throw error;
  }
}

/** Şimdilik yalnızca şablonlar yapay zekâ ile doldurulur. */
export function supportsPersonalization(kind: OutputType): boolean {
  return kind === "template";
}

function buildSection(
  entry: CatalogEntry,
  template: NonNullable<CatalogEntry["template"]>,
): DocumentSection {
  const result = blueprintContentSchema.safeParse(template.content);
  if (!result.success) {
    throw new GenerationError(
      "INVALID_CONTENT",
      `"${entry.subcategory.name}" içeriği geçersiz biçimde.`,
      { templateId: template.id, issues: result.error.issues },
    );
  }
  if (result.data.kind !== entry.subcategory.outputType) {
    throw new GenerationError(
      "INVALID_CONTENT",
      `"${entry.subcategory.name}" için içerik tipi (${result.data.kind}) alt başlığın çıktı tipiyle (${entry.subcategory.outputType}) uyuşmuyor.`,
      { templateId: template.id },
    );
  }

  return {
    subcategoryId: entry.subcategory.id,
    subcategoryName: entry.subcategory.name,
    categoryId: entry.category.id,
    categoryName: entry.category.name,
    templateId: template.id,
    templateVersion: template.version,
    body: instantiate(result.data),
  };
}

/** Kalıbı, kullanıcının dolduracağı boş değerlerle örnekler. */
export function instantiate(content: BlueprintContent): SectionBody {
  switch (content.kind) {
    case "template":
      return instantiateTemplate(content);
    case "checklist":
      return instantiateChecklist(content);
    case "guide":
      return instantiateGuide(content);
  }
}

function instantiateTemplate(content: TemplateContent): TemplateInstance {
  return {
    kind: "template",
    summary: content.summary,
    sections: content.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      fields: section.fields.map((field) => ({ ...field, value: "" })),
      table: section.table && {
        columns: section.table.columns,
        exampleRows: section.table.exampleRows,
        rows: Array.from({ length: section.table.emptyRows }, () =>
          emptyRow(section.table!.columns.map((c) => c.id)),
        ),
      },
    })),
  };
}

function instantiateChecklist(content: ChecklistContent): ChecklistInstance {
  return {
    kind: "checklist",
    summary: content.summary,
    groups: content.groups.map((group) => ({
      id: group.id,
      title: group.title,
      items: group.items.map((item) => ({ ...item, checked: false, note: "" })),
    })),
  };
}

function instantiateGuide(content: GuideContent): GuideInstance {
  return {
    kind: "guide",
    summary: content.summary,
    sections: content.sections,
    reflectionQuestions: content.reflectionQuestions.map((q) => ({
      ...q,
      answer: "",
    })),
    notes: "",
  };
}

export function emptyRow(columnIds: string[]): Record<string, string> {
  return Object.fromEntries(columnIds.map((id) => [id, ""]));
}

function documentTitle(
  explicit: string | undefined,
  sections: DocumentSection[],
  entries: CatalogEntry[],
): string {
  if (explicit) return explicit;
  if (sections.length === 1) return `${sections[0].categoryName} — ${sections[0].subcategoryName}`;
  if (sections.length > 1) {
    const categories = [...new Set(sections.map((s) => s.categoryName))];
    return `${categories.join(" + ")} — ${sections.length} başlık`;
  }
  return defaultTitle(entries);
}

function defaultTitle(entries: CatalogEntry[]): string {
  const categories = [...new Set(entries.map((e) => e.category.name))];
  if (entries.length === 1) {
    return `${categories[0]} — ${entries[0].subcategory.name}`;
  }
  return `${categories.join(" + ")} — ${entries.length} başlık`;
}
