import type { Metadata } from "next";
import Link from "next/link";
import { MAX_PROFILES_PER_USER, PROFILE_KIND_META, profileCompleteness } from "@/core/profile/profile";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getCurrentSession } from "@/services/session";

export const metadata: Metadata = { title: "Profillerim" };

export default async function ProfilesPage({ searchParams }: PageProps<"/profiller">) {
  const [{ durum }, session] = await Promise.all([searchParams, getCurrentSession()]);
  const profiles = await new ProfileRepository(await createSupabaseServerClient()).list();
  const personalizationOff = session?.preferences.personalizationEnabled === false;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profillerim</h1>
          <p className="mt-1 max-w-2xl text-slate-600">
            Çalıştığın iş, şirketin ya da kendi hedeflerin için bir kez profil oluştur. Plan hazırlarken profili seçmen yeterli;
            uygulama seni hatırlar ve her seferinde baştan anlatman gerekmez.
          </p>
        </div>
        {profiles.length < MAX_PROFILES_PER_USER && (
          <Link
            href="/profiller/yeni"
            className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
          >
            + Yeni profil
          </Link>
        )}
      </div>

      {durum === "silindi" && (
        <p className="mt-6 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">Profil ve hafızası silindi.</p>
      )}
      {personalizationOff && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Kişiselleştirme şu anda kapalı; profillerin plan oluştururken kullanılmıyor.{" "}
          <Link href="/ayarlar#kisisellestirme" className="font-semibold underline">
            Ayarlardan aç
          </Link>
        </p>
      )}

      {profiles.length === 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(["work", "personal"] as const).map((kind) => (
            <Link
              key={kind}
              href={`/profiller/yeni?tur=${kind}`}
              className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 transition hover:border-rose-400 hover:shadow-sm"
            >
              <span className="text-3xl" aria-hidden>
                {PROFILE_KIND_META[kind].icon}
              </span>
              <p className="mt-3 font-semibold text-slate-900">{PROFILE_KIND_META[kind].label} profili oluştur</p>
              <p className="mt-1 text-sm text-slate-600">{PROFILE_KIND_META[kind].description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {profiles.map((p) => {
            const completeness = Math.round(profileCompleteness(p) * 100);
            return (
              <li key={p.id}>
                <Link
                  href={`/profiller/${p.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-rose-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        {PROFILE_KIND_META[p.kind].icon} {PROFILE_KIND_META[p.kind].label}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">{p.name}</p>
                    </div>
                    {session?.preferences.defaultProfileId === p.id && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                        Varsayılan
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Profil doluluğu</span>
                      <span>%{completeness}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-rose-500" style={{ width: `${completeness}%` }} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
