/**
 * Bağlam profilleri (bellek): kullanıcının tekrar tekrar anlatmak zorunda
 * kalmaması için saklanan iş veya kişisel bağlam. Saf fonksiyonlar.
 */
import { z } from "zod";
import type { IntakeContext } from "../ai/intake";

export const PROFILE_KINDS = ["work", "personal"] as const;
export type ProfileKind = (typeof PROFILE_KINDS)[number];

export const MAX_PROFILES_PER_USER = 10;
export const MAX_MEMORIES_PER_PROFILE = 100;
export const MAX_MEMORY_CHARS = 2_000;

export interface ProfileField {
  id: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

export const PROFILE_KIND_META: Record<ProfileKind, { label: string; description: string; icon: string }> = {
  work: {
    label: "İş / şirket",
    description: "Çalıştığın veya sahibi olduğun işletme, kurum ya da proje",
    icon: "🏢",
  },
  personal: {
    label: "Kişisel",
    description: "Kendi kariyerin, girişim fikrin veya kişisel hedeflerin",
    icon: "👤",
  },
};

export const PROFILE_FIELDS: Record<ProfileKind, ProfileField[]> = {
  work: [
    { id: "organization", label: "Şirket / kurum adı", placeholder: "Örn. Ege Zeytincilik Ltd." },
    { id: "sector", label: "Sektör", placeholder: "Örn. Gıda üretimi / zeytinyağı" },
    { id: "location", label: "Konum / pazar", placeholder: "Örn. Ayvalık merkezli; Türkiye geneli ve Almanya'ya satış" },
    { id: "size", label: "Ölçek", placeholder: "Örn. 14 çalışan, yıllık ~45 milyon TL ciro" },
    {
      id: "business",
      label: "Ne iş yapıyor? (ürün / hizmet, müşteriler)",
      placeholder: "Örn. Kendi zeytinliğimizden sızma zeytinyağı üretiyoruz; toptancılara ve yerel marketlere satıyoruz.",
      multiline: true,
    },
    { id: "role", label: "Buradaki rolün", placeholder: "Örn. Genel koordinatör / kurucu ortak" },
    {
      id: "goals",
      label: "Güncel hedefler ve öncelikler",
      placeholder: "Örn. Markalı ürün satışını artırmak, ihracata başlamak",
      multiline: true,
    },
    {
      id: "constraints",
      label: "Kısıtlar (bütçe, ekip, sezon, mevzuat…)",
      placeholder: "Örn. Ekim-Ocak harman dönemi; dış ticaret bilen personel yok",
      multiline: true,
    },
    { id: "notes", label: "Diğer önemli bilgiler", placeholder: "Rakipler, kullanılan sistemler, önemli rakamlar…", multiline: true },
  ],
  personal: [
    { id: "occupation", label: "Mesleğin / uzmanlığın", placeholder: "Örn. İş analisti, 5 yıl bankacılık deneyimi" },
    { id: "situation", label: "Şu anki durumun", placeholder: "Örn. Bir bankada çalışıyorum, ürün yönetimine geçmek istiyorum", multiline: true },
    { id: "skills", label: "Güçlü yönlerin ve yetkinliklerin", placeholder: "Örn. SQL, süreç modelleme, paydaş yönetimi", multiline: true },
    { id: "goals", label: "Hedeflerin", placeholder: "Örn. 12 ay içinde ürün yöneticisi olarak işe başlamak", multiline: true },
    { id: "constraints", label: "Kısıtların (zaman, bütçe, konum…)", placeholder: "Örn. Haftada 8 saat ayırabiliyorum; İstanbul'da kalmak istiyorum", multiline: true },
    { id: "notes", label: "Diğer önemli bilgiler", placeholder: "İlgi alanların, yan projelerin…", multiline: true },
  ],
};

export const profileInputSchema = z.object({
  name: z.string().trim().min(1, "Profile bir isim verin.").max(80, "İsim en fazla 80 karakter olabilir."),
  kind: z.enum(PROFILE_KINDS),
  details: z.record(z.string(), z.string().max(2_000, "Bir alan en fazla 2000 karakter olabilir.")),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

export interface ContextProfile {
  id: string;
  name: string;
  kind: ProfileKind;
  details: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileMemory {
  id: string;
  profileId: string;
  content: string;
  source: "manual" | "plan_answer" | "decision";
  createdAt: string;
}

/** Yalnızca tanımlı alanları, kırpılmış olarak tutar. */
export function sanitizeProfileDetails(kind: ProfileKind, details: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    PROFILE_FIELDS[kind]
      .map((f) => [f.id, (details[f.id] ?? "").trim()] as const)
      .filter(([, v]) => v.length > 0),
  );
}

/** Profilin ne kadar dolu olduğu (0-1) */
export function profileCompleteness(profile: Pick<ContextProfile, "kind" | "details">): number {
  const fields = PROFILE_FIELDS[profile.kind];
  return fields.filter((f) => (profile.details[f.id] ?? "").trim()).length / fields.length;
}

/** Profil + hafızayı yapay zekâ bağlamı girdilerine çevirir. */
export function profileToContextEntries(
  profile: Pick<ContextProfile, "name" | "kind" | "details">,
  memories: Pick<ProfileMemory, "content">[],
): IntakeContext["entries"] {
  const entries: IntakeContext["entries"] = [
    {
      question: "Profil türü",
      answer: `${PROFILE_KIND_META[profile.kind].label} — "${profile.name}"${
        profile.kind === "personal" ? " (kullanıcı bu planı kendisi için hazırlatıyor)" : ""
      }`,
    },
  ];

  for (const field of PROFILE_FIELDS[profile.kind]) {
    const value = (profile.details[field.id] ?? "").trim();
    if (value) entries.push({ question: field.label, answer: value });
  }

  if (memories.length > 0) {
    entries.push({
      question: "Önceki planlarda alınan kararlar ve hatırlanan bilgiler (bağlayıcıdır)",
      answer: memories.map((m) => `- ${m.content}`).join("\n").slice(0, 10_000),
    });
  }

  return entries;
}

/** Tek seferlik "kısa sorular" cevaplarından iş profili taslağı çıkarır. */
export function profileDetailsFromQuickAnswers(answers: Record<string, string>): Record<string, string> {
  return sanitizeProfileDetails("work", {
    business: answers.organization ?? "",
    size: answers.scale ?? "",
    goals: answers.goal ?? "",
    constraints: answers.constraints ?? "",
    notes: answers.problem ? `Öne çıkan sorun / fırsat: ${answers.problem}` : "",
  });
}

/** Açık soru cevabını hafıza kaydına çevirir. */
export function memoryFromAnswer(question: string, answer: string): string {
  return `${question.trim()} → ${answer.trim()}`.slice(0, MAX_MEMORY_CHARS);
}
