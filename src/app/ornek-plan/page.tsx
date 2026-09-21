import type { Metadata } from "next";
import Link from "next/link";
import { DocumentView } from "@/components/document-view";
import { APP_NAME } from "@/config/app";
import { TRIAL_GENERATION_LIMIT } from "@/core/billing/entitlements";
import { SAMPLE_PLAN } from "@/content/sample-plan";
import { getAuthenticatedUser } from "@/infrastructure/supabase/server";

export const metadata: Metadata = {
  title: "Örnek plan",
  description: `${APP_NAME} ile hazırlanmış örnek bir strateji planı.`,
};

/** Herkese açık: ziyaretçi de, yeni kayıt olan kullanıcı da hakkını harcamadan görebilir. */
export default async function SamplePlanPage() {
  const user = await getAuthenticatedUser();
  const cta = user
    ? { href: "/olustur", label: "✨ Kendi planımı oluştur" }
    : { href: "/kayit", label: `Ücretsiz başla — ilk ${TRIAL_GENERATION_LIMIT} plan ücretsiz` };

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href={user ? "/panel" : "/"} className="text-lg font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <Link href={cta.href} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            {cta.label}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mx-auto mb-8 max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:p-5">
          <p className="font-semibold">👀 Bu bir örnek plan</p>
          <p className="mt-1">
            Kurgusal bir kahve dükkânı için hazırlandı. Kullanıcı durumunu birkaç cümleyle anlattı; {APP_NAME} analizi,
            alternatifleri, aksiyon planını ve riskleri çıkardı. Kendi planında tabloları düzenleyebilir, açık soruları
            cevaplayarak planı güncelletebilir ve PDF ya da Word olarak indirebilirsin.
          </p>
        </div>

        <DocumentView doc={SAMPLE_PLAN} />

        <div className="mx-auto mt-10 max-w-4xl rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-10 text-center text-white">
          <h2 className="text-2xl font-bold tracking-tight">Sıra senin planında</h2>
          <p className="mx-auto mt-2 max-w-xl text-indigo-100">
            Durumunu kendi cümlelerinle anlat, birkaç dakika içinde sana özel planın hazır olsun.
          </p>
          <Link href={cta.href} className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50">
            {cta.label}
          </Link>
        </div>
      </main>
    </div>
  );
}
