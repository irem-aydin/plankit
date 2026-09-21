import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { DocumentView } from "@/components/document-view";
import { APP_NAME } from "@/config/app";
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
    : { href: "/kayit", label: "Ücretsiz başla — ilk planın ücretsiz" };

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href={user ? "/panel" : "/"} aria-label={APP_NAME}>
            <Logo />
          </Link>
          <Link href={cta.href} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500">
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

        <div className="mx-auto mt-10 max-w-4xl rounded-3xl bg-gradient-to-br from-rose-100 via-pink-50 to-rose-200 ring-1 ring-rose-100 px-6 py-10 text-center text-slate-900">
          <h2 className="text-2xl font-bold tracking-tight">Sıra senin planında</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">
            Durumunu kendi cümlelerinle anlat, birkaç dakika içinde sana özel planın hazır olsun.
          </p>
          <Link href={cta.href} className="mt-6 inline-block rounded-lg bg-rose-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-rose-500">
            {cta.label}
          </Link>
        </div>
      </main>
    </div>
  );
}
