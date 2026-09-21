/**
 * Kayıtsız canlı deneme: ziyaretçinin yazdığı durumdan planın kısa bir
 * önizlemesi (başlık, bulgular, ilk adımlar). Tam plan değildir; amacı
 * "ne alacağım?" sorusunu birkaç saniyede cevaplayıp kayda yönlendirmektir.
 */
import { z } from "zod";

export const PREVIEW_MIN_CHARS = 20;
export const PREVIEW_MAX_CHARS = 600;

/** Aynı ziyaretçi (IP özeti) için günlük deneme sayısı. */
export const PREVIEW_PER_VISITOR_DAILY = 3;
/** Tüm site için günlük üst sınır (maliyet tavanı). */
export const PREVIEW_GLOBAL_DAILY = 200;

export const CATEGORY_SLUGS = ["is-analizi", "proje-yonetimi", "urun-yonetimi", "is-gelistirme"] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const CATEGORY_NAMES: Record<CategorySlug, string> = {
  "is-analizi": "İş Analizi",
  "proje-yonetimi": "Proje Yönetimi",
  "urun-yonetimi": "Ürün Yönetimi",
  "is-gelistirme": "İş Geliştirme",
};

export const previewInputSchema = z
  .string()
  .trim()
  .min(PREVIEW_MIN_CHARS, "Biraz daha anlatır mısın? Bir iki cümle yeterli.")
  .max(PREVIEW_MAX_CHARS, `En fazla ${PREVIEW_MAX_CHARS} karakter yazabilirsin.`);

export const PREVIEW_SYSTEM_PROMPT = `Sen deneyimli bir iş ve strateji danışmanısın. Bir ziyaretçi durumunu birkaç cümleyle anlattı. Ona hazırlanacak planın KISA bir önizlemesini çıkar.

Kurallar:
- Türkçe yaz (ziyaretçi başka dilde yazdıysa o dilde).
- Somut ol; ziyaretçinin verdiği bilgilere dayan. Verilmeyen rakam, tarih veya bilgiyi gerçekmiş gibi yazma; tahmin gerekiyorsa "tahmini" de.
- Kısa yaz: summary en fazla 25 kelime; her madde tek cümle ve en fazla 20 kelime.
- keyFindings: tam 3 madde; durumun en önemli tespitleri.
- firstSteps: tam 3 madde; her biri uygulanabilir bir ilk adım ve ne zaman yapılacağı (ör. "Bu hafta", "İlk ay").
- openQuestion: planı netleştirmek için sorulacak en önemli tek soru.
- category: konunun en uygun olduğu alan: is-analizi (işletme sorunları, strateji, durum analizi, süreç iyileştirme), proje-yonetimi (proje planlama, risk, takvim, ekip), urun-yonetimi (dijital ürün, özellik, yol haritası), is-gelistirme (yeni satış kanalı, pazara giriş, ihracat, ortaklık, müşteri kazanımı).
- Yasa dışı, zararlı veya iş planlamayla ilgisiz bir istekse title alanına "Uygun değil" yaz ve diğer alanları boş bırak.`;

export const previewResponseSchema = z.strictObject({
  title: z.string().describe("Planın kısa başlığı (en fazla 8 kelime)"),
  summary: z.string().describe("Durumun ve planın yaklaşımının 1-2 cümlelik özeti"),
  keyFindings: z.array(z.string()),
  firstSteps: z.array(z.strictObject({ step: z.string(), when: z.string() })),
  openQuestion: z.string(),
  category: z.string().describe("is-analizi | proje-yonetimi | urun-yonetimi | is-gelistirme"),
});

export type PreviewResponse = z.infer<typeof previewResponseSchema>;

export interface PlanPreview {
  title: string;
  summary: string;
  keyFindings: string[];
  firstSteps: { step: string; when: string }[];
  openQuestion: string;
  category: CategorySlug;
}

const clip = (s: string, max: number) => {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

/** Model yanıtını güvenli ve öngörülebilir bir biçime getirir; uygunsuz yanıtta null. */
export function normalizePreview(response: PreviewResponse): PlanPreview | null {
  const title = clip(response.title, 90);
  if (!title || /^uygun değil/i.test(title)) return null;
  const keyFindings = response.keyFindings.map((k) => clip(k, 240)).filter(Boolean).slice(0, 3);
  const firstSteps = response.firstSteps
    .map((s) => ({ step: clip(s.step, 200), when: clip(s.when, 40) }))
    .filter((s) => s.step)
    .slice(0, 3);
  if (keyFindings.length === 0 || firstSteps.length === 0) return null;

  const slug = response.category.trim().toLowerCase();
  return {
    title,
    summary: clip(response.summary, 400),
    keyFindings,
    firstSteps,
    openQuestion: clip(response.openQuestion, 240),
    category: (CATEGORY_SLUGS as readonly string[]).includes(slug) ? (slug as CategorySlug) : "is-analizi",
  };
}

/**
 * Önizlemeden sonra ziyaretçiyi tam plana taşıyan adres: seçilen alanın
 * plan formu, yazdığı istek hazır doldurulmuş olarak açılır.
 */
export function continuePath(preview: Pick<PlanPreview, "category">, requestText: string): string {
  return `/olustur/${preview.category}?istek=${encodeURIComponent(requestText.trim().slice(0, PREVIEW_MAX_CHARS))}`;
}
