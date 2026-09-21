import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TRIAL_GENERATION_LIMIT } from "@/core/billing/entitlements";
import { PROFILE_KIND_META, profileCompleteness } from "@/core/profile/profile";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getCurrentSession } from "@/services/session";
import { ActiveJobs } from "../ciktilar/active-jobs";

export const metadata: Metadata = { title: "Panel" };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

function greeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("tr-TR", { hour: "numeric", hour12: false, timeZone: "Europe/Istanbul" }).format(date));
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
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
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="font-semibold text-slate-900">🚀 Başlarken</p>
      <ol className="mt-4 space-y-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                s.done ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0">
              <p className={`font-medium ${s.done ? "text-slate-500 line-through" : "text-slate-900"}`}>{s.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{s.text}</p>
              {!s.done && (
                <Link href={s.href} className="mt-1 inline-block text-sm font-semibold text-indigo-600 hover:underline">
                  {s.cta} →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/panel">) {
  const session = await getCurrentSession();
  if (!session) redirect("/giris");
  const { durum, hosgeldin } = await searchParams;
  const { user, account, preferences, entitlement } = session;

  const supabase = await createSupabaseServerClient();
  const [profiles, outputs] = await Promise.all([
    new ProfileRepository(supabase).list().catch(() => []),
    new OutputRepository(supabase).listForCurrentUser(5),
  ]);

  const name = preferences.displayName || user.email?.split("@")[0] || "";
  const showProfiles = preferences.personalizationEnabled;

  return (
    <div className="space-y-8">
      {durum === "sifre-yenilendi" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Şifren başarıyla yenilendi.</p>
      )}

      {/* Karşılama */}
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white sm:p-10">
        <p className="text-sm text-indigo-100">{hosgeldin ? "Hoş geldin 👋" : greeting()}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{name ? `${name},` : ""} bugün neyi planlıyoruz?</h1>
        <p className="mt-2 max-w-2xl text-indigo-100">
          Başlığını seç, durumunu anlat; sana özel analiz, strateji ve aksiyon planını dakikalar içinde hazırlayalım.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/olustur" className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50">
            ✨ Yeni plan oluştur
          </Link>
          {showProfiles && profiles.length === 0 && (
            <Link
              href="/profiller/yeni"
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/40 hover:bg-white/10"
            >
              🧠 İlk profilini oluştur
            </Link>
          )}
        </div>
        <p className="mt-6 text-xs text-indigo-100">
          {entitlement.unlimited
            ? "Pro · sınırsız plan"
            : account.subscriptionStatus === "trial"
              ? `Ücretsiz deneme · ${entitlement.remainingTrial} / ${TRIAL_GENERATION_LIMIT} hak kaldı`
              : "Deneme süren doldu · "}
          {!entitlement.unlimited && account.subscriptionStatus !== "trial" && (
            <Link href="/abonelik" className="font-semibold underline">
              abone ol
            </Link>
          )}
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Son planlar */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Son planların</h2>
            {outputs.length > 0 && (
              <Link href="/ciktilar" className="text-sm font-medium text-indigo-600 hover:underline">
                Tümü →
              </Link>
            )}
          </div>
          <div className="mt-4 empty:hidden">
            <ActiveJobs />
          </div>
          {outputs.length === 0 ? (
            <GettingStarted hasProfile={profiles.length > 0} showProfiles={showProfiles} />
          ) : (
            <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {outputs.map((o) => (
                <li key={o.id}>
                  <Link href={`/ciktilar/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-slate-50">
                    <span className="font-medium text-slate-900">{o.title}</span>
                    <span className="text-sm text-slate-500">{dateFormat.format(new Date(o.createdAt))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Profiller */}
        <aside>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">🧠 Profillerin</h2>
            {showProfiles && (
              <Link href="/profiller" className="text-sm font-medium text-indigo-600 hover:underline">
                Yönet →
              </Link>
            )}
          </div>

          {!showProfiles ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Kişiselleştirme kapalı. Uygulamanın seni ve işini hatırlaması için{" "}
              <Link href="/ayarlar#kisisellestirme" className="font-semibold text-indigo-600 hover:underline">
                Ayarlar
              </Link>
              &apos;dan açabilirsin.
            </div>
          ) : profiles.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-700">
                Çalıştığın iş ya da kendi hedeflerin için bir profil oluştur. Plan hazırlarken her şeyi baştan anlatman gerekmez;
                uygulama seni hatırlar.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/profiller/yeni?tur=work" className="rounded-lg border border-slate-200 p-3 text-center text-sm font-medium hover:border-indigo-300">
                  🏢 İş profili
                </Link>
                <Link href="/profiller/yeni?tur=personal" className="rounded-lg border border-slate-200 p-3 text-center text-sm font-medium hover:border-indigo-300">
                  👤 Kişisel profil
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {profiles.map((p) => (
                <li key={p.id}>
                  <Link href={`/profiller/${p.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300">
                    <p className="text-xs text-slate-500">
                      {PROFILE_KIND_META[p.kind].icon} {PROFILE_KIND_META[p.kind].label}
                    </p>
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-indigo-500" style={{ width: `${Math.round(profileCompleteness(p) * 100)}%` }} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
