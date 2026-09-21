import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContextProfile, ProfileKind, ProfileMemory } from "@/core/profile/profile";

type ProfileRow = {
  id: string;
  name: string;
  kind: ProfileKind;
  details: Record<string, string> | null;
  created_at: string;
  updated_at: string;
};

type MemoryRow = {
  id: string;
  profile_id: string;
  content: string;
  source: "manual" | "plan_answer" | "decision";
  created_at: string;
};

const toProfile = (r: ProfileRow): ContextProfile => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  details: r.details ?? {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toMemory = (r: MemoryRow): ProfileMemory => ({
  id: r.id,
  profileId: r.profile_id,
  content: r.content,
  source: r.source,
  createdAt: r.created_at,
});

/**
 * Profiller ve hafıza. Kullanıcı oturumlu istemciyle kullanılır; RLS her
 * kullanıcıyı kendi kayıtlarıyla sınırlar.
 */
export class ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<ContextProfile[]> {
    const { data, error } = await this.client
      .from("context_profiles")
      .select("id, name, kind, details, created_at, updated_at")
      .order("created_at")
      .returns<ProfileRow[]>();
    if (error) throw new Error(`Profiller okunamadı: ${error.message}`);
    return (data ?? []).map(toProfile);
  }

  async count(): Promise<number> {
    const { count, error } = await this.client
      .from("context_profiles")
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(`Profiller sayılamadı: ${error.message}`);
    return count ?? 0;
  }

  async findById(id: string): Promise<ContextProfile | null> {
    const { data, error } = await this.client
      .from("context_profiles")
      .select("id, name, kind, details, created_at, updated_at")
      .eq("id", id)
      .maybeSingle<ProfileRow>();
    if (error) throw new Error(`Profil okunamadı: ${error.message}`);
    return data ? toProfile(data) : null;
  }

  async create(userId: string, input: { name: string; kind: ProfileKind; details: Record<string, string> }) {
    const { data, error } = await this.client
      .from("context_profiles")
      .insert({ user_id: userId, name: input.name, kind: input.kind, details: input.details })
      .select("id")
      .single();
    if (error) throw new Error(`Profil oluşturulamadı: ${error.message}`);
    return data.id as string;
  }

  async update(id: string, input: { name: string; details: Record<string, string> }) {
    const { error } = await this.client
      .from("context_profiles")
      .update({ name: input.name, details: input.details })
      .eq("id", id);
    if (error) throw new Error(`Profil güncellenemedi: ${error.message}`);
  }

  async delete(id: string) {
    const { error } = await this.client.from("context_profiles").delete().eq("id", id);
    if (error) throw new Error(`Profil silinemedi: ${error.message}`);
  }

  async listMemories(profileId: string): Promise<ProfileMemory[]> {
    const { data, error } = await this.client
      .from("profile_memories")
      .select("id, profile_id, content, source, created_at")
      .eq("profile_id", profileId)
      .order("created_at")
      .returns<MemoryRow[]>();
    if (error) throw new Error(`Hafıza okunamadı: ${error.message}`);
    return (data ?? []).map(toMemory);
  }

  async countMemories(profileId: string): Promise<number> {
    const { count, error } = await this.client
      .from("profile_memories")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId);
    if (error) throw new Error(`Hafıza sayılamadı: ${error.message}`);
    return count ?? 0;
  }

  async addMemories(userId: string, profileId: string, contents: string[], source: ProfileMemory["source"]) {
    if (contents.length === 0) return;
    const { error } = await this.client
      .from("profile_memories")
      .insert(contents.map((content) => ({ user_id: userId, profile_id: profileId, content, source })));
    if (error) throw new Error(`Hafızaya eklenemedi: ${error.message}`);
  }

  async deleteMemory(id: string) {
    const { error } = await this.client.from("profile_memories").delete().eq("id", id);
    if (error) throw new Error(`Hafıza kaydı silinemedi: ${error.message}`);
  }

  async deleteAllMemories(profileId?: string) {
    let query = this.client.from("profile_memories").delete();
    query = profileId ? query.eq("profile_id", profileId) : query.not("id", "is", null);
    const { error } = await query;
    if (error) throw new Error(`Hafıza silinemedi: ${error.message}`);
  }
}
