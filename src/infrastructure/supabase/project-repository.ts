import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, ProjectInput, ProjectSummary } from "@/core/project/project";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  profile_id: string | null;
  profile: { name: string } | { name: string }[] | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id, name, description, profile_id, profile:context_profiles(name), created_at, updated_at";

const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  name: r.name,
  description: r.description ?? "",
  profileId: r.profile_id,
  // Gömülü ilişki tekil ya da dizi olarak dönebilir.
  profileName: (Array.isArray(r.profile) ? r.profile[0]?.name : r.profile?.name) ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/**
 * Projeler. Kullanıcı oturumlu istemciyle kullanılır; RLS her kullanıcıyı
 * kendi projeleriyle sınırlar.
 */
export class ProjectRepository {
  constructor(private readonly client: SupabaseClient) {}

  /** profileId verilirse yalnızca o profile bağlı projeler. */
  async list({ profileId }: { profileId?: string } = {}): Promise<Project[]> {
    let query = this.client.from("projects").select(COLUMNS);
    if (profileId) query = query.eq("profile_id", profileId);
    const { data, error } = await query.order("created_at", { ascending: false }).returns<ProjectRow[]>();
    if (error) throw new Error(`Projeler okunamadı: ${error.message}`);
    return (data ?? []).map(toProject);
  }

  /** Projeler + plan sayıları (planların yalnızca proje ve tarih alanları okunur). */
  async listSummaries(): Promise<ProjectSummary[]> {
    const [projects, { data, error }] = await Promise.all([
      this.list(),
      this.client
        .from("generated_outputs")
        .select("project_id, created_at")
        .not("project_id", "is", null)
        .returns<{ project_id: string; created_at: string }[]>(),
    ]);
    if (error) throw new Error(`Proje planları okunamadı: ${error.message}`);

    const stats = new Map<string, { count: number; last: string | null }>();
    for (const row of data ?? []) {
      const s = stats.get(row.project_id) ?? { count: 0, last: null };
      s.count += 1;
      if (!s.last || row.created_at > s.last) s.last = row.created_at;
      stats.set(row.project_id, s);
    }
    return projects.map((p) => ({
      ...p,
      outputCount: stats.get(p.id)?.count ?? 0,
      lastOutputAt: stats.get(p.id)?.last ?? null,
    }));
  }

  async count(): Promise<number> {
    const { count, error } = await this.client.from("projects").select("id", { count: "exact", head: true });
    if (error) throw new Error(`Projeler sayılamadı: ${error.message}`);
    return count ?? 0;
  }

  async findById(id: string): Promise<Project | null> {
    const { data, error } = await this.client.from("projects").select(COLUMNS).eq("id", id).maybeSingle<ProjectRow>();
    if (error) throw new Error(`Proje okunamadı: ${error.message}`);
    return data ? toProject(data) : null;
  }

  async create(userId: string, input: ProjectInput): Promise<string> {
    const { data, error } = await this.client
      .from("projects")
      .insert({ user_id: userId, name: input.name, description: input.description || null, profile_id: input.profileId })
      .select("id")
      .single();
    if (error) throw new Error(`Proje oluşturulamadı: ${error.message}`);
    return data.id as string;
  }

  async update(id: string, input: ProjectInput) {
    const { error } = await this.client
      .from("projects")
      .update({ name: input.name, description: input.description || null, profile_id: input.profileId })
      .eq("id", id);
    if (error) throw new Error(`Proje güncellenemedi: ${error.message}`);
  }

  async delete(id: string) {
    const { error } = await this.client.from("projects").delete().eq("id", id);
    if (error) throw new Error(`Proje silinemedi: ${error.message}`);
  }
}
