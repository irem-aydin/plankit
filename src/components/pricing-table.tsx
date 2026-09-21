"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Package, Sparkles } from "lucide-react";
import {
  CREDIT_PACK,
  FREE_PLAN_FEATURES,
  formatPrice,
  LAUNCH_PRICING,
  PLANS,
  yearlyDiscountPercent,
  yearlyMonthlyEquivalent,
  type BillingInterval,
  type PaidPlanId,
  type PlanId,
} from "@/core/billing/plans";

/**
 * Plan kartları (aylık/yıllık geçişli). "public" modda düğmeler kayda
 * götürür; "app" modda Stripe ödeme formunu gönderir.
 */
export function PricingTable({
  mode,
  currentPlan = null,
  purchasable = { starter: { month: true, year: true }, pro: { month: true, year: true } },
  checkoutAction,
  packPurchasable = true,
  buyPackAction,
  defaultInterval = "year",
}: {
  mode: "public" | "app";
  currentPlan?: PlanId | null;
  /** Stripe fiyatı tanımlı olanlar (tanımsızsa "yakında") */
  purchasable?: Record<PaidPlanId, Record<BillingInterval, boolean>>;
  checkoutAction?: (formData: FormData) => Promise<void>;
  /** Tek seferlik paket için Stripe fiyatı tanımlı mı */
  packPurchasable?: boolean;
  buyPackAction?: () => Promise<void>;
  defaultInterval?: BillingInterval;
}) {
  const [interval, setBillingInterval] = useState<BillingInterval>(defaultInterval);
  const discount = yearlyDiscountPercent(PLANS.pro);

  return (
    <div>
      {LAUNCH_PRICING && (
        <p className="mx-auto mb-5 w-fit max-w-full rounded-2xl bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 ring-1 ring-amber-100">
          <span className="font-semibold">Kuruluş dönemi fiyatı</span> · Bu dönemde abone olanların fiyatı, aboneliği sürdükçe
          değişmez.
        </p>
      )}
      <div className="flex justify-center">
        <div role="radiogroup" aria-label="Ödeme dönemi" className="inline-flex rounded-full bg-slate-100 p-1 text-sm">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={interval === i}
              onClick={() => setBillingInterval(i)}
              className={`rounded-full px-4 py-1.5 font-medium transition ${
                interval === i ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {i === "month" ? "Aylık" : "Yıllık"}
              {i === "year" && (
                <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  %{discount} indirim
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {/* Ücretsiz */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-semibold text-slate-900">Ücretsiz</p>
          <p className="mt-1 min-h-10 text-sm text-slate-600">Ürünü tanımak ve ilk planını hazırlamak için</p>
          <p className="mt-5 text-4xl font-bold tracking-tight text-slate-900">0 ₺</p>
          <p className="mt-1 text-sm text-slate-500">Kredi kartı gerekmez</p>
          <Features items={FREE_PLAN_FEATURES} />
          <div className="mt-auto pt-6">
            {mode === "public" ? (
              <Link href="/kayit" className="block rounded-lg border border-slate-300 py-2.5 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Ücretsiz başla
              </Link>
            ) : (
              <p className="rounded-lg bg-slate-50 py-2.5 text-center text-sm text-slate-500">
                {currentPlan === "free" ? "Şu anki planın" : "Tüm hesaplarda"}
              </p>
            )}
          </div>
        </div>

        {(Object.keys(PLANS) as PaidPlanId[]).map((id) => {
          const plan = PLANS[id];
          const monthly = interval === "year" ? yearlyMonthlyEquivalent(plan) : plan.priceMonthly;
          const isCurrent = currentPlan === id;
          const available = purchasable[id][interval];
          return (
            <div
              key={id}
              className={`relative flex flex-col rounded-2xl bg-white p-6 ${
                plan.highlight ? "border-2 border-rose-500 shadow-lg shadow-rose-900/5" : "border border-slate-200"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  <Sparkles className="size-3" aria-hidden /> En popüler
                </span>
              )}
              <p className="font-semibold text-slate-900">{plan.name}</p>
              <p className="mt-1 min-h-10 text-sm text-slate-600">{plan.tagline}</p>
              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-slate-900">{formatPrice(monthly)}</span>
                <span className="text-sm text-slate-500">/ ay</span>
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {interval === "year" ? `Yıllık ${formatPrice(plan.priceYearly)} olarak faturalanır` : "Aylık faturalanır · istediğin an iptal"}
              </p>
              <Features items={plan.features} />
              <div className="mt-auto pt-6">
                {mode === "public" ? (
                  <Link
                    href={`/kayit?sonra=${encodeURIComponent(`/abonelik?plan=${id}&donem=${interval}`)}`}
                    className={`block rounded-lg py-2.5 text-center text-sm font-semibold ${
                      plan.highlight ? "bg-rose-600 text-white hover:bg-rose-500" : "border border-slate-300 text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {plan.name} ile başla
                  </Link>
                ) : isCurrent ? (
                  <p className="rounded-lg bg-emerald-50 py-2.5 text-center text-sm font-semibold text-emerald-700">Şu anki planın</p>
                ) : available && checkoutAction ? (
                  <form action={checkoutAction}>
                    <input type="hidden" name="plan" value={id} />
                    <input type="hidden" name="interval" value={interval} />
                    <button
                      className={`w-full rounded-lg py-2.5 text-sm font-semibold ${
                        plan.highlight ? "bg-rose-600 text-white hover:bg-rose-500" : "border border-slate-300 text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {currentPlan === "starter" || currentPlan === "pro" ? `${plan.name} planına geç` : `${plan.name} planını seç`}
                    </button>
                  </form>
                ) : (
                  <p className="rounded-lg bg-slate-100 py-2.5 text-center text-sm text-slate-600">Online ödeme çok yakında</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tek seferlik paket: planı ara sıra lazım olanlar için */}
      <div id="paket" className="mt-5 flex scroll-mt-24 flex-wrap items-center justify-between gap-4 rounded-2xl bg-sky-50 p-5 ring-1 ring-sky-100 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
            <Package className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-slate-900">
              Abonelik istemiyor musun? {CREDIT_PACK.name}: {CREDIT_PACK.credits} kredi · {formatPrice(CREDIT_PACK.price)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Tek ödeme, otomatik yenileme yok. Krediler süre sınırı olmadan hesabında kalır. {CREDIT_PACK.credits} özet plan ya da
              1 detaylı plan ve 1 güncelleme için yeter.
            </p>
          </div>
        </div>
        {mode === "public" ? (
          <Link
            href={`/kayit?sonra=${encodeURIComponent("/abonelik?paket=1")}`}
            className="rounded-lg border border-sky-300 bg-white px-4 py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-100"
          >
            Paketi al
          </Link>
        ) : packPurchasable && buyPackAction ? (
          <form action={buyPackAction}>
            <button className="rounded-lg border border-sky-300 bg-white px-4 py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-100">
              Paketi al · {formatPrice(CREDIT_PACK.price)}
            </button>
          </form>
        ) : (
          <p className="rounded-lg bg-white/70 px-4 py-2.5 text-sm text-slate-600">Online ödeme çok yakında</p>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        1 kredi = 1 özet plan veya 1 plan güncellemesi · detaylı plan 2 kredi · abonelik kredileri her ay yenilenir.{" "}
        <Link href="/fiyatlar#ekip" className="font-medium text-rose-600 hover:underline">
          Ekip ve kurumsal
        </Link>
      </p>
    </div>
  );
}

function Features({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
      {items.map((f) => (
        <li key={f} className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden />
          {f}
        </li>
      ))}
    </ul>
  );
}
