import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { PricingTable } from "@/components/pricing-table";
import { isBillingConfigured, stripePackPriceId, stripePriceId } from "@/config/env";
import { usageSummary } from "@/core/billing/entitlements";
import { CREDIT_PACK, PLANS, type PaidPlanId } from "@/core/billing/plans";
import { getCurrentSession } from "@/services/session";
import { buyPackAction, openBillingPortalAction, startCheckoutAction } from "./actions";

export const metadata: Metadata = { title: "Abonelik" };

const NOTICES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  basarili: {
    tone: "ok",
    text: "Ödemen alındı, teşekkürler! Aboneliğin birkaç saniye içinde aktifleşecek; görünmüyorsa sayfayı yenile.",
  },
  paket: {
    tone: "ok",
    text: "Ödemen alındı, teşekkürler! Paket kredilerin birkaç saniye içinde hesabına eklenecek; görünmüyorsa sayfayı yenile.",
  },
  iptal: { tone: "warn", text: "Ödeme tamamlanmadı. İstediğin zaman tekrar deneyebilirsin." },
  limit: { tone: "warn", text: "Bu işlem için yeterli hakkın yok. Devam etmek için bir plan seç veya planını yükselt." },
  yakinda: { tone: "warn", text: "Bu plan için online ödeme henüz açılmadı. Çok yakında!" },
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" });

export default async function SubscriptionPage({ searchParams }: PageProps<"/abonelik">) {
  const session = await getCurrentSession();
  if (!session) redirect("/giris?sonra=/abonelik");

  const { durum, plan: wantedPlan, donem, paket } = await searchParams;
  const notice = typeof durum === "string" ? NOTICES[durum] : undefined;
  const { account, entitlement } = session;
  const usage = usageSummary(entitlement);
  const billing = isBillingConfigured();
  const purchasable = Object.fromEntries(
    (Object.keys(PLANS) as PaidPlanId[]).map((id) => [
      id,
      { month: billing && Boolean(stripePriceId(id, "month")), year: billing && Boolean(stripePriceId(id, "year")) },
    ]),
  ) as Record<PaidPlanId, { month: boolean; year: boolean }>;
  const packPurchasable = billing && Boolean(stripePackPriceId());
  const selected = typeof wantedPlan === "string" && wantedPlan in PLANS ? PLANS[wantedPlan as PaidPlanId] : null;
  const usedPercent =
    entitlement.kind === "credits" && entitlement.limit
      ? Math.round(((entitlement.limit - (entitlement.monthlyRemaining ?? 0)) / entitlement.limit) * 100)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Abonelik ve kullanım</h1>
        <p className="mt-1 text-slate-600">Planını, bu ayki kredilerini ve faturalarını buradan yönet.</p>
      </div>

      {notice && (
        <p className={`rounded-lg px-4 py-3 text-sm ${notice.tone === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
          {notice.text}
        </p>
      )}
      {selected && !notice && entitlement.plan !== selected.id && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Seçtiğin plan: <strong>{selected.name}</strong>. Aşağıdan ödeme adımına geçebilirsin.
        </p>
      )}
      {paket === "1" && !notice && (
        <p className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Seçtiğin: <strong>{CREDIT_PACK.name}</strong> ({CREDIT_PACK.credits} kredi). Aşağıdaki &quot;Paketi al&quot; düğmesiyle ödeme adımına
          geçebilirsin.
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Mevcut durum</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {entitlement.kind === "credits" && entitlement.plan && entitlement.plan in PLANS
                ? `${PLANS[entitlement.plan as PaidPlanId].name} planı`
                : entitlement.kind === "unlimited"
                  ? "Yönetici hesabı"
                  : entitlement.kind === "trial"
                    ? "Ücretsiz deneme"
                    : entitlement.kind === "pack"
                      ? "Paket kredisi"
                      : "Aktif plan yok"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {usage.value} — {usage.detail}
            </p>
          </div>
          {account.stripeCustomerId && (
            <form action={openBillingPortalAction}>
              <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <CreditCard className="size-4" aria-hidden /> Ödeme, faturalar ve iptal
              </button>
            </form>
          )}
        </div>

        {usedPercent !== null && (
          <div className="mt-5">
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${usedPercent >= 90 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Bu ay {entitlement.limit! - (entitlement.monthlyRemaining ?? 0)} / {entitlement.limit} kredi kullanıldı
              {entitlement.resetsAt && ` · ${dateFormat.format(new Date(entitlement.resetsAt))} tarihinde yenilenir`}
            </p>
          </div>
        )}
        {account.subscriptionStatus === "active" && account.currentPeriodEnd && (
          <p className="mt-3 text-xs text-slate-500">Sonraki ödeme: {dateFormat.format(new Date(account.currentPeriodEnd))}</p>
        )}
      </section>

      {entitlement.kind !== "unlimited" && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            {entitlement.kind === "credits" ? "Planını değiştir" : "Sana uygun planı seç"}
          </h2>
          <div className="mt-5">
            <PricingTable
              mode="app"
              currentPlan={entitlement.plan}
              purchasable={purchasable}
              checkoutAction={startCheckoutAction}
              packPurchasable={packPurchasable}
              buyPackAction={buyPackAction}
              defaultInterval={donem === "month" ? "month" : "year"}
            />
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Güvenli ödeme Stripe tarafından sağlanır. Abonelik her dönem sonunda otomatik yenilenir; istediğin an iptal edebilirsin,
            dönem sonuna kadar kullanmaya devam edersin. Paket kredileri tek ödemedir ve aboneliğin bittiğinde de hesabında kalır.
          </p>
        </section>
      )}
    </div>
  );
}
