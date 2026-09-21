import { describe, expect, it } from "vitest";
import { computeDashboardStats, monthKey } from "@/core/dashboard/stats";

const NOW = new Date("2026-09-21T10:00:00.000Z");
const plan = (createdAt: string, category: string | null, shared = false, shareViews = 0) => ({ createdAt, category, shared, shareViews });

describe("computeDashboardStats", () => {
  const plans = [
    plan("2026-09-20T10:00:00Z", "İş Analizi", true, 7),
    plan("2026-09-02T10:00:00Z", "İş Analizi"),
    plan("2026-08-15T10:00:00Z", "Proje Yönetimi", true, 3),
    plan("2026-03-10T10:00:00Z", "Ürün Yönetimi"),
    plan("2025-01-01T10:00:00Z", null, false, 99),
  ];
  const stats = computeDashboardStats(plans, NOW);

  it("özet sayıları hesaplar; paylaşımı kapalı planın görüntülenmesini saymaz", () => {
    expect(stats).toMatchObject({ total: 5, thisMonth: 2, shared: 2, views: 10 });
  });

  it("alanları çoktan aza sıralar, kategorisizi 'Diğer' sayar", () => {
    expect(stats.byCategory).toEqual([
      { name: "İş Analizi", count: 2 },
      { name: "Diğer", count: 1 },
      { name: "Proje Yönetimi", count: 1 },
      { name: "Ürün Yönetimi", count: 1 },
    ]);
  });

  it("son 6 ayı eskiden yeniye verir, aralık dışını saymaz", () => {
    expect(stats.byMonth.map((m) => m.key)).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
    expect(stats.byMonth.map((m) => m.count)).toEqual([0, 0, 0, 0, 1, 2]);
  });

  it("boş listede sıfırlar döner", () => {
    const empty = computeDashboardStats([], NOW);
    expect(empty).toMatchObject({ total: 0, thisMonth: 0, shared: 0, views: 0, byCategory: [] });
    expect(empty.byMonth).toHaveLength(6);
  });

  it("ay sınırında Türkiye saatini kullanır", () => {
    // 31 Ağustos 22:30 UTC = 1 Eylül 01:30 İstanbul
    expect(monthKey(new Date("2026-08-31T22:30:00Z"))).toBe("2026-09");
  });
});
