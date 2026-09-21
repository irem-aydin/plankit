/**
 * Panel istatistikleri (saf fonksiyon): plan listesinden özet sayılar,
 * alanlara göre dağılım ve son aylardaki etkinlik.
 */

export interface PlanSummaryForStats {
  createdAt: string;
  category: string | null;
  shared: boolean;
  shareViews: number;
}

export interface DashboardStats {
  total: number;
  thisMonth: number;
  shared: number;
  views: number;
  byCategory: { name: string; count: number }[];
  /** Eskiden yeniye, son `months` ay */
  byMonth: { key: string; label: string; count: number }[];
}

const monthLabel = new Intl.DateTimeFormat("tr-TR", { month: "short", timeZone: "Europe/Istanbul" });
const monthKeyFormat = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Europe/Istanbul" });

/** "2026-09" (Türkiye saatine göre) */
export function monthKey(date: Date): string {
  return monthKeyFormat.format(date).slice(0, 7);
}

export function computeDashboardStats(plans: PlanSummaryForStats[], now: Date = new Date(), months = 6): DashboardStats {
  const currentKey = monthKey(now);

  const categoryCounts = new Map<string, number>();
  for (const p of plans) {
    const name = p.category ?? "Diğer";
    categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }

  const byMonth: DashboardStats["byMonth"] = [];
  for (let i = months - 1; i >= 0; i--) {
    // Ayın ortası: saat dilimi farkı ay sınırını kaydırmasın.
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 15));
    byMonth.push({ key: monthKey(d), label: monthLabel.format(d), count: 0 });
  }
  for (const p of plans) {
    const bucket = byMonth.find((m) => m.key === monthKey(new Date(p.createdAt)));
    if (bucket) bucket.count += 1;
  }

  return {
    total: plans.length,
    thisMonth: plans.filter((p) => monthKey(new Date(p.createdAt)) === currentKey).length,
    shared: plans.filter((p) => p.shared).length,
    views: plans.reduce((n, p) => n + (p.shared ? p.shareViews : 0), 0),
    byCategory: [...categoryCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr")),
    byMonth,
  };
}
