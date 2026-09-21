import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Eye,
  FileText,
  Gauge,
  Link2,
  Rocket,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { usageSummary } from "@/core/billing/entitlements";
import { computeDashboardStats } from "@/core/dashboard/stats";
import { profileCompleteness } from "@/core/profile/profile";
import { listCategories } from "@/infrastructure/supabase/catalog-queries";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getCurrentSession } from "@/services/session";
import { ActiveJobs } from "../ciktilar/active-jobs";

export const metadata: Metadata = { title: "Panel" };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

function greeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("tr-TR", { hour: "numeric", hour12: false, timeZone: "Europe/Istanbul" }).format(date));
  if (hour < 6) return "İyi Geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi Günler";
  return "İyi Akşamlar";
}

export default async function DashboardPage({ searchParams }: PageProps<"/panel">) {
  const session = await getCurrentSession();
  if (!session) redirect("/giris");
  const { durum, hosgeldin } = await searchParams;
  const { user, preferences, entitlement } = session;

  const supabase = await createSupabaseServerClient();
  const [profiles, plans, categories] = await Promise.all([
    new ProfileRepository(supabase).list().catch(() => []),
    new OutputRepository(supabase).listSummaries(),
    listCategories().catch(() => []),
  ]);

  const stats = computeDashboardStats(plans);
  const recent = plans.slice(0, 5);
  const name = preferences.displayName || user.email?.split("@")[0] || "";
  const showProfiles = preferences.personalizationEnabled;

  const usage = usageSummary(entitlement);

  return (
    <div className="space-y-8">
      {durum === "sifre-yenilendi" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Şifren başarıyla yenilendi.</p>
      )}

      {/* Karşılama */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100 via-pink-50 to-rose-200 p-6 text-slate-900 ring-1 ring-rose-100 sm:p-10">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/60 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-pink-200/50 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="text-sm font-medium text-rose-600">{hosgeldin ? "Hoş Geldin 👋" : greeting()}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{name ? `${name}, ` : ""}bugün neyi planlıyoruz?</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Durumunu anlat; analiz, alternatifler, riskler ve adım adım aksiyon planı dakikalar içinde hazır olsun.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/olustur"
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500"
            >
              <Sparkles className="size-4" aria-hidden />
              Yeni plan oluştur
            </Link>
            {stats.total === 0 && (
              <Link
                href="/ornek-plan"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-rose-800 ring-1 ring-rose-300 hover:bg-white/60"
              >
                Örnek planı gör
              </Link>
            )}
            {!entitlement.canGenerate && (
              <Link href="/abonelik" className="rounded-lg px-5 py-2.5 text-sm font-semibold text-rose-800 ring-1 ring-rose-300 hover:bg-white/60">
                Plan seç
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Özet kartları */}
      <section aria-label="Özet" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard Icon={FileText} label="Toplam plan" value={String(stats.total)} tone="rose" />
        <StatCard Icon={CalendarDays} label="Bu ay" value={String(stats.thisMonth)} hint="yeni plan" tone="sky" />
        <StatCard
          Icon={stats.shared > 0 ? Eye : Link2}
          label={stats.shared > 0 ? "Görüntülenme" : "Paylaşılan"}
          value={String(stats.shared > 0 ? stats.views : 0)}
          hint={stats.shared > 0 ? `${stats.shared} paylaşılan planda` : "henüz paylaşım yok"}
          tone="emerald"
        />
        <StatCard Icon={Gauge} label="Kullanım hakkı" value={usage.value} hint={usage.detail} tone="pink" href="/abonelik" />
      </section>

      <div className="empty:hidden">
        <ActiveJobs />
      </div>

      {stats.total === 0 ? (
        <GettingStarted hasProfile={profiles.length > 0} showProfiles={showProfiles} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Son planlar */}
            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Son planların</h2>
                <Link href="/ciktilar" className="flex items-center gap-1 text-sm font-medium text-rose-600 hover:underline">
                  Tümü <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
              <ul className="divide-y divide-slate-100">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link href={`/ciktilar/${o.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                      <CategoryIcon name={o.category} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">{o.title}</span>
                        <span className="block text-xs text-slate-500">
                          {o.category ?? "Plan"} · {dateFormat.format(new Date(o.createdAt))}
                        </span>
                      </span>
                      {o.shared && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset">
                          <Eye className="size-3" aria-hidden /> {o.shareViews}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Etkinlik */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Son 6 ay</h2>
              <p className="text-sm text-slate-500">Aylara göre oluşturduğun planlar</p>
              <MonthBars data={stats.byMonth} />
            </section>
          </div>

          <aside className="space-y-6">
            {/* Alanlara göre */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Alanlara göre</h2>
              <ul className="mt-4 space-y-3">
                {stats.byCategory.map((c) => (
                  <li key={c.name}>
                    <div className="flex items-center gap-2 text-sm">
                      <CategoryIcon name={c.name} size="sm" />
                      <span className="flex-1 text-slate-700">{c.name}</span>
                      <span className="font-semibold text-slate-900 tabular-nums">{c.count}</span>
                    </div>
                    <div className="mt-1.5 ml-10 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: `${(c.count / stats.total) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <ProfilesCard profiles={profiles} showProfiles={showProfiles} />
          </aside>
        </div>
      )}

      {/* Hızlı başla */}
      {categories.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Hızlı başla</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/olustur/${c.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md"
              >
                <CategoryIcon name={c.name} size="lg" />
                <p className="mt-3 font-semibold text-slate-900">{c.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{c.description}</p>
                <p className="mt-3 flex items-center gap-1 text-xs font-medium text-rose-600">
                  Başla
                  <ArrowRight className="size-3 transition group-hover:translate-x-0.5" aria-hidden />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {stats.total === 0 && <ProfilesCard profiles={profiles} showProfiles={showProfiles} />}
    </div>
  );
}

const TONES = {
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
  pink: "bg-pink-50 text-pink-600",
} as const;

function StatCard({
  Icon,
  label,
  value,
  hint,
  tone,
  href,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone: keyof typeof TONES;
  href?: string;
}) {
  const body = (
    <>
      <span className={`flex size-9 items-center justify-center rounded-lg ${TONES[tone]}`} aria-hidden>
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </>
  );
  const className = "block rounded-2xl border border-slate-200 bg-white p-4";
  return href ? (
    <Link href={href} className={`${className} hover:border-rose-300`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function MonthBars({ data }: { data: { key: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="mt-5 flex h-36 items-end gap-3" role="img" aria-label={data.map((d) => `${d.label}: ${d.count}`).join(", ")}>
      {data.map((d, i) => (
        <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700 tabular-nums">{d.count > 0 ? d.count : ""}</span>
          <div
            className={`w-full max-w-12 rounded-t-md ${i === data.length - 1 ? "bg-rose-500" : "bg-rose-200"}`}
            style={{ height: `${Math.max(4, (d.count / max) * 96)}px` }}
          />
          <span className="text-xs text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function ProfilesCard({
  profiles,
  showProfiles,
}: {
  profiles: Awaited<ReturnType<ProfileRepository["list"]>>;
  showProfiles: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Profillerin</h2>
        {showProfiles && profiles.length > 0 && (
          <Link href="/profiller" className="flex items-center gap-1 text-sm font-medium text-rose-600 hover:underline">
            Yönet <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>

      {!showProfiles ? (
        <p className="mt-3 text-sm text-slate-600">
          Kişiselleştirme kapalı. Uygulamanın seni ve işini hatırlaması için{" "}
          <Link href="/ayarlar#kisisellestirme" className="font-semibold text-rose-600 hover:underline">
            Ayarlar
          </Link>
          &apos;dan açabilirsin.
        </p>
      ) : profiles.length === 0 ? (
        <>
          <p className="mt-2 text-sm text-slate-600">
            İşin ya da kendi hedeflerin için bir profil oluştur; her planda baştan anlatman gerekmez.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/profiller/yeni?tur=work" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 p-3 text-sm font-medium hover:border-rose-300">
              <Building2 className="size-4 text-slate-500" aria-hidden /> İş profili
            </Link>
            <Link href="/profiller/yeni?tur=personal" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 p-3 text-sm font-medium hover:border-rose-300">
              <User className="size-4 text-slate-500" aria-hidden /> Kişisel profil
            </Link>
          </div>
        </>
      ) : (
        <ul className="mt-4 space-y-2">
          {profiles.map((p) => {
            const Icon = p.kind === "work" ? Building2 : User;
            const pct = Math.round(profileCompleteness(p) * 100);
            return (
              <li key={p.id}>
                <Link href={`/profiller/${p.id}`} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:border-rose-300">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600" aria-hidden>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{p.name}</span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full bg-rose-500" style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">%{pct}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** İlk plan oluşturulana kadar gösterilen başlangıç rehberi. */
function GettingStarted({ hasProfile, showProfiles }: { hasProfile: boolean; showProfiles: boolean }) {
  const steps = [
    {
      title: "Örnek bir planı incele",
      text: "Hakkını harcamadan ne alacağını gör: analiz, alternatifler, aksiyon planı ve riskler.",
      href: "/ornek-plan",
      cta: "Örnek planı aç",
      done: false,
    },
    ...(showProfiles
      ? [
          {
            title: "Profilini oluştur (isteğe bağlı)",
            text: "İşini ya da hedeflerini bir kez anlat; sonraki planlarda baştan yazman gerekmez.",
            href: "/profiller/yeni",
            cta: "Profil oluştur",
            done: hasProfile,
          },
        ]
      : []),
    {
      title: "İlk planını oluştur",
      text: "Bir alan seç, “Ne oluşturmak istiyorsun?” kutusuna ihtiyacını yaz. Birkaç dakikada hazır.",
      href: "/olustur",
      cta: "Plan oluştur",
      done: false,
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="flex items-center gap-2 font-semibold text-slate-900">
        <Rocket className="size-4 text-rose-600" aria-hidden /> Başlarken
      </p>
      <ol className="mt-4 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-xl bg-slate-50 p-4">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                s.done ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0">
              <p className={`font-medium ${s.done ? "text-slate-500 line-through" : "text-slate-900"}`}>{s.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{s.text}</p>
              {!s.done && (
                <Link href={s.href} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 hover:underline">
                  {s.cta} <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
