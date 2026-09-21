import Link from "next/link";
import { APP_NAME } from "@/config/app";
import { TRIAL_GENERATION_LIMIT } from "@/core/billing/entitlements";

const STEPS = [
  { n: "1", title: "Başlığını seç", text: "İş analizi, proje, ürün ya da iş geliştirme alanında ihtiyacın olan konuları işaretle." },
  { n: "2", title: "Durumunu anlat", text: "Kısa sorulara cevap ver, serbestçe yaz ya da kayıtlı profilini seç; uygulama seni hatırlar." },
  { n: "3", title: "Planını al", text: "Sana özel analiz, alternatifler, riskler ve somut aksiyon planı. Düzenle, PDF olarak indir." },
];

const FEATURES = [
  {
    icon: "✨",
    title: "Sana özel strateji",
    text: "Genel geçer tavsiyeler değil; sektörüne, bütçene ve ekibine göre hazırlanmış öneriler ve adım adım aksiyon planı.",
  },
  {
    icon: "🧠",
    title: "Seni hatırlar",
    text: "İş yerin ve kişisel hedeflerin için profiller oluştur. Her planda baştan anlatman gerekmez; verdiğin cevaplar hafızaya eklenir.",
  },
  {
    icon: "🎯",
    title: "Dürüst ve kontrol edilebilir",
    text: "Tahminler işaretlenir, varsayımlar açıkça yazılır, eksik bilgiler soru olarak sorulur. Cevapladıkça plan güncellenir.",
  },
  {
    icon: "📄",
    title: "Profesyonel çerçeveler",
    text: "BABOK, PMBOK ve modern ürün yönetimi pratiklerine dayalı şablonlar: SWOT, paydaş matrisi, RACI, risk planı ve daha fazlası.",
  },
  {
    icon: "✏️",
    title: "Düzenle, paylaş",
    text: "Her tabloyu ve metni düzenleyebilirsin. PDF veya Markdown olarak dışa aktar, ekibinle paylaş.",
  },
  {
    icon: "🔒",
    title: "Verin sende",
    text: "Bilgilerin yalnızca senin hesabında saklanır. Kişiselleştirmeyi kapatabilir, verilerini indirebilir veya tamamen silebilirsin.",
  },
];

const CATEGORIES = [
  { name: "İş Analizi", text: "Strateji analizi, paydaş analizi, gereksinim yönetimi, süreç iyileştirme" },
  { name: "Proje Yönetimi", text: "Kapsam, takvim, maliyet, risk, iletişim ve çevik uygulamalar" },
  { name: "Ürün Yönetimi", text: "Ürün stratejisi, keşif, yol haritası, metrikler, go-to-market" },
  { name: "İş Geliştirme", text: "Satış stratejisi, ortaklıklar, pazar genişleme, lead yönetimi" },
];

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { durum } = await searchParams;

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
          <nav className="flex items-center gap-2 text-sm">
            <a href="#nasil-calisir" className="hidden rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:inline">
              Nasıl çalışır?
            </a>
            <Link href="/giris" className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
              Giriş yap
            </Link>
            <Link href="/kayit" className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-500">
              Ücretsiz başla
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {durum === "hesap-silindi" && (
          <p className="mx-auto mt-6 max-w-6xl rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
            Hesabın ve tüm verilerin kalıcı olarak silindi.
          </p>
        )}

        {/* Hero */}
        <section className="bg-gradient-to-b from-indigo-50/70 to-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
              ✨ Yapay zekâ destekli iş planlama
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Durumunu anlat, <span className="text-indigo-600">sana özel stratejini</span> al.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-600">
              İş analizi, proje, ürün ve iş geliştirme konularında; kıdemli bir danışmanın hazırlayacağı gibi analiz, alternatifler
              ve adım adım aksiyon planı. Üstelik işini hatırlar, her seferinde baştan anlatman gerekmez.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/kayit" className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-indigo-500">
                Hemen dene — ilk {TRIAL_GENERATION_LIMIT} plan ücretsiz
              </Link>
              <span className="text-sm text-slate-500">Kredi kartı gerekmez.</span>
            </div>
          </div>
        </section>

        {/* Nasıl çalışır */}
        <section id="nasil-calisir" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Üç adımda planın hazır</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-slate-200 p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">{s.n}</span>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Özellikler */}
        <section className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Neden {APP_NAME}?</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                  <span className="text-2xl" aria-hidden>
                    {f.icon}
                  </span>
                  <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Kategoriler */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">4 alan, 46 başlık</h2>
          <p className="mt-2 text-slate-600">Uluslararası kabul görmüş çerçevelere dayalı içerikler.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((c) => (
              <div key={c.name} className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900">{c.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-12 text-center text-white sm:px-12">
            <h2 className="text-3xl font-bold tracking-tight">İlk planın birkaç dakika uzağında</h2>
            <p className="mx-auto mt-3 max-w-xl text-indigo-100">
              Ücretsiz hesap oluştur, durumunu anlat ve sana özel stratejini gör.
            </p>
            <Link href="/kayit" className="mt-8 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50">
              Ücretsiz başla
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <span className="flex flex-wrap items-center gap-3">
            <Link href="/yasal" className="font-medium text-slate-600 hover:underline">
              Yasal bilgiler
            </Link>
            <span>Yapay zekâ önerileri karar desteği içindir; önemli kararlardan önce uzman görüşü alın.</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
