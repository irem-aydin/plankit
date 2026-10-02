"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_PROJECTS_PER_USER, projectInputSchema } from "@/core/project/project";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { ProjectRepository } from "@/infrastructure/supabase/project-repository";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/infrastructure/supabase/server";

export type ProjectFormState = { error?: string; saved?: boolean };

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/giris?sonra=/projeler");
  const supabase = await createSupabaseServerClient();
  return { user, projects: new ProjectRepository(supabase), profiles: new ProfileRepository(supabase) };
}

/** Formu doğrular; seçilen profilin kullanıcıya ait olduğunu da kontrol eder. */
async function readProjectForm(formData: FormData, profiles: ProfileRepository) {
  const parsed = projectInputSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    profileId: formData.get("profileId") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message } as const;
  if (parsed.data.profileId && !(await profiles.findById(parsed.data.profileId))) {
    return { ok: false, error: "Seçilen profil bulunamadı." } as const;
  }
  return { ok: true, data: parsed.data } as const;
}

function revalidateProfile(profileId: string | null | undefined) {
  if (profileId) revalidatePath(`/profiller/${profileId}`);
}

export async function createProjectAction(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const { user, projects, profiles } = await requireUser();
  const parsed = await readProjectForm(formData, profiles);
  if (!parsed.ok) return { error: parsed.error };

  if ((await projects.count()) >= MAX_PROJECTS_PER_USER) {
    return { error: `En fazla ${MAX_PROJECTS_PER_USER} proje oluşturabilirsin.` };
  }

  const id = await projects.create(user.id, parsed.data);
  revalidatePath("/projeler");
  revalidateProfile(parsed.data.profileId);
  redirect(`/projeler/${id}?durum=olusturuldu`);
}

export async function updateProjectAction(
  projectId: string,
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const { projects, profiles } = await requireUser();
  const existing = await projects.findById(projectId);
  if (!existing) return { error: "Proje bulunamadı." };

  const parsed = await readProjectForm(formData, profiles);
  if (!parsed.ok) return { error: parsed.error };

  await projects.update(projectId, parsed.data);
  revalidatePath("/projeler");
  revalidateProfile(existing.profileId);
  revalidateProfile(parsed.data.profileId);
  revalidatePath(`/projeler/${projectId}`);
  revalidatePath("/ciktilar");
  return { saved: true };
}

export async function deleteProjectAction(formData: FormData) {
  const { projects } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const existing = await projects.findById(id);
  await projects.delete(id);
  revalidatePath("/projeler");
  revalidateProfile(existing?.profileId);
  revalidatePath("/ciktilar");
  redirect("/projeler?durum=silindi");
}
