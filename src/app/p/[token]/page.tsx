import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { DocumentView } from "@/components/document-view";
import { PrintButton } from "@/components/print-button";
import { APP_NAME } from "@/config/app";
import { TRIAL_GENERATION_LIMIT } from "@/core/billing/entitlements";
import { generatedDocumentSchema } from "@/core/output/document";
import { isShareToken, toSharedDocument } from "@/core/share/share";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { getAuthenticatedUser } from "@/infrastructure/supabase/server";

/**
 * Herkese açık, salt okunur paylaşılan plan. Plan yalnızca doğru anahtarla
 * sunucuda okunur (herkese açık bir veritabanı izni yoktur). Kişisel bağlam
 * (anlatılan durum, profil, dosyalar) gösterilmez.
 */
const loadShared = cache(async (token: string) => {
  if (!isShareToken(token)) return null;
  const shared = await new OutputRepository(createSupabaseAdminClient()).findByShareToken(token);
  if (!shared) return null;
  const parsed = generatedDocumentSchema.safeParse(shared.document);
  if (!parsed.success) return null;
  return { ...shared, document: toSharedDocument(parsed.data) };
});

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });

export async function generateMetadata({ params }: PageProps<"/p/[token]">): Promise<Metadata> {
  const { token } = await params;
  const shared = await loadShared(token);
  if (!shared) return { title: "Plan bulunamadı", robots: { index: false, follow: false } };
  const description = `${APP_NAME} ile hazırlanmış plan: analiz, öneriler ve aksiyon adımları.`;
  return {
    title: shared.title,
    description,
    // Paylaşılan planlar kişiye özeldir; arama motorlarında listelenmez.
    robots: { index: false, follow: false },
    openGraph: { title: shared.title, description, siteName: APP_NAME, type: "article" },
  };
}

export default async function SharedPlanPage({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  const shared = await loadShared(token);
  if (!shared) notFound();

  const viewer = await getAuthenticatedUser();
  const isOwner = viewer?.id === shared.ownerId;
  // Sahibinin kendi açışları sayılmaz; sayaç yanıtı bekletmez.
  if (!isOwner) after(() => new OutputRepository(createSupabaseAdminClient()).recordShareView(token));

  const cta = viewer
    ? { href: "/olustur", label: "✨ Kendi planını oluştur" }
    : { href: "/kayit", label: "Ücretsiz dene" };

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-2">
            <PrintButton className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:inline">
              PDF olarak kaydet
            </PrintButton>
            <Link href={cta.href} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              {cta.label}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 print:p-0">
        {isOwner && (
          <p className="mx-auto mb-6 max-w-4xl rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 print:hidden">
            Bu senin paylaştığın planın; bağlantıyı açan kişiler tam olarak bu sayfayı görür. Senin açışların
            görüntülenme sayısına eklenmez.{" "}
            <Link href="/ciktilar" className="font-semibold underline">
              Planlarım
            </Link>
          </p>
        )}

        <p className="mx-auto mb-4 max-w-4xl text-sm text-slate-500">
          {APP_NAME} ile hazırlandı · son güncelleme {dateFormat.format(new Date(shared.updatedAt))}
        </p>

        <DocumentView doc={shared.document} />

        <p className="mx-auto mt-8 max-w-4xl text-xs text-slate-500">
          Bu doküman yapay zekâ desteğiyle hazırlanmıştır ve karar desteği amaçlıdır. Tahmini rakamlar, tarihler ve
          mevzuat bilgileri uygulamaya geçmeden önce ilgili kurumdan veya bir uzmandan teyit edilmelidir.
        </p>

        {!isOwner && (
          <section className="mx-auto mt-10 max-w-4xl rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-10 text-center text-white print:hidden">
            <p className="text-sm font-medium text-indigo-100">Bu plan {APP_NAME} ile birkaç dakikada hazırlandı</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Senin işin için de hazırlayalım</h2>
            <p className="mx-auto mt-3 max-w-xl text-indigo-100">
              Durumunu kendi cümlelerinle anlat; analiz, alternatifler, riskler ve adım adım aksiyon planı dakikalar içinde
              hazır olsun.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href={cta.href} className="rounded-lg bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50">
                {viewer ? cta.label : `Ücretsiz başla — ilk ${TRIAL_GENERATION_LIMIT} plan ücretsiz`}
              </Link>
              {!viewer && <span className="text-sm text-indigo-100">Kredi kartı gerekmez.</span>}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-100 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <Link href="/yasal" className="font-medium text-slate-600 hover:underline">
            Yasal bilgiler
          </Link>
        </div>
      </footer>
    </div>
  );
}
