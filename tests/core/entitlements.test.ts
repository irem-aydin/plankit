import { describe, expect, it } from "vitest";
import {
  canAfford,
  effectiveCost,
  getEntitlement,
  mapStripeSubscriptionStatus,
  TRIAL_GENERATION_LIMIT,
  usageSummary,
} from "@/core/billing/entitlements";
import {
  addMonths,
  CREDIT_PACK,
  currentCreditWindow,
  monthlyCreditLimit,
  planCreditCost,
  PLANS,
  yearlyDiscountPercent,
  yearlyMonthlyEquivalent,
} from "@/core/billing/plans";

const NOW = new Date("2026-09-21T10:00:00.000Z");

describe("deneme", () => {
  it("yeni hesabın 1 plan hakkı var", () => {
    const e = getEntitlement({ subscriptionStatus: "trial", trialLimitUsed: 0 }, TRIAL_GENERATION_LIMIT, NOW);
    expect(e).toMatchObject({ kind: "trial", canGenerate: true, remaining: 1, limit: 1 });
  });

  it("hakkını kullanan deneme hesabı üretemez", () => {
    const e = getEntitlement({ subscriptionStatus: "trial", trialLimitUsed: 1 }, TRIAL_GENERATION_LIMIT, NOW);
    expect(e.canGenerate).toBe(false);
    expect(e.remaining).toBe(0);
  });

  it("denemede detaylı plan da tek hak sayılır", () => {
    const e = getEntitlement({ subscriptionStatus: "trial", trialLimitUsed: 0 }, TRIAL_GENERATION_LIMIT, NOW);
    expect(effectiveCost(e, 2)).toBe(1);
    expect(canAfford(e, 2)).toBe(true);
  });

  it("süresi dolan hesap üretemez", () => {
    expect(getEntitlement({ subscriptionStatus: "expired", trialLimitUsed: 0 }).canGenerate).toBe(false);
  });
});

describe("abonelik kredileri", () => {
  const starter = (used: number, start = "2026-09-10T00:00:00.000Z") =>
    getEntitlement({ subscriptionStatus: "active", trialLimitUsed: 1, plan: "starter", creditsUsed: used, creditsPeriodStart: start }, 1, NOW);

  it("kalan krediyi ve yenilenme tarihini hesaplar", () => {
    const e = starter(3);
    expect(e).toMatchObject({ kind: "credits", remaining: 5, limit: PLANS.starter.monthlyCredits, plan: "starter" });
    expect(e.resetsAt).toBe("2026-10-10T00:00:00.000Z");
  });

  it("ay dolunca krediler yenilenmiş sayılır", () => {
    const e = starter(8, "2026-08-01T00:00:00.000Z");
    expect(e.remaining).toBe(8);
    expect(e.resetsAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("detaylı plan için yeterli kredi yoksa izin vermez", () => {
    const e = starter(7);
    expect(canAfford(e, planCreditCost("summary"))).toBe(true);
    expect(canAfford(e, planCreditCost("detailed"))).toBe(false);
  });

  it("kredisi biten abone üretemez", () => {
    expect(starter(8).canGenerate).toBe(false);
  });

  it("elle aktif edilmiş (planı olmayan) hesap kotasızdır", () => {
    const e = getEntitlement({ subscriptionStatus: "active", trialLimitUsed: 0, plan: "internal" });
    expect(e.kind).toBe("unlimited");
    expect(canAfford(e, 99)).toBe(true);
  });
});

describe("tek seferlik paket", () => {
  it("deneme hakkı bitmiş kullanıcı paket kredisiyle üretebilir", () => {
    const e = getEntitlement({ subscriptionStatus: "expired", trialLimitUsed: 1, packCredits: 3 }, 1, NOW);
    expect(e).toMatchObject({ kind: "pack", canGenerate: true, remaining: 3 });
    expect(canAfford(e, 2)).toBe(true);
    expect(usageSummary(e).badge).toBe("3 kredi");
  });

  it("abonede kalan kredi aylık + paket toplamıdır", () => {
    const e = getEntitlement(
      { subscriptionStatus: "active", trialLimitUsed: 1, plan: "starter", creditsUsed: 8, creditsPeriodStart: NOW.toISOString(), packCredits: 2 },
      1,
      NOW,
    );
    expect(e).toMatchObject({ kind: "credits", remaining: 2, monthlyRemaining: 0, packCredits: 2, canGenerate: true });
    expect(usageSummary(e)).toMatchObject({ badge: "Başlangıç · 2 kredi", value: "0 / 8" });
    expect(usageSummary(e).detail).toContain("2 paket kredisi");
  });

  it("denemede ücretsiz hak önce gelir", () => {
    const e = getEntitlement({ subscriptionStatus: "trial", trialLimitUsed: 0, packCredits: 3 }, 1, NOW);
    expect(e).toMatchObject({ kind: "trial", remaining: 1, packCredits: 3 });
  });

  it("paket fiyatı abonelikten pahalı kredi başı", () => {
    expect(CREDIT_PACK).toMatchObject({ credits: 3, price: 149 });
    expect(CREDIT_PACK.price / CREDIT_PACK.credits).toBeGreaterThan(PLANS.starter.priceMonthly / PLANS.starter.monthlyCredits);
  });
});

describe("usageSummary", () => {
  it("abone için plan adı ve kalan krediyi gösterir", () => {
    const e = getEntitlement({ subscriptionStatus: "active", trialLimitUsed: 0, plan: "pro", creditsUsed: 5, creditsPeriodStart: NOW.toISOString() }, 1, NOW);
    expect(usageSummary(e)).toMatchObject({ badge: "Profesyonel · 20 kredi", value: "20 / 25", tone: "plan" });
  });

  it("hakkı biten deneme kullanıcısını plan seçmeye yönlendirir", () => {
    expect(usageSummary(getEntitlement({ subscriptionStatus: "trial", trialLimitUsed: 1 })).badge).toBe("Plan seç");
  });
});

describe("planlar ve kredi penceresi", () => {
  it("fiyatlar ve krediler seçilen değerlerde", () => {
    expect(PLANS.starter).toMatchObject({ priceMonthly: 249, monthlyCredits: 8 });
    expect(PLANS.pro).toMatchObject({ priceMonthly: 499, monthlyCredits: 25 });
    expect(yearlyDiscountPercent(PLANS.starter)).toBe(20);
    expect(yearlyDiscountPercent(PLANS.pro)).toBe(20);
    expect(yearlyMonthlyEquivalent(PLANS.starter)).toBe(199);
    expect(yearlyMonthlyEquivalent(PLANS.pro)).toBe(399);
  });

  it("detaylı plan 2, özet plan 1 kredi", () => {
    expect(planCreditCost("summary")).toBe(1);
    expect(planCreditCost(undefined)).toBe(1);
    expect(planCreditCost("detailed")).toBe(2);
    expect(monthlyCreditLimit("free")).toBe(0);
  });

  it("ay sonu taşmasında Postgres gibi davranır (31 Ocak + 1 ay = 28 Şubat)", () => {
    expect(addMonths(new Date("2027-01-31T12:00:00Z"), 1).toISOString()).toBe("2027-02-28T12:00:00.000Z");
    expect(addMonths(new Date("2028-01-31T12:00:00Z"), 1).toISOString()).toBe("2028-02-29T12:00:00.000Z");
  });

  it("pencere, başlangıçtan itibaren ay ay ilerler", () => {
    const w = currentCreditWindow(new Date("2026-06-15T00:00:00Z"), NOW);
    expect(w.start.toISOString()).toBe("2026-09-15T00:00:00.000Z");
    expect(w.resetsAt.toISOString()).toBe("2026-10-15T00:00:00.000Z");
    expect(w.rolledOver).toBe(true);
    expect(currentCreditWindow(new Date("2026-09-20T00:00:00Z"), NOW).rolledOver).toBe(false);
  });
});

describe("mapStripeSubscriptionStatus", () => {
  it.each([
    ["active", "active"],
    ["trialing", "active"],
    ["past_due", "active"],
    ["canceled", "expired"],
    ["unpaid", "expired"],
    ["incomplete_expired", "expired"],
    ["paused", "expired"],
    ["incomplete", null],
  ])("%s → %s", (stripe, expected) => {
    expect(mapStripeSubscriptionStatus(stripe)).toBe(expected);
  });
});
