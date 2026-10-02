"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { OutputSummary } from "@/infrastructure/supabase/output-repository";
import { copyOutputAction, moveOutputToProjectAction, renameOutputAction } from "./actions";

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });
const ALL = "";
const NO_PROFILE = "__none__";
const NO_PROJECT = "__none__";

export interface ProjectOption {
  id: string;
  name: string;
}

/** Türkçe büyük/küçük harf ve aksan farkını yok sayan arama anahtarı. */
function searchKey(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const selectClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none";

export function OutputsList({ outputs, projects = [] }: { outputs: OutputSummary[]; projects?: ProjectOption[] }) {
  const [query, setQuery] = useState("");
  const [project, setProject] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [profile, setProfile] = useState(ALL);
  const [sort, setSort] = useState<"new" | "old" | "updated" | "name">("new");

  const categories = useMemo(
    () => [...new Set(outputs.map((o) => o.category).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "tr")),
    [outputs],
  );
  const profiles = useMemo(
    () => [...new Set(outputs.map((o) => o.profile).filter((p): p is string => Boolean(p)))].sort((a, b) => a.localeCompare(b, "tr")),
    [outputs],
  );

  const visible = useMemo(() => {
    const q = searchKey(query.trim());
    const filtered = outputs.filter(
      (o) =>
        (!q || searchKey(o.title).includes(q)) &&
        (category === ALL || o.category === category) &&
        (profile === ALL || (profile === NO_PROFILE ? !o.profile : o.profile === profile)) &&
        (project === ALL || (project === NO_PROJECT ? !o.projectId : o.projectId === project)),
    );
    const sorted = [...filtered];
    if (sort === "old") sorted.reverse();
    if (sort === "updated") sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (sort === "name") sorted.sort((a, b) => a.title.localeCompare(b.title, "tr"));
    return sorted;
  }, [outputs, query, category, profile, project, sort]);

  // Proje sayfasında liste zaten tek projeye ait; filtre yalnızca birden çok projeli listede anlamlı.
  const showProjectFilter = projects.length > 0 && new Set(outputs.map((o) => o.projectId)).size > 1;
  const filtering = query.trim() !== "" || category !== ALL || profile !== ALL || project !== ALL;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Planlarında ara…"
          aria-label="Planlarında ara"
          className={`${selectClass} min-w-0 flex-1 basis-60`}
        />
        {categories.length > 1 && (
          <select aria-label="Alan" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
            <option value={ALL}>Tüm alanlar</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        {profiles.length > 0 && (
          <select aria-label="Profil" value={profile} onChange={(e) => setProfile(e.target.value)} className={selectClass}>
            <option value={ALL}>Tüm profiller</option>
            {profiles.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value={NO_PROFILE}>Profilsiz</option>
          </select>
        )}
        {showProjectFilter && (
          <select aria-label="Proje" value={project} onChange={(e) => setProject(e.target.value)} className={selectClass}>
            <option value={ALL}>Tüm projeler</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📁 {p.name}
              </option>
            ))}
            <option value={NO_PROJECT}>Projesiz</option>
          </select>
        )}
        <select aria-label="Sıralama" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={selectClass}>
          <option value="new">En yeni</option>
          <option value="old">En eski</option>
          <option value="updated">Son düzenlenen</option>
          <option value="name">Ada göre</option>
        </select>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {filtering ? `${outputs.length} plandan ${visible.length} tanesi gösteriliyor` : `${outputs.length} plan`}
        {filtering && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory(ALL);
              setProfile(ALL);
              setProject(ALL);
            }}
            className="ml-2 font-medium text-rose-600 hover:underline"
          >
            Filtreleri temizle
          </button>
        )}
      </p>

      {visible.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          Aramana uyan plan bulunamadı.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {visible.map((o) => (
            <OutputRow key={o.id} output={o} projects={projects} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OutputRow({ output: o, projects }: { output: OutputSummary; projects: ProjectOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(o.title);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMoving, startMove] = useTransition();

  function rename() {
    if (title.trim() === o.title) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await renameOutputAction(o.id, title);
      if (result.ok) {
        setEditing(false);
        setError(null);
        router.refresh();
      } else setError(result.error);
    });
  }

  function copy() {
    startTransition(async () => {
      const result = await copyOutputAction(o.id);
      if (result.ok && result.id) router.push(`/ciktilar/${result.id}`);
      else if (!result.ok) setError(result.error);
    });
  }

  function moveTo(projectId: string) {
    startMove(async () => {
      const result = await moveOutputToProjectAction(o.id, projectId || null);
      if (result.ok) {
        setError(null);
        router.refresh();
      } else setError(result.error);
    });
  }

  const meta = [o.project && `📁 ${o.project}`, o.category, o.profile && `🧠 ${o.profile}`, o.language === "en" && "English", o.shared && "🔗 Paylaşılıyor"].filter(Boolean);

  return (
    <li className="group relative flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-rose-50/60">
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              rename();
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              autoFocus
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setTitle(o.title);
                  setEditing(false);
                }
              }}
              aria-label="Yeni plan adı"
              className={`${selectClass} min-w-0 flex-1`}
            />
            <button disabled={isPending} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
              {isPending ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(o.title);
                setEditing(false);
              }}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Vazgeç
            </button>
          </form>
        ) : (
          // after: katmanı satırın tamamını kaplar; böylece satırın her yeri plana gider.
          <Link
            href={`/ciktilar/${o.id}`}
            className="font-medium text-slate-900 after:absolute after:inset-0 after:content-[''] group-hover:text-rose-700 group-hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-rose-500 focus-visible:after:ring-inset"
          >
            {o.title}
          </Link>
        )}
        <p className="mt-1 text-xs text-slate-500">
          {meta.length > 0 && <span>{meta.join(" · ")} · </span>}
          {dateFormat.format(new Date(o.createdAt))}
          {o.updatedAt !== o.createdAt && " · düzenlendi"}
        </p>
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </div>

      {!editing && (
        <div className="relative z-10 flex items-center gap-1 text-sm">
          {projects.length > 0 && (
            <select
              aria-label="Projeye taşı"
              title="Projeye taşı"
              value={o.projectId ?? ""}
              disabled={isPending || isMoving}
              onChange={(e) => moveTo(e.target.value)}
              className="max-w-40 rounded-md border-0 bg-transparent px-2 py-1.5 font-medium text-slate-600 hover:bg-slate-100 focus:ring-2 focus:ring-rose-500/20 focus:outline-none disabled:opacity-50"
            >
              <option value="">📁 Proje yok</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
          >
            Yeniden adlandır
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={isPending}
            title="Planın bir kopyasını oluşturur; kullanım hakkından düşmez"
            className="rounded-md px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {isPending ? "Kopyalanıyor…" : "Kopyala"}
          </button>
        </div>
      )}
    </li>
  );
}
