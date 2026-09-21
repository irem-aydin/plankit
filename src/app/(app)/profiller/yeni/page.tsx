import type { Metadata } from "next";
import Link from "next/link";
import { createProfileAction } from "../actions";
import { ProfileForm } from "../profile-form";

export const metadata: Metadata = { title: "Yeni profil" };

export default async function NewProfilePage({ searchParams }: PageProps<"/profiller/yeni">) {
  const { tur } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/profiller" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Profillerim
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Yeni profil</h1>
      <p className="mt-1 mb-8 text-slate-600">
        Bir kez anlat, her planda kullan. Bilgileri istediğin zaman güncelleyebilirsin.
      </p>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        <ProfileForm action={createProfileAction} initialKind={tur === "personal" ? "personal" : "work"} />
      </div>
    </div>
  );
}
