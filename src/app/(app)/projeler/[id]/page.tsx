import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { ProjectRepository } from "@/infrastructure/supabase/project-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { OutputsList } from "../../ciktilar/outputs-list";
import { deleteProjectAction, updateProjectAction } from "../actions";
import { ProjectForm } from "../project-form";

export const metadata: Metadata = { title: "Proje" };

export default async function ProjectPage({ params, searchParams }: PageProps<"/projeler/[id]">) {
  const [{ id }, { durum }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createSupabaseServerClient();
  const projectRepo = new ProjectRepository(supabase);
  const [project, projects, outputs, profiles] = await Promise.all([
    projectRepo.findById(id),
    projectRepo.list(),
    new OutputRepository(supabase).listSummaries({ projectId: id }),
    new ProfileRepository(supabase).list(),
  ]);
  if (!project) notFound();

  return (
    <div>
      <Link href="/projeler" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Projelerim
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">📁 {project.name}</h1>
          {project.profileId && project.profileName && (
            <Link
              href={`/profiller/${project.profileId}`}
              className="mt-2 inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
            >
              🧠 {project.profileName}
            </Link>
          )}
          {project.description && <p className="mt-1 max-w-2xl whitespace-pre-line text-slate-600">{project.description}</p>}
        </div>
        <Link
          href={`/olustur?proje=${project.id}`}
          className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
        >
          + Bu projeye plan oluştur
        </Link>
      </div>

      {durum === "olusturuldu" && (
        <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Proje oluşturuldu. Yeni plan oluştururken bu projeyi seçebilir ya da Planlarım&apos;daki planları buraya taşıyabilirsin.
          {project.profileName && ` Bu projede oluşturduğun planlar "${project.profileName}" profiliyle hazırlanır.`}
        </p>
      )}

      {outputs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-900">Bu projede henüz plan yok.</p>
          <p className="mt-1 text-sm text-slate-600">
            Yeni bir plan oluştur ya da{" "}
            <Link href="/ciktilar" className="font-semibold text-rose-600 hover:underline">
              Planlarım
            </Link>
            &apos;dan mevcut bir planı bu projeye taşı.
          </p>
        </div>
      ) : (
        <OutputsList outputs={outputs} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
      )}

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Proje bilgileri</h2>
          <div className="mt-5">
            <ProjectForm
              action={updateProjectAction.bind(null, project.id)}
              project={project}
              profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
            />
          </div>
        </section>

        <section className="self-start rounded-2xl border border-red-200 bg-white p-5 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Projeyi sil</h2>
          <p className="mt-1 text-sm text-slate-600">
            Proje silinir; içindeki planlar silinmez, Planlarım&apos;da projesiz olarak kalır.
          </p>
          <form action={deleteProjectAction} className="mt-4">
            <input type="hidden" name="id" value={project.id} />
            <ConfirmSubmit
              message={`"${project.name}" projesi silinsin mi? Planlar silinmez.`}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Projeyi sil
            </ConfirmSubmit>
          </form>
        </section>
      </div>
    </div>
  );
}
