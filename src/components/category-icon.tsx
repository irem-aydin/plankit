import { BarChart3, Briefcase, CalendarCheck, Handshake, Package, type LucideIcon } from "lucide-react";

const RULES: { pattern: RegExp; Icon: LucideIcon; tone: string }[] = [
  { pattern: /analiz/i, Icon: BarChart3, tone: "bg-rose-50 text-rose-600 ring-rose-100" },
  { pattern: /proje/i, Icon: CalendarCheck, tone: "bg-sky-50 text-sky-600 ring-sky-100" },
  { pattern: /ürün|urun|product/i, Icon: Package, tone: "bg-pink-50 text-pink-600 ring-pink-100" },
  { pattern: /geliştirme|gelistirme|business|satış/i, Icon: Handshake, tone: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
];

/** Kategori adına göre ikon ve renk (katalog adları değişse de makul bir ikon döner). */
export function categoryVisual(name: string | null | undefined): { Icon: LucideIcon; tone: string } {
  const rule = RULES.find((r) => r.pattern.test(name ?? ""));
  return rule ?? { Icon: Briefcase, tone: "bg-slate-100 text-slate-600 ring-slate-200" };
}

export function CategoryIcon({ name, size = "md" }: { name: string | null | undefined; size?: "sm" | "md" | "lg" }) {
  const { Icon, tone } = categoryVisual(name);
  const box = size === "lg" ? "size-11 rounded-xl" : size === "sm" ? "size-8 rounded-lg" : "size-9 rounded-lg";
  const icon = size === "lg" ? "size-5" : "size-4";
  return (
    <span className={`flex shrink-0 items-center justify-center ring-1 ring-inset ${box} ${tone}`} aria-hidden>
      <Icon className={icon} />
    </span>
  );
}
