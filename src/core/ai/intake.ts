/**
 * Kullanıcının kendi durumunu anlattığı bağlam (intake).
 * Kullanıcı üç yoldan birini seçer: kısa sorular, detaylı sorular, serbest metin.
 * İleride API entegrasyonunda bu bağlamı şirketin sistemi doldurabilir.
 */
import { z } from "zod";

export const INTAKE_MODES = ["quick", "detailed", "free"] as const;
export type IntakeMode = (typeof INTAKE_MODES)[number];

/** Üretilecek planın uzunluğu (kullanıcı seçer) */
export const DETAIL_LEVELS = ["summary", "detailed"] as const;
export type DetailLevel = (typeof DETAIL_LEVELS)[number];

export interface IntakeQuestion {
  id: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

const QUICK_QUESTIONS: IntakeQuestion[] = [
  {
    id: "organization",
    label: "Şirketin / projen nedir, ne iş yapıyor?",
    placeholder: "Örn. İstanbul'da 4 şubesi olan bir kahve zinciriyiz, kendi kavurduğumuz kahveyi satıyoruz.",
    multiline: true,
  },
  {
    id: "scale",
    label: "Sektör ve ölçek",
    placeholder: "Örn. Yiyecek-içecek perakende; 45 çalışan, yıllık ~30 milyon TL ciro",
  },
  {
    id: "problem",
    label: "Çözmek istediğin temel sorun veya yakalamak istediğin fırsat nedir?",
    placeholder: "Örn. Hafta içi öğleden sonra satışlar düşük; online sipariş kanalımız yok.",
    multiline: true,
  },
  {
    id: "goal",
    label: "Hedefin ne, ne zamana kadar?",
    placeholder: "Örn. 12 ay içinde toplam cironun %20'sini online kanaldan elde etmek",
    multiline: true,
  },
  {
    id: "constraints",
    label: "Kısıtların neler? (bütçe, ekip, süre, mevzuat…)",
    placeholder: "Örn. En fazla 1,5 milyon TL yatırım; yazılım ekibimiz yok.",
    multiline: true,
  },
];

const DETAILED_EXTRA_QUESTIONS: IntakeQuestion[] = [
  {
    id: "current_state",
    label: "Mevcut durumu anlat: süreçler, kullandığın sistemler, işleyen ve işlemeyen şeyler",
    placeholder: "Örn. Siparişler kasada POS ile alınıyor; stok takibi Excel'de; müdavim oranımız yüksek.",
    multiline: true,
  },
  {
    id: "customers",
    label: "Hedef müşterilerin / kullanıcıların kimler?",
    placeholder: "Örn. 25-40 yaş ofis çalışanları ve üniversite öğrencileri",
    multiline: true,
  },
  {
    id: "competition",
    label: "Rakiplerin kimler, onlardan farkın ne?",
    placeholder: "Örn. Büyük zincirler daha ucuz; bizim farkımız taze kavrum ve samimi ortam.",
    multiline: true,
  },
  {
    id: "stakeholders",
    label: "Kilit paydaşlar ve karar vericiler kimler?",
    placeholder: "Örn. Kurucu ortaklar (2 kişi), şube müdürleri, kavurma tesisi sorumlusu",
    multiline: true,
  },
  {
    id: "team",
    label: "Ekibin ve yetkinliklerin",
    placeholder: "Örn. Güçlü bir operasyon ekibimiz var; dijital pazarlama ve teknoloji bilgimiz zayıf.",
    multiline: true,
  },
  {
    id: "metrics",
    label: "Elindeki önemli rakamlar / metrikler",
    placeholder: "Örn. Günlük ortalama 900 fiş, ortalama sepet 140 TL, Instagram'da 12 bin takipçi",
    multiline: true,
  },
  {
    id: "past_attempts",
    label: "Daha önce ne denedin, sonuç ne oldu?",
    placeholder: "Örn. Bir yemek uygulamasında 3 ay listelendik; komisyon yüzünden kâr etmedik.",
    multiline: true,
  },
  {
    id: "risks",
    label: "Bildiğin riskler veya endişelerin",
    placeholder: "Örn. Kira artışları, kahve çekirdeği fiyatlarındaki dalgalanma",
    multiline: true,
  },
];

export const INTAKE_QUESTIONS: Record<Exclude<IntakeMode, "free">, IntakeQuestion[]> = {
  quick: QUICK_QUESTIONS,
  detailed: [...QUICK_QUESTIONS, ...DETAILED_EXTRA_QUESTIONS],
};

export const FREE_TEXT_HINTS = [
  "Şirketin / projen ne iş yapıyor, ölçeği ne?",
  "Çözmek istediğin sorun veya fırsat",
  "Hedefin ve zaman çizelgen",
  "Bütçe, ekip ve diğer kısıtlar",
  "Rakipler, müşteriler, elindeki rakamlar (varsa)",
];

export const MIN_CONTEXT_CHARS = 40;
const MAX_ANSWER_CHARS = 4_000;
const MAX_FREE_TEXT_CHARS = 12_000;

export const intakeContextSchema = z.object({
  mode: z.enum(INTAKE_MODES),
  detail: z.enum(DETAIL_LEVELS).default("summary"),
  /** Soru-cevaplar (kısa/detaylı modda) veya tek serbest metin girdisi */
  entries: z
    .array(
      z.object({
        question: z.string().max(300),
        answer: z.string().max(MAX_FREE_TEXT_CHARS),
      }),
    )
    .max(60),
  /** Bağlam bir profilden geldiyse (bellek) */
  profile: z.object({ id: z.string(), name: z.string() }).optional(),
});

export type IntakeContext = z.infer<typeof intakeContextSchema>;

/** Form verisinden bağlam oluşturur; yetersizse hata mesajı döner. */
export function buildIntakeContext(
  mode: IntakeMode,
  answers: Record<string, string>,
  detail: DetailLevel = "summary",
): { ok: true; context: IntakeContext } | { ok: false; error: string } {
  const entries =
    mode === "free"
      ? [{ question: "Kullanıcının kendi anlatımı", answer: (answers.free ?? "").trim().slice(0, MAX_FREE_TEXT_CHARS) }]
      : INTAKE_QUESTIONS[mode].map((q) => ({
          question: q.label,
          answer: (answers[q.id] ?? "").trim().slice(0, MAX_ANSWER_CHARS),
        }));

  const filled = entries.filter((e) => e.answer.length > 0);
  const totalChars = filled.reduce((n, e) => n + e.answer.length, 0);

  if (totalChars < MIN_CONTEXT_CHARS) {
    return {
      ok: false,
      error: "Sana özel bir plan hazırlayabilmemiz için durumunu biraz daha anlatır mısın? (En az birkaç cümle)",
    };
  }

  return { ok: true, context: { mode, detail, entries: filled } };
}
