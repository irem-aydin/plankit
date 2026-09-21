/**
 * Plandan kalıcı kararların çıkarılması.
 *
 * Her plan ayrı ayrı üretildiği için birbirinden habersizdir; ikinci plan
 * birincinin bütçe dağılımını veya tarihlerini bozabilir. Kullanıcı bir planı
 * benimsediğinde buradaki çıkarım, kararları profil hafızasına taşır ve
 * sonraki planlar bu kararlarla tutarlı olur.
 */
import { z } from "zod";
import type { IntakeContext } from "./intake";

export const DECISION_KINDS = ["karar", "rakam", "tarih", "kisit"] as const;
export type DecisionKind = (typeof DECISION_KINDS)[number];

export const DECISION_KIND_LABELS: Record<DecisionKind, string> = {
  karar: "Karar",
  rakam: "Rakam / bütçe",
  tarih: "Tarih / eşik",
  kisit: "Kısıt",
};

export const MAX_DECISIONS = 8;

export const DECISION_EXTRACTION_SYSTEM_PROMPT = `Bir danışmanlık dokümanından, kurumun hafızasında kalması gereken KALICI bilgileri çıkarıyorsun. Amaç: aynı kurum için hazırlanacak sonraki dokümanların bu kararlarla çelişmemesi.

Neyi çıkarırsın:
- Verilen veya önerilen kararlar (ör. "3. şube yatırımı Ekim 2027'ye ertelendi").
- Bağlayıcı rakamlar ve dağılımlar (ör. "8 milyon TL nakdin 3,5 milyon TL'si Yenimahalle programına ayrıldı").
- Kritik tarihler ve karar eşikleri (ör. "31 Mart 2027'de ön kayıt kapasitenin %75'ine ulaşmazsa küçülme senaryosu devreye girer").
- Kabul edilen kısıtlar ve kapsam dışı bırakılanlar.

Neyi çıkarmazsın:
- Genel geçer tavsiyeler, yöntem anlatımları, şablon açıklamaları.
- Dokümanın kendi varsayımları ve açık soruları (bunlar zaten ayrı tutuluyor).
- Kullanıcının zaten profilinde yazan durum bilgileri (şirketin ne iş yaptığı, çalışan sayısı gibi).

Kurallar:
- Her madde tek başına anlaşılır, tek cümle olsun; rakam ve tarihleri içersin.
- Dokümanda geçmeyen bilgi uydurma.
- En fazla ${MAX_DECISIONS} madde; en önemliden başla. Kalıcı bir karar yoksa boş liste döndür.
- Türkçe, sade ve nesnel yaz. Öneri kipini koru: doküman "önerilir" diyorsa "önerildi" yaz, "karar verildi" deme.`;

export const decisionExtractionSchema = z.strictObject({
  decisions: z.array(
    z.strictObject({
      text: z.string().describe("Tek cümlelik, rakam ve tarih içeren kalıcı bilgi"),
      kind: z.string().describe("karar | rakam | tarih | kisit"),
    }),
  ),
});

export type DecisionExtractionResponse = z.infer<typeof decisionExtractionSchema>;

export interface ExtractedDecision {
  text: string;
  kind: DecisionKind;
}

export interface DecisionExtractionRequest {
  /** Dokümanın markdown hâli */
  documentMarkdown: string;
  documentTitle: string;
  /** Profil zaten bunları biliyorsa tekrar önerilmemesi için mevcut hafıza */
  existingMemories: string[];
  context?: IntakeContext;
}

export function buildDecisionExtractionPrompt(request: DecisionExtractionRequest): string {
  const lines: string[] = [];

  if (request.existingMemories.length > 0) {
    lines.push("<hafizada_olanlar>");
    lines.push("Bu bilgiler zaten kayıtlı; aynısını veya çok benzerini tekrar önerme:");
    for (const memory of request.existingMemories.slice(0, 60)) lines.push(`- ${memory}`);
    lines.push("</hafizada_olanlar>", "");
  }

  lines.push(`<dokuman baslik="${request.documentTitle}">`);
  lines.push(request.documentMarkdown.slice(0, 40_000));
  lines.push("</dokuman>", "");
  lines.push(
    "Bu dokümandan, kurumun hafızasında kalması gereken kalıcı kararları, rakamları, tarihleri ve kısıtları çıkar.",
  );

  return lines.join("\n");
}

/** Model yanıtını normalize eder; bilinmeyen tür "karar" sayılır. */
export function normalizeDecisions(response: DecisionExtractionResponse): ExtractedDecision[] {
  const seen = new Set<string>();
  const result: ExtractedDecision[] = [];

  for (const item of response.decisions) {
    const text = item.text.trim();
    const key = text.toLocaleLowerCase("tr-TR");
    if (!text || seen.has(key)) continue;
    seen.add(key);

    const kind = (DECISION_KINDS as readonly string[]).includes(item.kind.trim().toLowerCase())
      ? (item.kind.trim().toLowerCase() as DecisionKind)
      : "karar";
    result.push({ text: text.slice(0, 500), kind });
    if (result.length >= MAX_DECISIONS) break;
  }

  return result;
}

/** Hafızaya yazılacak metin (tür etiketiyle). */
export function decisionToMemory(decision: ExtractedDecision, documentTitle: string): string {
  return `[${DECISION_KIND_LABELS[decision.kind]} — ${documentTitle}] ${decision.text}`.slice(0, 2_000);
}
