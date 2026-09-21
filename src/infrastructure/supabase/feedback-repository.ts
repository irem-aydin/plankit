import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedbackKind } from "@/core/feedback/feedback";

export interface StoredFeedback {
  id: string;
  kind: FeedbackKind;
  message: string;
  page: string | null;
  status: "new" | "in_review" | "resolved";
  createdAt: string;
}

/** feedback tablosu; kullanıcı istemcisiyle (RLS) çağrılır. */
export class FeedbackRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(row: { userId: string; kind: FeedbackKind; message: string; page?: string; replyEmail?: string | null }) {
    const { error } = await this.client.from("feedback").insert({
      user_id: row.userId,
      kind: row.kind,
      message: row.message,
      page: row.page ?? null,
      reply_email: row.replyEmail ?? null,
    });
    if (error) throw new Error(`Geri bildirim kaydedilemedi: ${error.message}`);
  }

  async listForCurrentUser(): Promise<StoredFeedback[]> {
    const { data, error } = await this.client
      .from("feedback")
      .select("id, kind, message, page, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Geri bildirimler okunamadı: ${error.message}`);
    return (data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind,
      message: r.message,
      page: r.page,
      status: r.status,
      createdAt: r.created_at,
    }));
  }
}
