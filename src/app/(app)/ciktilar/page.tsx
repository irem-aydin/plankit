import type { Metadata } from "next";
import Link from "next/link";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { ProjectRepository } from "@/infrastructure/supabase/project-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { ActiveJobs } from "./active-jobs";
import { OutputsList } from "./outputs-list";

export const metadata: Metadata = { title: "Planlarım" };

export default async function OutputsPage() {
  const supabase = await createSupabaseServerClient();
  const [outputs, projects] = await Promise.all([
    new OutputRepository(supabase).listSummaries(),
    new ProjectRepository(supabase).list(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Planlarım</h1>
          <p className="mt-1 text-slate-600">Oluşturduğun planlar, şablonlar ve checklist&apos;ler.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/projeler/yeni"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            + Proje
          </Link>
          <Link href="/olustur" className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500">
            Yeni plan oluştur
          </Link>
        </div>
      </div>

      <div className="mt-6 empty:hidden">
        <ActiveJobs />
      </div>

      {outputs.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-900">Henüz bir planın yok.</p>
          <p className="mt-1 text-sm text-slate-600">Bir kategori ve alt başlık seçerek ilk planını oluştur.</p>
          <Link href="/ornek-plan" className="mt-4 inline-block text-sm font-semibold text-rose-600 hover:underline">
            Önce örnek bir planı incele →
          </Link>
        </div>
      ) : (
        <OutputsList outputs={outputs} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
      )}
    </div>
  );
}
