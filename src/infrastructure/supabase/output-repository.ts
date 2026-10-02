import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeneratedDocument } from "@/core/output/document";
import { isCatalogSection } from "@/core/output/generator";

export interface OutputSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  category: string | null;
  profile: string | null;
  projectId: string | null;
  project: string | null;
  language: "tr" | "en";
  shared: boolean;
  shareViews: number;
}

export interface ShareState {
  token: string | null;
  views: number;
}

export interface SharedOutput {
  ownerId: string;
  title: string;
  document: GeneratedDocument;
  updatedAt: string;
}

export interface StoredOutput {
  id: string;
  title: string;
  document: GeneratedDocument;
  createdAt: string;
  updatedAt: string;
}

type OutputRow = {
  id: string;
  title: string;
  document: GeneratedDocument;
  created_at: string;
  updated_at: string;
};

/** Gömülü ilişki tekil ya da dizi olarak dönebilir. */
function projectName(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row && typeof row === "object" && "name" in row && typeof row.name === "string" ? row.name : null;
}

const toStored = (r: OutputRow): StoredOutput => ({
  id: r.id,
  title: r.title,
  document: r.document,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/**
 * generated_outputs + user_selections. create() service role ile, okuma ve
 * güncelleme kullanıcı istemcisiyle (RLS) çağrılabilir.
 */
export class OutputRepository {
  constructor(private readonly client: SupabaseClient) {}

  /** trackSelections=false: kopyalarda raporlama verisi çiftlenmesin. */
  async create(
    userId: string,
    document: GeneratedDocument,
    { trackSelections = true, projectId = null }: { trackSelections?: boolean; projectId?: string | null } = {},
  ): Promise<string> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .insert({
        user_id: userId,
        title: document.title,
        document,
        profile_id: document.context?.profile?.id ?? null,
        project_id: projectId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Çıktı kaydedilemedi: ${error.message}`);

    // Serbest istekle üretilen bölümler kataloğa bağlı değildir; raporlamaya girmez.
    const selections = (trackSelections ? document.sections : []).filter(isCatalogSection).map((s) => ({
      subcategory_id: s.subcategoryId,
      category_id: s.categoryId,
    }));
    if (selections.length > 0) {
      const { error: selError } = await this.client.from("user_selections").insert(
        selections.map((s) => ({ ...s, user_id: userId, output_id: data.id })),
      );
      // Raporlama verisi; üretimi başarısız saymıyoruz.
      if (selError) console.error("user_selections kaydedilemedi:", selError.message);
    }

    return data.id;
  }

  async findById(id: string): Promise<StoredOutput | null> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .select("id, title, document, created_at, updated_at")
      .eq("id", id)
      .maybeSingle<OutputRow>();
    if (error) throw new Error(`Çıktı okunamadı: ${error.message}`);
    return data ? toStored(data) : null;
  }

  async listForCurrentUser(limit = 50): Promise<Omit<StoredOutput, "document">[]> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .select("id, title, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Çıktılar okunamadı: ${error.message}`);
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Planlarım sayfası için özet liste. Dokümanın tamamı yerine yalnızca
   * filtrelemede gereken alanlar JSON yolu ile okunur (bir plan tek kategori
   * sayfasından üretildiği için ilk bölümün kategorisi planın kategorisidir).
   */
  async listSummaries({ limit = 300, projectId }: { limit?: number; projectId?: string } = {}): Promise<OutputSummary[]> {
    let query = this.client
      .from("generated_outputs")
      .select(
        "id, title, created_at, updated_at, share_token, share_views, project_id, project:projects(name), category:document->sections->0->>categoryName, profile:document->context->profile->>name, language:document->context->>language",
      );
    if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(`Çıktılar okunamadı: ${error.message}`);
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      category: r.category ?? null,
      profile: r.profile ?? null,
      projectId: r.project_id ?? null,
      project: projectName(r.project),
      language: r.language === "en" ? "en" : "tr",
      shared: Boolean(r.share_token),
      shareViews: r.share_views ?? 0,
    }));
  }

  /** RLS kullanıcının yalnızca kendi kaydını güncellemesine izin verir. */
  async updateDocument(id: string, document: GeneratedDocument): Promise<boolean> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .update({ title: document.title, document })
      .eq("id", id)
      .select("id");
    if (error) throw new Error(`Çıktı güncellenemedi: ${error.message}`);
    return (data ?? []).length > 0;
  }

  /** projectId = null planı projeden çıkarır. RLS yalnızca kendi projesine taşımaya izin verir. */
  async setProject(id: string, projectId: string | null): Promise<boolean> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .update({ project_id: projectId })
      .eq("id", id)
      .select("id");
    if (error) throw new Error(`Plan projeye taşınamadı: ${error.message}`);
    return (data ?? []).length > 0;
  }

  /** Planın bağlı olduğu proje (yoksa null). */
  async getProjectId(id: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .select("project_id")
      .eq("id", id)
      .maybeSingle<{ project_id: string | null }>();
    if (error) throw new Error(`Plan okunamadı: ${error.message}`);
    return data?.project_id ?? null;
  }

  /** Paylaşım durumu (kullanıcı istemcisiyle: RLS yalnızca kendi planını döndürür). */
  async getShareState(id: string): Promise<ShareState | null> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .select("share_token, share_views")
      .eq("id", id)
      .maybeSingle<{ share_token: string | null; share_views: number }>();
    if (error) throw new Error(`Paylaşım durumu okunamadı: ${error.message}`);
    return data ? { token: data.share_token, views: data.share_views } : null;
  }

  /** token = null paylaşımı kapatır; yeni token eski bağlantıyı geçersiz kılar. */
  async setShareToken(id: string, token: string | null): Promise<boolean> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .update({ share_token: token, shared_at: token ? new Date().toISOString() : null, share_views: 0 })
      .eq("id", id)
      .select("id");
    if (error) throw new Error(`Paylaşım güncellenemedi: ${error.message}`);
    return (data ?? []).length > 0;
  }

  /** Herkese açık okuma: YALNIZCA service role ile ve doğru anahtarla çağrılır. */
  async findByShareToken(token: string): Promise<SharedOutput | null> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .select("user_id, title, document, updated_at")
      .eq("share_token", token)
      .maybeSingle<{ user_id: string; title: string; document: GeneratedDocument; updated_at: string }>();
    if (error) throw new Error(`Paylaşılan plan okunamadı: ${error.message}`);
    return data ? { ownerId: data.user_id, title: data.title, document: data.document, updatedAt: data.updated_at } : null;
  }

  async recordShareView(token: string) {
    const { error } = await this.client.rpc("record_share_view", { p_token: token });
    if (error) console.error("Görüntülenme kaydedilemedi:", error.message);
  }

  async delete(id: string) {
    const { error } = await this.client.from("generated_outputs").delete().eq("id", id);
    if (error) throw new Error(`Çıktı silinemedi: ${error.message}`);
  }
}
