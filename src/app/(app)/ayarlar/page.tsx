import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usageSummary } from "@/core/billing/entitlements";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getCurrentSession } from "@/services/session";
import { signOutEverywhereAction } from "./actions";
import {
  ClearMemoriesForm,
  DeleteAccountForm,
  DisplayNameForm,
  EmailForm,
  PasswordForm,
  PreferencesForm,
} from "./settings-forms";

export const metadata: Metadata = { title: "Ayarlar" };

const SECTIONS = [
  { id: "hesap", label: "Hesap" },
  { id: "guvenlik", label: "Güvenlik" },
  { id: "kisisellestirme", label: "Kişiselleştirme" },
  { id: "abonelik", label: "Abonelik" },
  { id: "gizlilik", label: "Veri ve gizlilik" },
];

function Section({
  id,
  title,
  description,
  children,
  danger,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 rounded-2xl border bg-white p-5 sm:p-7 ${danger ? "border-red-200" : "border-slate-200"}`}
    >
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/giris?sonra=/ayarlar");
  const { user, preferences, entitlement } = session;
  const profiles = await new ProfileRepository(await createSupabaseServerClient()).list().catch(() => []);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ayarlar</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Ayar bölümleri" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          <Section id="hesap" title="Hesap">
            <div className="grid gap-8 md:grid-cols-2">
              <DisplayNameForm displayName={preferences.displayName ?? ""} />
              <EmailForm email={user.email ?? ""} />
            </div>
          </Section>

          <Section id="guvenlik" title="Güvenlik" description="Hesabını korumak için güçlü ve başka yerde kullanmadığın bir şifre seç.">
            <PasswordForm />
            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-sm font-medium text-slate-900">Tüm cihazlardan çıkış yap</p>
              <p className="mt-1 text-sm text-slate-600">
                Başka bir bilgisayarda açık kalan oturumların olduğundan şüpheleniyorsan tüm oturumları kapat. Tekrar giriş
                yapman gerekir.
              </p>
              <form action={signOutEverywhereAction} className="mt-3">
                <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Tüm cihazlardan çıkış yap
                </button>
              </form>
            </div>
          </Section>

          <Section
            id="kisisellestirme"
            title="Kişiselleştirme"
            description="Uygulamanın seni ve işini ne kadar hatırlayacağını sen belirlersin."
          >
            <PreferencesForm
              personalizationEnabled={preferences.personalizationEnabled}
              autoRemember={preferences.autoRemember}
              defaultDetail={preferences.defaultDetail}
              defaultProfileId={preferences.defaultProfileId}
              profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
            />
            <p className="mt-5 text-sm text-slate-600">
              Profillerini ve hafızalarını{" "}
              <Link href="/profiller" className="font-semibold text-rose-600 hover:underline">
                Profillerim
              </Link>{" "}
              sayfasından yönetebilirsin.
            </p>
          </Section>

          <Section id="abonelik" title="Abonelik">
            <p className="text-sm text-slate-700">
              {usageSummary(entitlement).value} — {usageSummary(entitlement).detail}.
            </p>
            <Link href="/abonelik" className="mt-3 inline-block text-sm font-semibold text-rose-600 hover:underline">
              Abonelik ayrıntıları →
            </Link>
          </Section>

          <Section
            id="gizlilik"
            title="Veri ve gizlilik"
            description="Profil bilgilerin, hafızan ve planların yalnızca senin hesabında saklanır; başka kullanıcılar göremez. Plan oluşturduğunda ilgili bilgiler yalnızca o planı hazırlamak için yapay zekâ servisine gönderilir."
          >
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-900">Verilerimi indir</p>
                <p className="mt-1 text-sm text-slate-600">Hesap bilgilerin, profillerin, hafızan ve planların tek bir JSON dosyasında.</p>
                {/* Dosya indirme bağlantısı; sayfa geçişi değil */}
                <a
                  href="/ayarlar/verilerim"
                  className="mt-3 inline-block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Verilerimi indir
                </a>
              </div>
              <div className="border-t border-slate-100 pt-6">
                <p className="text-sm font-medium text-slate-900">Hafızayı sil</p>
                <p className="mt-1 mb-3 text-sm text-slate-600">
                  Tüm profillerde hatırlanan bilgileri siler. Profil bilgilerin ve planların silinmez.
                </p>
                <ClearMemoriesForm />
              </div>
            </div>
          </Section>

          <Section
            id="hesabi-sil"
            title="Hesabı sil"
            description="Hesabın, profillerin, hafızan ve tüm planların kalıcı olarak silinir. Aktif bir aboneliğin varsa iptal edilir. Bu işlem geri alınamaz."
            danger
          >
            <DeleteAccountForm />
          </Section>
        </div>
      </div>
    </div>
  );
}
