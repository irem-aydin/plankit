import { z } from "zod";

export const FEEDBACK_KINDS = ["suggestion", "complaint", "bug", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  suggestion: "💡 Öneri",
  complaint: "😕 Şikâyet",
  bug: "🐞 Hata",
  other: "💬 Diğer",
};

export const feedbackInputSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z
    .string()
    .trim()
    .min(5, "Lütfen en az birkaç kelime yaz.")
    .max(3000, "Mesaj en fazla 3000 karakter olabilir."),
  page: z.string().max(300).optional(),
  wantsReply: z.boolean().default(false),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
