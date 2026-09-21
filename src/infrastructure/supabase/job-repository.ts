import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobKind, JobRecord, JobStatus } from "@/core/jobs/job";

type JobRow = {
  id: string;
  kind: JobKind;
  status: JobStatus;
  title: string;
  progress: string | null;
  output_id: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

const COLUMNS = "id, kind, status, title, progress, output_id, error, created_at, started_at, finished_at";

const toRecord = (r: JobRow): JobRecord => ({
  id: r.id,
  kind: r.kind,
  status: r.status,
  title: r.title,
  progress: r.progress,
  outputId: r.output_id,
  error: r.error,
  createdAt: r.created_at,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
});

/**
 * generation_jobs. Okuma kullanıcı istemcisiyle (RLS) de yapılabilir;
 * oluşturma ve güncelleme yalnızca service role ile yapılır.
 */
export class JobRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(row: { userId: string; kind: JobKind; title: string; outputId?: string }): Promise<string> {
    const { data, error } = await this.client
      .from("generation_jobs")
      .insert({ user_id: row.userId, kind: row.kind, title: row.title, output_id: row.outputId ?? null })
      .select("id")
      .single();
    if (error) throw new Error(`İş kaydedilemedi: ${error.message}`);
    return data.id;
  }

  async findById(id: string): Promise<JobRecord | null> {
    const { data, error } = await this.client.from("generation_jobs").select(COLUMNS).eq("id", id).maybeSingle<JobRow>();
    if (error) throw new Error(`İş okunamadı: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  /** Kullanıcının bitmemiş ve son bir günde başarısız olmuş işleri. */
  async listRecent(userId: string, limit = 20): Promise<JobRecord[]> {
    const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const { data, error } = await this.client
      .from("generation_jobs")
      .select(COLUMNS)
      .eq("user_id", userId)
      .in("status", ["queued", "running", "failed"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<JobRow[]>();
    if (error) throw new Error(`İşler okunamadı: ${error.message}`);
    return (data ?? []).map(toRecord);
  }

  async markRunning(id: string) {
    await this.update(id, { status: "running", started_at: new Date().toISOString(), progress: "Hazırlanıyor" });
  }

  async setProgress(id: string, progress: string) {
    await this.update(id, { progress: progress.slice(0, 300) });
  }

  async markSucceeded(id: string, outputId: string, progress?: string) {
    await this.update(id, {
      status: "succeeded",
      output_id: outputId,
      finished_at: new Date().toISOString(),
      ...(progress ? { progress: progress.slice(0, 300) } : {}),
    });
  }

  async markFailed(id: string, message: string) {
    await this.update(id, { status: "failed", error: message.slice(0, 500), finished_at: new Date().toISOString() });
  }

  private async update(id: string, values: Record<string, unknown>) {
    const { error } = await this.client.from("generation_jobs").update(values).eq("id", id);
    if (error) throw new Error(`İş güncellenemedi: ${error.message}`);
  }
}
