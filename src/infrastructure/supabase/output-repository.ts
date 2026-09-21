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
  language: "tr" | "en";
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
  async create(userId: string, document: GeneratedDocument, { trackSelections = true } = {}): Promise<string> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .insert({
        user_id: userId,
        title: document.title,
        document,
        profile_id: document.context?.profile?.id ?? null,
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
  async listSummaries(limit = 300): Promise<OutputSummary[]> {
    const { data, error } = await this.client
      .from("generated_outputs")
      .select(
        "id, title, created_at, updated_at, category:document->sections->0->>categoryName, profile:document->context->profile->>name, language:document->context->>language",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Çıktılar okunamadı: ${error.message}`);
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      category: r.category ?? null,
      profile: r.profile ?? null,
      language: r.language === "en" ? "en" : "tr",
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

  async delete(id: string) {
    const { error } = await this.client.from("generated_outputs").delete().eq("id", id);
    if (error) throw new Error(`Çıktı silinemedi: ${error.message}`);
  }
}
