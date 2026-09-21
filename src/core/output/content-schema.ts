/**
 * output_templates.content JSON şemaları.
 *
 * Bunlar "kalıp"tır (blueprint): içerik ekibinin yazdığı, boş şablon/checklist/
 * rehber tanımı. Kullanıcıya verilen doldurulabilir hâli document.ts'dedir.
 */
import { z } from "zod";

export const OUTPUT_TYPES = ["template", "checklist", "guide"] as const;
export type OutputType = (typeof OUTPUT_TYPES)[number];

const id = z.string().min(1).max(64);

// ---------------------------------------------------------------- template
export const templateFieldSchema = z.object({
  id,
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "select"]).default("text"),
  placeholder: z.string().optional(),
  help: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const templateColumnSchema = z.object({
  id,
  label: z.string().min(1),
  type: z.enum(["text", "select"]).default("text"),
  options: z.array(z.string()).optional(),
  help: z.string().optional(),
});

export const templateTableSchema = z.object({
  columns: z.array(templateColumnSchema).min(1),
  emptyRows: z.number().int().min(0).max(50).default(3),
  exampleRows: z.array(z.record(z.string(), z.string())).default([]),
});

export const templateSectionSchema = z.object({
  id,
  title: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(templateFieldSchema).default([]),
  table: templateTableSchema.optional(),
});

export const templateContentSchema = z.object({
  kind: z.literal("template"),
  summary: z.string(),
  sections: z.array(templateSectionSchema).min(1),
});

// --------------------------------------------------------------- checklist
export const checklistItemSchema = z.object({
  id,
  text: z.string().min(1),
  hint: z.string().optional(),
});

export const checklistContentSchema = z.object({
  kind: z.literal("checklist"),
  summary: z.string(),
  groups: z
    .array(
      z.object({
        id,
        title: z.string().min(1),
        items: z.array(checklistItemSchema).min(1),
      }),
    )
    .min(1),
});

// ------------------------------------------------------------------- guide
export const guideContentSchema = z.object({
  kind: z.literal("guide"),
  summary: z.string(),
  sections: z
    .array(
      z.object({
        id,
        heading: z.string().min(1),
        paragraphs: z.array(z.string()).default([]),
        tips: z.array(z.string()).default([]),
      }),
    )
    .min(1),
  reflectionQuestions: z
    .array(z.object({ id, question: z.string().min(1) }))
    .default([]),
});

export const blueprintContentSchema = z.discriminatedUnion("kind", [
  templateContentSchema,
  checklistContentSchema,
  guideContentSchema,
]);

export type TemplateContent = z.infer<typeof templateContentSchema>;
export type ChecklistContent = z.infer<typeof checklistContentSchema>;
export type GuideContent = z.infer<typeof guideContentSchema>;
export type BlueprintContent = z.infer<typeof blueprintContentSchema>;
