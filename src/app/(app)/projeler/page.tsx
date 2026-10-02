import type { Metadata } from "next";
import Link from "next/link";
import { MAX_PROJECTS_PER_USER, type ProjectSummary } from "@/core/project/project";
import { ProjectRepository } from "@/infrastructure/supabase/project-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export const metadata: Metadata = { title: "Projelerim" };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

/** Projeleri profile göre gruplar; profilsiz projeler en sonda. */
function groupByProfile(projects: ProjectSummary[]) {
  const groups = new Map<string, { profileId: string | null; title: string; projects: ProjectSummary[] }>();
  for (const p of projects) {
    const key = p.profileId ?? "";
    const group = groups.get(key) ?? { profileId: p.profileId, title: p.profileName ?? "Profilsiz projeler", projects: [] };
    group.projects.push(p);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) =>
    a.profileId && b.profileId ? a.title.localeCompare(b.title, "tr") : a.profileId ? -1 : 1,
  );
}

export default async function ProjectsPage({ searchParams }: PageProps<"/projeler">) {
  const { durum } = await searchParams;
  const projects = await new ProjectRepository(await createSupabaseServerClient()).listSummaries();
  const groups = groupByProfile(projects);
  // Hiçbir proje bir profile bağlı değilse başlıksız tek liste gösterilir.
  const showGroups = projects.some((p) => p.profileId);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projelerim</h1>
          <p className="mt-1 max-w-2xl text-slate-600">
            Aynı iş için hazırladığın planları bir projede topla; her projenin planlarını tek yerden gör.
          </p>
        </div>
        {projects.length < MAX_PROJECTS_PER_USER && (
          <Link
            href="/projeler/yeni"
            className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
          >
            + Yeni proje
          </Link>
        )}
      </div>

      {durum === "silindi" && (
        <p className="mt-6 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Proje silindi. İçindeki planlar Planlarım&apos;da duruyor.
        </p>
      )}

      {projects.length === 0 ? (
        <Link
          href="/projeler/yeni"
          className="mt-8 block rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center transition hover:border-rose-400 hover:shadow-sm"
        >
          <span className="text-3xl" aria-hidden>
            📁
          </span>
          <p className="mt-3 font-semibold text-slate-900">İlk projeni oluştur</p>
          <p className="mt-1 text-sm text-slate-600">
            Örn. &quot;Yeni şube açılışı&quot; projesinde pazar analizi, bütçe ve risk planlarını bir arada tut.
          </p>
        </Link>
      ) : (
        groups.map((group) => (
          <section key={group.profileId ?? "none"} className="mt-8">
            {showGroups && (
              <h2 className="mb-3 text-sm font-semibold text-slate-700">
                {group.profileId ? (
                  <Link href={`/profiller/${group.profileId}`} className="hover:text-rose-700 hover:underline">
                    🧠 {group.title}
                  </Link>
                ) : (
                  group.title
                )}
              </h2>
            )}
            <ProjectCards projects={group.projects} />
          </section>
        ))
      )}
    </div>
  );
}

function ProjectCards({ projects }: { projects: ProjectSummary[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {projects.map((p) => (
        <li key={p.id}>
          <Link
            href={`/projeler/${p.id}`}
            className="block h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-rose-300 hover:shadow-sm"
          >
            <p className="font-semibold text-slate-900">📁 {p.name}</p>
            {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
            <p className="mt-4 text-xs text-slate-500">
              {p.outputCount > 0 ? `${p.outputCount} plan` : "Henüz plan yok"}
              {p.lastOutputAt && ` · son plan ${dateFormat.format(new Date(p.lastOutputAt))}`}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
