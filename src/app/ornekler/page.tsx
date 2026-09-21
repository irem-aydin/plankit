import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { APP_NAME } from "@/config/app";
import { EXAMPLES } from "@/content/examples";
import { CATEGORY_NAMES, CATEGORY_SLUGS } from "@/core/ai/preview";

export const metadata: Metadata = {
  title: "Örnek Planlar: SWOT, Proje Beratı, PRD ve Daha Fazlası",
  description:
    "Ücretsiz iş planı örnekleri: SWOT analizi, paydaş analizi, proje beratı, risk yönetim planı, PRD, ürün yol haritası, satış stratejisi ve pazara giriş planı.",
  alternates: { canonical: "/ornekler" },
  openGraph: { title: `Örnek Planlar · ${APP_NAME}`, type: "website" },
};

export default function ExamplesPage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <PublicHeader />
      <main className="flex-1">
        <section className="border-b border-rose-100 bg-gradient-to-b from-rose-50/70 to-white">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <p className="text-sm font-semibold text-rose-600">Örnek planlar</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight text-slate-900">
              Gerçek senaryolarla hazırlanmış iş planı örnekleri
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Her örnek, kurgusal bir işletmenin durumundan {APP_NAME} ile hazırlandı. İncele, beğendiğin yapıyı kendi durumunla
              birkaç dakikada oluştur.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
          {CATEGORY_SLUGS.map((category) => {
            const items = EXAMPLES.filter((e) => e.category === category);
            if (items.length === 0) return null;
            return (
              <section key={category} aria-labelledby={`kategori-${category}`}>
                <h2 id={`kategori-${category}`} className="flex items-center gap-3 text-xl font-bold text-slate-900">
                  <CategoryIcon name={CATEGORY_NAMES[category]} />
                  {CATEGORY_NAMES[category]}
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {items.map((e) => (
                    <Link
                      key={e.slug}
                      href={`/ornekler/${e.slug}`}
                      className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md"
                    >
                      <p className="font-semibold text-slate-900 group-hover:text-rose-700">{e.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{e.description}</p>
                      <p className="mt-3 flex items-center gap-1 text-sm font-medium text-rose-600">
                        Örneği incele <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                      </p>
                    </Link>
                  ))}
                  {category === "is-analizi" && (
                    <Link
                      href="/ornek-plan"
                      className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md"
                    >
                      <p className="font-semibold text-slate-900 group-hover:text-rose-700">Strateji Analizi Örneği: İkinci Şube Kararı</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Bir kahve dükkânının ikinci şube kararı: SWOT, alternatiflerin karşılaştırması, 6 aylık aksiyon planı ve risk
                        haritası.
                      </p>
                      <p className="mt-3 flex items-center gap-1 text-sm font-medium text-rose-600">
                        Örneği incele <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                      </p>
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="rounded-3xl bg-gradient-to-br from-rose-100 via-pink-50 to-rose-200 ring-1 ring-rose-100 px-6 py-12 text-center text-slate-900">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Aradığın örnek burada yok mu?</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              Ne istediğini kendi cümlelerinle yaz; yapay zekâ konuya uygun çerçeveyi kurup senin durumuna göre doldursun.
            </p>
            <Link href="/kayit" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-rose-500">
              Ücretsiz başla <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
