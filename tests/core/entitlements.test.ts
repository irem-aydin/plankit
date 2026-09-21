import { describe, expect, it } from "vitest";
import { getEntitlement, mapStripeSubscriptionStatus, TRIAL_GENERATION_LIMIT } from "@/core/billing/entitlements";

describe("getEntitlement", () => {
  it("yeni deneme kullanıcısının tüm hakları var", () => {
    expect(getEntitlement({ subscriptionStatus: "trial", trialLimitUsed: 0 })).toEqual({
      canGenerate: true,
      unlimited: false,
      remainingTrial: TRIAL_GENERATION_LIMIT,
    });
  });

  it("hakkını bitiren deneme kullanıcısı üretemez", () => {
    const e = getEntitlement({ subscriptionStatus: "trial", trialLimitUsed: TRIAL_GENERATION_LIMIT });
    expect(e.canGenerate).toBe(false);
    expect(e.remainingTrial).toBe(0);
  });

  it("kalan hak hiçbir zaman eksiye düşmez", () => {
    expect(getEntitlement({ subscriptionStatus: "trial", trialLimitUsed: 99 }).remainingTrial).toBe(0);
  });

  it("süresi dolan hesap üretemez", () => {
    expect(getEntitlement({ subscriptionStatus: "expired", trialLimitUsed: 0 }).canGenerate).toBe(false);
  });

  it("aktif abonelik sınırsızdır", () => {
    expect(getEntitlement({ subscriptionStatus: "active", trialLimitUsed: 3 })).toEqual({
      canGenerate: true,
      unlimited: true,
      remainingTrial: null,
    });
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
