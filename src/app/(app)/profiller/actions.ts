"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  MAX_MEMORIES_PER_PROFILE,
  MAX_MEMORY_CHARS,
  MAX_PROFILES_PER_USER,
  profileInputSchema,
  sanitizeProfileDetails,
} from "@/core/profile/profile";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/infrastructure/supabase/server";

export type ProfileFormState = { error?: string; saved?: boolean };

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/giris?sonra=/profiller");
  return { user, profiles: new ProfileRepository(await createSupabaseServerClient()) };
}

function readProfileForm(formData: FormData) {
  const details: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("d.") && typeof value === "string") details[key.slice(2)] = value;
  }
  return profileInputSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    details,
  });
}

export async function createProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const { user, profiles } = await requireUser();
  const parsed = readProfileForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if ((await profiles.count()) >= MAX_PROFILES_PER_USER) {
    return { error: `En fazla ${MAX_PROFILES_PER_USER} profil oluşturabilirsin.` };
  }

  const id = await profiles.create(user.id, {
    name: parsed.data.name,
    kind: parsed.data.kind,
    details: sanitizeProfileDetails(parsed.data.kind, parsed.data.details),
  });
  revalidatePath("/profiller");
  redirect(`/profiller/${id}?durum=olusturuldu`);
}

export async function updateProfileAction(
  profileId: string,
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { profiles } = await requireUser();
  const existing = await profiles.findById(profileId);
  if (!existing) return { error: "Profil bulunamadı." };

  const parsed = readProfileForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await profiles.update(profileId, {
    name: parsed.data.name,
    details: sanitizeProfileDetails(existing.kind, parsed.data.details),
  });
  revalidatePath("/profiller");
  revalidatePath(`/profiller/${profileId}`);
  return { saved: true };
}

export async function deleteProfileAction(formData: FormData) {
  const { profiles } = await requireUser();
  await profiles.delete(String(formData.get("id") ?? ""));
  revalidatePath("/profiller");
  redirect("/profiller?durum=silindi");
}

const memorySchema = z.string().trim().min(1, "Boş bilgi eklenemez.").max(MAX_MEMORY_CHARS);

export async function addMemoryAction(
  profileId: string,
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { user, profiles } = await requireUser();
  const parsed = memorySchema.safeParse(formData.get("content"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!(await profiles.findById(profileId))) return { error: "Profil bulunamadı." };
  if ((await profiles.countMemories(profileId)) >= MAX_MEMORIES_PER_PROFILE) {
    return { error: `Bir profilde en fazla ${MAX_MEMORIES_PER_PROFILE} hafıza kaydı olabilir.` };
  }

  await profiles.addMemories(user.id, profileId, [parsed.data], "manual");
  revalidatePath(`/profiller/${profileId}`);
  return { saved: true };
}

export async function deleteMemoryAction(formData: FormData) {
  const { profiles } = await requireUser();
  const profileId = String(formData.get("profileId") ?? "");
  await profiles.deleteMemory(String(formData.get("id") ?? ""));
  revalidatePath(`/profiller/${profileId}`);
}

export async function clearProfileMemoriesAction(formData: FormData) {
  const { profiles } = await requireUser();
  const profileId = String(formData.get("profileId") ?? "");
  if (profileId) await profiles.deleteAllMemories(profileId);
  revalidatePath(`/profiller/${profileId}`);
}
