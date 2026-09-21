import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { TRIAL_GENERATION_LIMIT } from "@/core/billing/entitlements";
import { getCurrentSession } from "@/services/session";
import { openBillingPortalAction, startCheckoutAction } from "./actions";

export const metadata: Metadata = { title: "Abonelik" };

const NOTICES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  basarili: {
    tone: "ok",
    text: "Ödemen alındı, teşekkürler! Aboneliğin birkaç saniye içinde aktifleşecek; görünmüyorsa sayfayı yenile.",
  },
  iptal: { tone: "warn", text: "Ödeme tamamlanmadı. İstediğin zaman tekrar deneyebilirsin." },
  limit: {
    tone: "warn",
    text: "Ücretsiz deneme hakkını kullandın. Yeni planlar oluşturmaya devam etmek için abone ol.",
  },
};

const FEATURES = [
  "Sınırsız şablon, checklist ve rehber üretimi",
  "Tüm kategorilere ve alt başlıklara erişim",
  "Çıktıları kaydetme, düzenleme ve PDF/Markdown dışa aktarma",
  "Yeni eklenen içeriklere otomatik erişim",
];

export default async function SubscriptionPage({ searchParams }: PageProps<"/abonelik">) {
  const session = await getCurrentSession();
  if (!session) redirect("/giris?sonra=/abonelik");

  const { durum } = await searchParams;
  const notice = typeof durum === "string" ? NOTICES[durum] : undefined;
  const { account, entitlement } = session;
  const isActive = account.subscriptionStatus === "active";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Abonelik</h1>

      {notice && (
        <p
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            notice.tone === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-medium text-slate-500">Mevcut durum</p>
        {isActive ? (
          <>
            <p className="mt-1 text-xl font-semibold text-emerald-700">Pro — aktif</p>
            {account.currentPeriodEnd && (
              <p className="mt-1 text-sm text-slate-600">
                Sonraki yenileme: {new Date(account.currentPeriodEnd).toLocaleDateString("tr-TR")}
              </p>
            )}
          </>
        ) : account.subscriptionStatus === "trial" ? (
          <>
            <p className="mt-1 text-xl font-semibold text-slate-900">Ücretsiz deneme</p>
            <p className="mt-1 text-sm text-slate-600">
              {account.trialLimitUsed} / {TRIAL_GENERATION_LIMIT} çıktı kullanıldı · {entitlement.remainingTrial} hak kaldı
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-xl font-semibold text-amber-700">Deneme / abonelik sona erdi</p>
            <p className="mt-1 text-sm text-slate-600">Yeni çıktı üretmek için abone ol. Mevcut çıktıların saklanmaya devam eder.</p>
          </>
        )}

        {account.stripeCustomerId && (
          <form action={openBillingPortalAction} className="mt-4">
            <button className="text-sm font-medium text-rose-600 hover:underline">
              Ödeme yöntemi, faturalar ve iptal →
            </button>
          </form>
        )}
      </div>

      {!isActive && (
        <div className="mt-6 rounded-2xl border-2 border-rose-500 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-rose-600">Pro</p>
          <p className="mt-1 text-slate-600">Tek plan, sınırsız kullanım. İstediğin zaman iptal et.</p>
          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            {FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-rose-600" aria-hidden>
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          {process.env.STRIPE_SECRET_KEY ? (
            <form action={startCheckoutAction} className="mt-6">
              <SubmitButton className="w-full" pendingText="Stripe'a yönlendiriliyor…">
                Abone ol
              </SubmitButton>
            </form>
          ) : (
            <p className="mt-6 rounded-lg bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
              Online ödeme çok yakında aktif olacak.
            </p>
          )}
          <p className="mt-3 text-center text-xs text-slate-500">Güvenli ödeme Stripe tarafından sağlanır.</p>
        </div>
      )}
    </div>
  );
}
