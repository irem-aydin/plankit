import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Briefcase,
  ClipboardList,
  FileDown,
  Link2,
  LineChart,
  MessageSquareText,
  PenLine,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { Logo } from "@/components/logo";
import { TableCharts } from "@/components/table-charts";
import { APP_NAME } from "@/config/app";
import { EXAMPLES } from "@/content/examples";
import { SAMPLE_PLAN } from "@/content/sample-plan";
import { CATEGORY_NAMES } from "@/core/ai/preview";
import { CREDIT_PACK, formatPrice, PLANS, yearlyDiscountPercent } from "@/core/billing/plans";
import { HeroDemo } from "./hero-demo";
import { TryPreview } from "./try-preview";

const STEPS: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: PenLine, title: "Ne istediğini yaz", text: "Kendi cümlelerinle anlat ya da hazır başlıklardan seç. İstersen rapor, tablo veya ekran görüntüsü ekle." },
  { Icon: Sparkles, title: "Yapay zekâ hazırlasın", text: "Durumun analiz edilir; alternatifler, riskler ve somut aksiyon adımları profesyonel bir çerçevede yazılır." },
  { Icon: FileDown, title: "Düzenle, paylaş, uygula", text: "Tabloları düzenle, açık soruları cevapla, planı Word/PDF olarak indir ya da bağlantıyla ekibine gönder." },
];

const FEATURES: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Target, title: "Sana özel strateji", text: "Genel geçer tavsiyeler değil; sektörüne, bütçene ve ekibine göre öneriler ve adım adım aksiyon planı." },
  { Icon: Brain, title: "Seni hatırlar", text: "İşin ve hedeflerin için profil oluştur; önceki planlardaki kararlar sonrakilerde de tutarlı kalır." },
  { Icon: ShieldCheck, title: "Dürüst ve kontrol edilebilir", text: "Tahminler ve varsayımlar açıkça yazılır, eksik bilgiler soru olarak sorulur. Cevapladıkça plan güncellenir." },
  { Icon: LineChart, title: "Görsel planlar", text: "SWOT, risk haritası ve zaman çizelgesi tablolardan otomatik çizilir; sunuma hazır." },
  { Icon: Link2, title: "Tek tıkla paylaş", text: "Planı bir bağlantıyla ekibinle ya da iş ortaklarınla paylaş; kişisel bilgilerin paylaşılmaz." },
  { Icon: BookOpenCheck, title: "Profesyonel çerçeveler", text: "BABOK, PMBOK ve modern ürün yönetimi pratiklerine dayalı şablonlar: RACI, proje beratı, PRD ve fazlası." },
];

const PERSONAS: { Icon: LucideIcon; who: string; example: string }[] = [
  { Icon: Store, who: "Küçük işletme sahibi", example: "“İkinci şubeyi açmalı mıyım, yoksa mevcut dükkânı mı büyütmeliyim?”" },
  { Icon: ClipboardList, who: "Proje yöneticisi", example: "“Yeni ERP geçişi için proje beratı ve risk planı hazırla.”" },
  { Icon: UserRoundCog, who: "Ürün yöneticisi", example: "“Abonelik özelliği için PRD ve başarı metrikleri lazım.”" },
  { Icon: Briefcase, who: "Danışman / serbest çalışan", example: "“Müşterim için paydaş analizi ve iletişim planı çıkar.”" },
];

const CATEGORIES = [
  { name: "İş Analizi", text: "Strateji analizi, paydaş analizi, gereksinim yönetimi, süreç iyileştirme" },
  { name: "Proje Yönetimi", text: "Proje beratı, WBS, RACI, risk, takvim ve durum raporları" },
  { name: "Ürün Yönetimi", text: "Ürün stratejisi, PRD, yol haritası, metrikler, go-to-market" },
  { name: "İş Geliştirme", text: "Satış stratejisi, ortaklıklar, pazar genişleme, lead yönetimi" },
];

const FAQ = [
  {
    q: "Ücretli mi?",
    a: `İlk planın ücretsiz ve kredi kartı gerekmez. Sonrasında Başlangıç (${formatPrice(PLANS.starter.priceMonthly)}/ay, ${PLANS.starter.monthlyCredits} kredi) veya Profesyonel (${formatPrice(PLANS.pro.priceMonthly)}/ay, ${PLANS.pro.monthlyCredits} kredi) planla devam edebilirsin; yıllık ödemede %${yearlyDiscountPercent(PLANS.pro)} indirim var. Abonelik istemezsen tek seferlik paket (${CREDIT_PACK.credits} kredi, ${formatPrice(CREDIT_PACK.price)}) alabilirsin.`,
  },
  { q: "Bilgilerim güvende mi?", a: "Planların ve profillerin yalnızca senin hesabında durur. Eklediğin dosyalar saklanmaz; verilerini istediğin an indirebilir veya silebilirsin." },
  { q: "Yapay zekâ hata yapabilir mi?", a: "Evet, bu yüzden tahminler ve varsayımlar planda açıkça işaretlenir. Önemli kararlardan, mevzuat ve tutar içeren konularda uzman görüşü almanı öneririz." },
  { q: "Planı değiştirebilir miyim?", a: "Her alanı ve tabloyu düzenleyebilir, açık soruları cevaplayarak planı yapay zekâya güncelletebilir, kopyalayıp yeni sürümler oluşturabilirsin." },
  { q: "Hangi dillerde plan hazırlıyor?", a: "Türkçe ve İngilizce. Plan oluştururken dili seçebilirsin." },
];

function sampleTable(id: string) {
  const body = SAMPLE_PLAN.sections[0].body;
  return body.kind === "template" ? body.sections.find((s) => s.id === id)?.table : undefined;
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { durum } = await searchParams;
  const swot = sampleTable("swot");
  const risks = sampleTable("riskler");
  const actions = sampleTable("aksiyon");

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5">
          <Link href="/" aria-label={APP_NAME}>
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <a href="#nasil-calisir" className="hidden rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 md:inline">
              Nasıl çalışır?
            </a>
            <Link href="/fiyatlar" className="hidden rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 md:inline">
              Fiyatlar
            </Link>
            <Link href="/ornekler" className="hidden rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 md:inline">
              Örnekler
            </Link>
            <Link href="/giris" className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
              Giriş yap
            </Link>
            <Link href="/kayit" className="rounded-lg bg-rose-600 px-3.5 py-2 font-semibold text-white shadow-sm hover:bg-rose-500">
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
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-rose-100),transparent_55%),radial-gradient(ellipse_at_bottom_left,var(--color-pink-50),transparent_50%)]"
            aria-hidden
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100">
                <Sparkles className="size-3.5" aria-hidden /> Yapay zekâ destekli iş planlama
              </p>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl">
                Durumunu anlat,{" "}
                <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">sana özel stratejini</span> al.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-pretty text-slate-600">
                Kıdemli bir danışmanın hazırlayacağı gibi analiz, alternatifler, riskler ve adım adım aksiyon planı — dakikalar
                içinde, düzenlenebilir ve paylaşılabilir.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/kayit"
                  className="flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-3 font-semibold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500"
                >
                  İlk planın ücretsiz
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <a href="#dene" className="rounded-lg px-5 py-3 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                  Kayıt olmadan dene
                </a>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-600" aria-hidden /> Kredi kartı gerekmez
                </li>
                <li className="flex items-center gap-1.5">
                  <MessageSquareText className="size-4 text-emerald-600" aria-hidden /> Türkçe ve İngilizce
                </li>
                <li className="flex items-center gap-1.5">
                  <FileDown className="size-4 text-emerald-600" aria-hidden /> Word ve PDF
                </li>
              </ul>
            </div>
            <HeroDemo />
          </div>
        </section>

        {/* Kayıt olmadan dene */}
        <section id="dene" className="scroll-mt-20 border-y border-rose-100 bg-gradient-to-b from-rose-50/60 to-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="text-sm font-semibold text-rose-600">Kayıt olmadan dene</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Planının önizlemesini birkaç saniyede gör</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Durumunu yaz; öne çıkan bulguları ve ilk adımları hemen görelim. Beğenirsen tam planı ücretsiz hesabınla
              oluşturursun.
            </p>
            <div className="mt-8">
              <TryPreview />
            </div>
          </div>
        </section>

        {/* Nasıl çalışır */}
        <section id="nasil-calisir" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
          <p className="text-sm font-semibold text-rose-600">Nasıl çalışır?</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Üç adımda planın hazır</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-6">
                <span className="absolute top-6 right-6 text-5xl font-bold text-slate-100" aria-hidden>
                  {i + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/20">
                  <s.Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Görsel planlar */}
        <section className="bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-rose-600">Görsel planlar</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Tablolar kendiliğinden grafiğe dönüşür</h2>
              <p className="mt-4 text-slate-600">
                SWOT dört kutuya, riskler olasılık × etki haritasına, aksiyon planı zaman çizelgesine yerleşir. Tabloyu
                düzenledikçe grafik de güncellenir; PDF ve paylaşım sayfasında da görünür.
              </p>
              <Link href="/ornek-plan" className="mt-6 inline-flex items-center gap-1.5 font-semibold text-rose-600 hover:underline">
                Örnek planın tamamını incele <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="space-y-4">
              {swot && <TableCharts table={swot} />}
              <div className="grid gap-4 xl:grid-cols-1">
                {risks && <TableCharts table={risks} />}
                {actions && <TableCharts table={actions} />}
              </div>
            </div>
          </div>
        </section>

        {/* Kimler için */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-sm font-semibold text-rose-600">Kimler için?</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Plan yapması gereken herkes için</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PERSONAS.map((p) => (
              <div key={p.who} className="rounded-2xl border border-slate-200 p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                  <p.Icon className="size-5" aria-hidden />
                </span>
                <p className="mt-4 font-semibold text-slate-900">{p.who}</p>
                <p className="mt-2 text-sm text-slate-600 italic">{p.example}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Özellikler */}
        <section className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <p className="text-sm font-semibold text-rose-600">Neden {APP_NAME}?</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Boş şablon değil, senin planın</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <f.Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Kategoriler */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">4 alanda profesyonel çerçeveler</h2>
          <p className="mt-2 text-slate-600">Uluslararası kabul görmüş çerçevelere dayalı içerikler.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((c) => (
              <div key={c.name} className="rounded-2xl border border-slate-200 p-5">
                <CategoryIcon name={c.name} size="lg" />
                <h3 className="mt-4 font-semibold text-slate-900">{c.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Örnekler */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-rose-600">Örnek planlar</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Hazırlanmış örneklere göz at</h2>
            </div>
            <Link href="/ornekler" className="inline-flex items-center gap-1.5 font-semibold text-rose-600 hover:underline">
              Tüm örnekler <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXAMPLES.filter((_, i) => i % 2 === 0).map((e) => (
              <Link key={e.slug} href={`/ornekler/${e.slug}`} className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md">
                <CategoryIcon name={CATEGORY_NAMES[e.category]} />
                <p className="mt-3 font-semibold text-slate-900 group-hover:text-rose-700">{e.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{e.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* SSS */}
        <section className="mx-auto max-w-3xl px-4 pb-20">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sık sorulanlar</h2>
          <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200">
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
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100 via-pink-50 to-rose-200 px-6 py-14 text-center text-slate-900 ring-1 ring-rose-100 sm:px-12">
            <div className="pointer-events-none absolute -top-20 -left-20 size-64 rounded-full bg-white/60 blur-2xl" aria-hidden />
            <h2 className="relative text-3xl font-bold tracking-tight">İlk planın birkaç dakika uzağında</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-slate-600">
              Ücretsiz hesap oluştur, durumunu anlat ve sana özel stratejini gör.
            </p>
            <Link
              href="/kayit"
              className="relative mt-8 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-rose-500"
            >
              Ücretsiz başla <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500">
          <span className="flex items-center gap-3">
            <Logo className="text-base" />
            <span>© {new Date().getFullYear()}</span>
          </span>
          <span className="flex flex-wrap items-center gap-4">
            <Link href="/ornekler" className="font-medium text-slate-600 hover:underline">
              Örnek planlar
            </Link>
            <Link href="/fiyatlar" className="font-medium text-slate-600 hover:underline">
              Fiyatlar
            </Link>
            <Link href="/yasal" className="font-medium text-slate-600 hover:underline">
              Yasal bilgiler
            </Link>
          </span>
          <p className="w-full text-xs">Yapay zekâ önerileri karar desteği içindir; önemli kararlardan önce uzman görüşü alın.</p>
        </div>
      </footer>
    </div>
  );
}
