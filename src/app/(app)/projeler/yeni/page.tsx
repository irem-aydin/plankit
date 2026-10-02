import type { Metadata } from "next";
import Link from "next/link";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { createProjectAction } from "../actions";
import { ProjectForm } from "../project-form";

export const metadata: Metadata = { title: "Yeni proje" };

export default async function NewProjectPage({ searchParams }: PageProps<"/projeler/yeni">) {
  const [{ profil }, profiles] = await Promise.all([
    searchParams,
    createSupabaseServerClient().then((client) => new ProfileRepository(client).list()),
  ]);
  const initialProfileId = profiles.find((p) => p.id === profil)?.id ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/projeler" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Projelerim
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Yeni proje</h1>
      <p className="mt-1 mb-8 text-slate-600">
        Aynı iş için hazırladığın planları tek bir projede topla. Planları sonradan da projeye taşıyabilirsin.
      </p>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        <ProjectForm
          action={createProjectAction}
          profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
          initialProfileId={initialProfileId}
        />
      </div>
    </div>
  );
}
