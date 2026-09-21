/**
 * Üretilen çıktı dokümanı: kalıpların kullanıcı tarafından doldurulabilir
 * örnekleri (instance). generated_outputs.document kolonunda saklanır ve
 * düzenleme sonrası kaydedilirken bu şema ile doğrulanır.
 */
import { z } from "zod";
import {
  templateColumnSchema,
  templateFieldSchema,
} from "./content-schema";
import { attachmentMetaSchema } from "../ai/attachments";
import { intakeContextSchema } from "../ai/intake";

const text = z.string().max(20_000);

export const templateInstanceSchema = z.object({
  kind: z.literal("template"),
  summary: z.string(),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      fields: z.array(templateFieldSchema.extend({ value: text })),
      table: z
        .object({
          columns: z.array(templateColumnSchema),
          exampleRows: z.array(z.record(z.string(), z.string())),
          rows: z.array(z.record(z.string(), text)).max(200),
        })
        .optional(),
    }),
  ),
});

export const checklistInstanceSchema = z.object({
  kind: z.literal("checklist"),
  summary: z.string(),
  groups: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      items: z.array(
        z.object({
          id: z.string(),
          text: z.string(),
          hint: z.string().optional(),
          checked: z.boolean(),
          note: text,
        }),
      ),
    }),
  ),
});

export const guideInstanceSchema = z.object({
  kind: z.literal("guide"),
  summary: z.string(),
  sections: z.array(
    z.object({
      id: z.string(),
      heading: z.string(),
      paragraphs: z.array(z.string()),
      tips: z.array(z.string()),
    }),
  ),
  reflectionQuestions: z.array(
    z.object({ id: z.string(), question: z.string(), answer: text }),
  ),
  notes: text,
});

export const sectionBodySchema = z.discriminatedUnion("kind", [
  templateInstanceSchema,
  checklistInstanceSchema,
  guideInstanceSchema,
]);

export const documentSectionSchema = z.object({
  subcategoryId: z.string(),
  subcategoryName: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  templateId: z.string(),
  templateVersion: z.number().int(),
  body: sectionBodySchema,
  /** Yapay zekâ ile kişiselleştirildiyse */
  personalization: z
    .object({
      model: z.string(),
      keyFindings: z.array(z.string()).default([]),
      assumptions: z.array(z.string()),
      openQuestions: z.array(z.string()),
    })
    .optional(),
});

export const generatedDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().min(1).max(200),
  generatedAt: z.string(),
  sections: z.array(documentSectionSchema),
  /** Seçilen ama henüz içeriği olmayan alt başlıklar */
  missing: z.array(z.object({ subcategoryId: z.string(), name: z.string() })),
  /** Kullanıcının anlattığı durum (yapay zekâ kullanıldıysa) */
  context: intakeContextSchema.optional(),
  /** Plana eklenen dosyaların künyesi (dosyaların kendisi saklanmaz) */
  attachments: z.array(attachmentMetaSchema).default([]),
});

export type TemplateInstance = z.infer<typeof templateInstanceSchema>;
export type ChecklistInstance = z.infer<typeof checklistInstanceSchema>;
export type GuideInstance = z.infer<typeof guideInstanceSchema>;
export type SectionBody = z.infer<typeof sectionBodySchema>;
export type DocumentSection = z.infer<typeof documentSectionSchema>;
export type GeneratedDocument = z.infer<typeof generatedDocumentSchema>;
