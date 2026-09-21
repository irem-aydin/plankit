import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { DocumentView } from "@/components/document-view";
import { PrintButton } from "@/components/print-button";
import { PublicFooter, PublicHeader } from "@/components/public-shell";
import { APP_NAME } from "@/config/app";
import { publicEnv } from "@/config/env";
import { loadExampleDocument } from "@/content/example-docs";
import { EXAMPLES, findExample } from "@/content/examples";
import { CATEGORY_NAMES, continuePath } from "@/core/ai/preview";

export const dynamicParams = false;

export function generateStaticParams() {
  return EXAMPLES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/ornekler/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const example = findExample(slug);
  if (!example) return {};
  return {
    title: example.title,
    description: example.description,
    alternates: { canonical: `/ornekler/${example.slug}` },
    openGraph: { title: example.title, description: example.description, type: "article", siteName: APP_NAME },
  };
}

export default async function ExamplePage({ params }: PageProps<"/ornekler/[slug]">) {
  const { slug } = await params;
  const example = findExample(slug);
  const doc = example && loadExampleDocument(slug);
  if (!example || !doc) notFound();

  const startHref = `/kayit?sonra=${encodeURIComponent(continuePath(example, example.request))}`;
  const related = EXAMPLES.filter((e) => e.slug !== example.slug).sort((a, b) => Number(b.category === example.category) - Number(a.category === example.category)).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: example.title,
    description: example.description,
    inLanguage: "tr",
    url: `${publicEnv.siteUrl}/ornekler/${example.slug}`,
    author: { "@type": "Organization", name: APP_NAME },
    publisher: { "@type": "Organization", name: APP_NAME },
  };

  return (
    <div className="flex flex-1 flex-col bg-white">
      <PublicHeader cta={{ href: startHref, label: "Bu planı kendin oluştur" }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 print:p-0">
        <nav aria-label="Konum" className="mx-auto mb-6 flex max-w-4xl flex-wrap items-center gap-1 text-sm text-slate-500 print:hidden">
          <Link href="/ornekler" className="hover:text-rose-700 hover:underline">
            Örnek planlar
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span>{CATEGORY_NAMES[example.category]}</span>
        </nav>

        <header className="mx-auto mb-8 max-w-4xl">
          <div className="flex items-center gap-3">
            <CategoryIcon name={CATEGORY_NAMES[example.category]} />
            <p className="text-sm font-medium text-slate-500">{CATEGORY_NAMES[example.category]} · örnek plan</p>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{example.title}</h1>
          <p className="mt-3 text-lg text-slate-600">{example.description}</p>
          <div className="mt-5 flex flex-wrap gap-3 print:hidden">
            <Link
              href={startHref}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500"
            >
              Kendi durumunla oluştur — ücretsiz <ArrowRight className="size-4" aria-hidden />
            </Link>
            <PrintButton className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              PDF olarak kaydet
            </PrintButton>
          </div>
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Bu örnek kurgusal bir senaryodur ve {APP_NAME} ile yapay zekâ desteğiyle hazırlanmıştır. Rakamlar örnek amaçlıdır.
          </p>
        </header>

        <DocumentView doc={doc} contextLabel="Senaryo" hideTitle />

        <section className="mx-auto mt-12 max-w-4xl print:hidden">
          <div className="rounded-3xl bg-gradient-to-br from-rose-100 via-pink-50 to-rose-200 ring-1 ring-rose-100 px-6 py-10 text-center text-slate-900">
            <h2 className="text-2xl font-bold tracking-tight">Aynı planı kendi işin için hazırlayalım</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-600">
              Durumunu anlat; bu yapıdaki plan birkaç dakikada senin rakamlarınla hazır olsun. İlk planın ücretsiz.
            </p>
            <Link href={startHref} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-rose-500">
              Ücretsiz başla <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <h2 className="mt-12 text-lg font-semibold text-slate-900">Diğer örnekler</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((e) => (
              <Link key={e.slug} href={`/ornekler/${e.slug}`} className="rounded-xl border border-slate-200 p-4 hover:border-rose-300">
                <p className="text-xs text-slate-500">{CATEGORY_NAMES[e.category]}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{e.title}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
