"use server";

import { feedbackInputSchema, type FeedbackInput } from "@/core/feedback/feedback";
import { FeedbackRepository } from "@/infrastructure/supabase/feedback-repository";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/infrastructure/supabase/server";

export type FeedbackResult = { ok: true } | { ok: false; error: string };

export async function sendFeedbackAction(input: FeedbackInput): Promise<FeedbackResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { ok: false, error: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." };

  const parsed = feedbackInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz mesaj." };

  try {
    await new FeedbackRepository(await createSupabaseServerClient()).create({
      userId: user.id,
      kind: parsed.data.kind,
      message: parsed.data.message,
      page: parsed.data.page,
      replyEmail: parsed.data.wantsReply ? user.email : null,
    });
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Mesajın gönderilemedi. Lütfen biraz sonra tekrar dene." };
  }
}
