import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { PricingTable } from "@/components/pricing-table";
import { PublicFooter, PublicHeader } from "@/components/public-shell";
import { APP_NAME } from "@/config/app";
import { CREDIT_COSTS, CREDIT_PACK, formatPrice, PLANS } from "@/core/billing/plans";

export const metadata: Metadata = {
  title: "Fiyatlar",
  description: `${APP_NAME} planları: ücretsiz başla, Başlangıç ${formatPrice(PLANS.starter.priceMonthly)}/ay, Profesyonel ${formatPrice(PLANS.pro.priceMonthly)}/ay. Yıllık ödemede indirim, istediğin an iptal.`,
  alternates: { canonical: "/fiyatlar" },
};

const FAQ = [
  {
    q: "Kredi nedir?",
    a: `Plan hazırlamak için kullandığın birimdir. Özet plan ${CREDIT_COSTS.plan} kredi, detaylı plan ${CREDIT_COSTS.detailedPlan} kredi, açık soruları cevaplayarak planı güncellemek ${CREDIT_COSTS.refine} kredidir. Düzenleme, indirme, paylaşım ve karar hafızası kredi harcamaz.`,
  },
  { q: "Kullanmadığım krediler ne olur?", a: "Abonelik kredileri her ay yenilenir ve bir sonraki aya devretmez. Yıllık planda da her ay aynı miktarda kredi tanımlanır. Tek seferlik paket kredilerinin ise süre sınırı yoktur." },
  {
    q: "Abonelik olmadan kullanabilir miyim?",
    a: `Evet. ${CREDIT_PACK.name} (${CREDIT_PACK.credits} kredi, ${formatPrice(CREDIT_PACK.price)}) tek ödemedir, otomatik yenilenmez. Abone olursan önce aylık kredilerin, bitince paket kredilerin kullanılır.`,
  },
  { q: "Kredilerim biterse?", a: "Yeni plan hazırlayamazsın ama mevcut planlarını görmeye, düzenlemeye ve indirmeye devam edersin. İstersen planını hemen yükseltebilirsin." },
  { q: "İstediğim zaman iptal edebilir miyim?", a: "Evet. İptal ettiğinde dönem sonuna kadar kullanmaya devam edersin, sonrasında yenilenmez. Planların silinmez." },
  { q: "Plan değiştirebilir miyim?", a: "Evet, Abonelik sayfasından istediğin an yükseltip düşürebilirsin; fark Stripe tarafından orantılı olarak hesaplanır." },
  { q: "Ödeme güvenli mi?", a: "Ödemeler Stripe altyapısıyla alınır; kart bilgilerin bizim sunucularımıza hiç gelmez." },
];

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <PublicHeader />
      <main className="flex-1">
        <section className="border-b border-rose-100 bg-gradient-to-b from-rose-50/70 to-white">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center">
            <p className="text-sm font-semibold text-rose-600">Fiyatlar</p>
            <h1 className="mx-auto mt-2 max-w-2xl text-4xl font-bold tracking-tight text-slate-900">
              Ücretsiz başla, ihtiyacın kadar planla
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
              İlk planın ücretsiz. Sonrası için sana uyan planı seç; istediğin an değiştir ya da iptal et.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12">
          <PricingTable mode="public" />
        </div>

        <section id="ekip" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-12">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-rose-100 via-pink-50 to-rose-200 p-6 ring-1 ring-rose-100 sm:p-8">
            <div className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600">
                <Building2 className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-900">Ekip ve kurumsal</p>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  Birden fazla kullanıcı, ortak profiller, yüksek kredi hacmi veya faturalı ödeme mi gerekiyor? Ekibine özel bir
                  teklif hazırlayalım.
                </p>
              </div>
            </div>
            <Link href="/yasal#iletisim" className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500">
              Bize ulaşın
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sık sorulanlar</h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-slate-900">
                  {f.q}
                  <span className="text-slate-400 transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">Fiyatlara KDV dahildir.</p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
