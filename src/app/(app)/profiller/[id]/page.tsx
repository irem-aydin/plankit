import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { MAX_MEMORIES_PER_PROFILE, PROFILE_KIND_META } from "@/core/profile/profile";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import {
  addMemoryAction,
  clearProfileMemoriesAction,
  deleteMemoryAction,
  deleteProfileAction,
  updateProfileAction,
} from "../actions";
import { ProfileForm } from "../profile-form";
import { AddMemoryForm, ConfirmSubmit } from "./memory-forms";

export const metadata: Metadata = { title: "Profil" };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

export default async function ProfilePage({ params, searchParams }: PageProps<"/profiller/[id]">) {
  const [{ id }, { durum }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const profiles = new ProfileRepository(await createSupabaseServerClient());
  const profile = await profiles.findById(id);
  if (!profile) notFound();
  const memories = await profiles.listMemories(id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/profiller" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Profillerim
      </Link>
      <p className="mt-4 text-sm text-slate-500">
        {PROFILE_KIND_META[profile.kind].icon} {PROFILE_KIND_META[profile.kind].label} profili
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{profile.name}</h1>

      {durum === "olusturuldu" && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Profil oluşturuldu. Artık plan oluştururken &quot;Bu plan kimin için?&quot; adımında bu profili seçebilirsin.{" "}
          <Link href="/olustur" className="font-semibold underline">
            Plan oluştur
          </Link>
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Profil bilgileri</h2>
        <div className="mt-5">
          <ProfileForm action={updateProfileAction.bind(null, profile.id)} profile={profile} />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">🧠 Hafıza</h2>
            <p className="mt-1 text-sm text-slate-600">
              Planlarda sorulan sorulara verdiğin cevaplar (otomatik hatırlama açıksa) ve senin eklediğin notlar. Yapay zekâ bu
              profili kullanırken bunları da bilir.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {memories.length} / {MAX_MEMORIES_PER_PROFILE}
          </span>
        </div>

        {memories.length === 0 ? (
          <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">Henüz hatırlanan bir bilgi yok.</p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {memories.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="whitespace-pre-line text-slate-800">{m.content}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {m.source === "plan_answer"
                      ? "Plandan hatırlandı"
                      : m.source === "decision"
                        ? "Plandaki karar"
                        : "Elle eklendi"}{" "}
                    · {dateFormat.format(new Date(m.createdAt))}
                  </p>
                </div>
                <form action={deleteMemoryAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="profileId" value={profile.id} />
                  <button className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Bu bilgiyi unut">
                    Unut
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <AddMemoryForm action={addMemoryAction.bind(null, profile.id)} />

        {memories.length > 0 && (
          <form action={clearProfileMemoriesAction} className="mt-4 text-right">
            <input type="hidden" name="profileId" value={profile.id} />
            <ConfirmSubmit message="Bu profilin tüm hafızası silinsin mi?" className="text-xs text-red-600 hover:underline">
              Tüm hafızayı temizle
            </ConfirmSubmit>
          </form>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-red-200 bg-white p-5 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Profili sil</h2>
        <p className="mt-1 text-sm text-slate-600">
          Profil ve hafızası kalıcı olarak silinir. Bu profille oluşturduğun planlar silinmez.
        </p>
        <form action={deleteProfileAction} className="mt-4">
          <input type="hidden" name="id" value={profile.id} />
          <ConfirmSubmit
            message={`"${profile.name}" profili ve hafızası kalıcı olarak silinsin mi?`}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Profili sil
          </ConfirmSubmit>
        </form>
      </section>
    </div>
  );
}
