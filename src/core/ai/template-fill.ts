/**
 * Şablon doldurma: yapay zekâya verilecek talimatlar, beklenen yanıt şeması ve
 * yanıtın şablona uygulanması. Sağlayıcıdan bağımsız, saf fonksiyonlar.
 */
import { z } from "zod";
import type { TemplateInstance } from "../output/document";
import { attachmentsPromptNote } from "./attachments";
import type { DetailLevel } from "./intake";
import type { PersonalizationRequest } from "./personalizer";

export const TEMPLATE_FILL_SYSTEM_PROMPT = `Sen iş analizi, strateji, proje ve ürün yönetimi alanlarında 20 yıllık deneyime sahip kıdemli bir yönetim danışmanısın. Görevin, kullanıcının anlattığı gerçek durumdan yola çıkarak verilen profesyonel şablonu, doğrudan uygulanabilir bir çalışma dokümanı olarak doldurmak.

İçerik:
- Genel geçer tavsiyeler değil, kullanıcının sektörüne, ölçeğine, hedefine ve kısıtlarına özgü, somut içerik üret. Kullanıcının verdiği rakamları, isimleri ve detayları kullan.
- Öneri ve aksiyonlar net olsun: ne yapılacak, neden, kim sorumlu (rol olarak), hangi zaman diliminde, başarı nasıl ölçülecek.
- Kısıtlara (bütçe, ekip, süre, sezon) uymayan öneriler yapma. Bir öneri kısıtı zorluyorsa bunu açıkça belirt.
- "keyFindings": karar vericinin dokümanı okumadan bilmesi gereken en kritik 3 bulgu veya öneri. Her biri tek, net cümle.

Doğruluk kuralları:
- Birimleri karıştırma. Ciro/gelir payı, kâr marjı, miktar (ton, adet, litre), kapasite ve kişi sayısı farklı büyüklüklerdir; bir oranı başka bir birime çevirmen gerekiyorsa (ör. ciro payından tonaja) bunu yalnızca fiyat farkı gibi gerekli bilgi varsa yap, hesabı kısaca göster ve varsayımı "assumptions" listesine yaz. Bilgi yoksa çevirme.
- Mevzuat, belge, sertifika ve izinlerde yasal olarak zorunlu olanı, müşteri/pazar tarafından beklenen veya önerilen olandan açıkça ayır (ör. "zorunlu:", "alıcılar genellikle ister:", "önerilen:"). Emin olmadığın mevzuat detayını kesin bilgi gibi yazma; "ilgili kurumdan teyit edilmeli" diye belirt.
- Kullanıcının vermediği bilgiyi gerçekmiş gibi sunma. Makul bir varsayım yapman gerekiyorsa içeriği yine doldur, ama varsayımı "assumptions" listesine yaz. Sonucu önemli ölçüde değiştirecek eksik bilgileri "openQuestions" listesine, kullanıcının kolayca cevaplayabileceği net sorular olarak ekle.
- Tahmini maliyet, süre ve oranları her zaman "tahmini" diye işaretle ve nasıl doğrulanacağını belirt (ör. "tahmini 400-800 bin TL; en az 2 tekliften doğrulanmalı").
- Tarihleri bugünün tarihine göre gerçekçi ve birbiriyle tutarlı ver.
- Kullanıcının daha önce aldığı kararlar (bütçe dağılımı, tarihler, karar eşikleri, kapsam dışı bırakılanlar) bağlayıcıdır: içeriğin bunlarla çelişmesin. Yeni bilgiler bir kararı geçersiz kılıyorsa, çelişkiyi sessizce geçme; neyin neden değişmesi gerektiğini açıkça yaz.
- Özel isimleri (şirket, marka, şube, yer ve kişi adları) kullanıcının yazdığı gibi harfi harfine kullan; harflerini değiştirme veya kısaltma.

Biçim:
- Seçenek listesi olan alanlarda yalnızca listedeki değerlerden birini kullan.
- Metin alanlarında kısa paragraflar ve gerektiğinde madde işaretleri ("- ") kullan. Markdown başlığı, kalın yazı veya tablo sözdizimi kullanma.
- Aynı bilgiyi bölümler arasında tekrarlama.
- Tüm içeriği profesyonel, açık, akıcı ve yazım hatası olmayan Türkçe ile yaz.

Yanıtı vermeden önce son kontrol yap: hesaplar ve birimler doğru mu, tarihler tutarlı mı, aynı rol her yerde aynı adla mı geçiyor, yazım ve imla hatası var mı, tahminler işaretli mi? Hatayı düzelterek yanıtla.`;

const DETAIL_GUIDANCE: Record<DetailLevel, string> = {
  summary:
    "Plan uzunluğu: ÖZET. Kullanıcı hızlı okunup hemen uygulanabilecek kısa bir plan istiyor. Yalnızca en önemli maddelere odaklan: tabloların çoğunda 3-5 satır, aksiyon planı gibi uygulama tablolarında 5-8 satır. Metin alanları 1-3 cümle veya en fazla 4 madde. assumptions ve openQuestions en fazla 5'er madde.",
  detailed:
    "Plan uzunluğu: DETAYLI. Kullanıcı kapsamlı bir çalışma dokümanı istiyor. Tabloların çoğunda 5-8 satır, aksiyon planı gibi uygulama tablolarında 10-14 satır. Metin alanları 3-6 cümle veya madde; gerekçeleri ve hesapları göster. assumptions ve openQuestions en fazla 8'er madde.",
};

/** Şablonu (ve güncelleme modunda mevcut planı) modele okunabilir biçimde anlatır. */
export function buildTemplateFillPrompt(request: PersonalizationRequest): string {
  const lines: string[] = [];
  const revising = Boolean(request.revision);

  lines.push(`Bugünün tarihi: ${request.today}`);
  lines.push("");
  lines.push("<kullanici_durumu>");
  for (const entry of request.context.entries) {
    lines.push(`Soru: ${entry.question}`);
    lines.push(`Cevap: ${entry.answer}`);
    lines.push("");
  }
  lines.push("</kullanici_durumu>");
  lines.push("");

  if (request.attachments?.length) lines.push(attachmentsPromptNote(request.attachments));

  if (request.revision) {
    lines.push("<yeni_bilgiler>");
    lines.push("Kullanıcı önceki planda sorulan açık sorulara şu cevapları verdi:");
    for (const qa of request.revision.answers) {
      lines.push(`Soru: ${qa.question}`);
      lines.push(`Cevap: ${qa.answer}`);
      lines.push("");
    }
    lines.push("</yeni_bilgiler>");
    lines.push("");
    if (request.revision.previousAssumptions.length > 0) {
      lines.push("Önceki plandaki varsayımlar:");
      for (const a of request.revision.previousAssumptions) lines.push(`- ${a}`);
      lines.push("");
    }
  }

  if (request.relatedTopics.length > 0) {
    lines.push(
      `Kullanıcı aynı dokümanda şu başlıkları da hazırlatıyor; içeriğin bunlarla çelişmesin: ${request.relatedTopics.join(", ")}.`,
    );
    lines.push("");
  }

  lines.push(DETAIL_GUIDANCE[request.context.detail]);
  lines.push("");

  lines.push(`<sablon kategori="${request.categoryName}" baslik="${request.subcategoryName}">`);
  if (request.template.summary) lines.push(`Şablonun amacı: ${request.template.summary}`);

  for (const section of request.template.sections) {
    lines.push("");
    lines.push(`## Bölüm [${section.id}] ${section.title}`);
    if (section.description) lines.push(`Yönerge: ${section.description}`);

    for (const field of section.fields) {
      const extras = [
        field.help && `ipucu: ${field.help}`,
        !revising && field.placeholder && `örnek: ${field.placeholder}`,
        field.options?.length && `seçenekler: ${field.options.join(" | ")}`,
      ].filter(Boolean);
      lines.push(`- Alan [${field.id}] ${field.label}${extras.length ? ` (${extras.join("; ")})` : ""}`);
      if (revising) lines.push(`  Mevcut içerik: ${field.value.trim() ? JSON.stringify(field.value) : "(boş)"}`);
    }

    if (section.table) {
      lines.push("- Tablo sütunları (satırlardaki değer sırası):");
      for (const [index, column] of section.table.columns.entries()) {
        const extras = [
          column.help && `ipucu: ${column.help}`,
          column.options?.length && `seçenekler: ${column.options.join(" | ")}`,
        ].filter(Boolean);
        lines.push(`  ${index + 1}. [${column.id}] ${column.label}${extras.length ? ` (${extras.join("; ")})` : ""}`);
      }
      if (revising) {
        const current = section.table.rows.filter((r) => Object.values(r).some((v) => v.trim()));
        lines.push(`  Mevcut satırlar (${current.length}):`);
        for (const row of current) {
          lines.push(`  ${JSON.stringify(section.table.columns.map((c) => row[c.id] ?? ""))}`);
        }
      } else {
        for (const example of section.table.exampleRows) {
          const cells = section.table.columns.map((c) => example[c.id] ?? "");
          lines.push(`  - Biçim örneği (başka bir şirketten, kopyalama): ${JSON.stringify(cells)}`);
        }
      }
    }
  }
  lines.push("</sablon>");
  lines.push("");

  const format = [
    "Yanıt biçimi:",
    "- sections: her bölüm için bir öğe; id = bölüm kimliği.",
    "- fields: o bölümdeki her alan için { id: alan kimliği, value: içerik }. Alanı olmayan bölümde boş dizi.",
    "- rows: o bölümdeki tablonun satırları; her satır, sütun değerlerini yukarıdaki sütun sırasıyla içeren bir metin dizisi. Tablosu olmayan bölümde boş dizi.",
    "- keyFindings: en kritik 3 bulgu/öneri.",
  ];

  if (revising) {
    lines.push(
      "Görev: Mevcut planı yeni bilgilere göre GÜNCELLE. Mevcut içerik kullanıcının düzenlemelerini içerebilir; yeni bilgilerle çelişmeyen ve hâlâ geçerli olan içeriği koru. Yeni bilgilerin etkilediği hesapları, önerileri, aksiyonları ve riskleri revize et. Artık geçersiz olan varsayımları çıkar; cevaplanan soruları openQuestions'a tekrar ekleme (yeni bilgiler yeni ve önemli bir soru doğuruyorsa ekleyebilirsin). Tüm bölümleri eksiksiz döndür.",
    );
  } else {
    lines.push("Görev: Şablonun tüm bölümlerini bu kullanıcının durumuna göre doldur.");
  }
  lines.push(format.join("\n"));

  return lines.join("\n");
}

export function normalizeOption(value: string, options: string[] | undefined): string {
  if (!options || options.length === 0) return value;
  const clean = value.trim().toLocaleLowerCase("tr-TR");
  if (!clean) return "";
  return (
    options.find((o) => o.toLocaleLowerCase("tr-TR") === clean) ??
    options.find(
      (o) => o.toLocaleLowerCase("tr-TR").startsWith(clean) || clean.startsWith(o.toLocaleLowerCase("tr-TR")),
    ) ??
    ""
  );
}

/**
 * Yanıt şeması bilinçli olarak şablondan bağımsız ve küçüktür: şablona özel
 * (her alan/sütun için ayrı anahtarlı) bir şema, büyük şablonlarda API'nin
 * "compiled grammar is too large" sınırına takılır. Yapı talimatta anlatılır,
 * yanıt applyTemplateFill içinde şablona göre eşlenir ve doğrulanır.
 */
export const templateFillSchema = z.strictObject({
  sections: z.array(
    z.strictObject({
      id: z.string().describe("Bölüm kimliği (köşeli parantez içindeki)"),
      fields: z.array(z.strictObject({ id: z.string(), value: z.string() })),
      rows: z
        .array(z.array(z.string()))
        .describe("Tablo satırları; her satır, sütunları talimattaki sırayla içeren metin dizisi"),
    }),
  ),
  keyFindings: z.array(z.string()),
  assumptions: z.array(z.string()),
  openQuestions: z.array(z.string()),
});

export type TemplateFillResponse = z.infer<typeof templateFillSchema>;

/** Model yanıtını şablona uygular; şablonda olmayan kimlikleri yok sayar. */
export function applyTemplateFill(
  template: TemplateInstance,
  response: TemplateFillResponse,
): TemplateInstance {
  const byId = new Map(response.sections.map((s) => [s.id.trim(), s]));

  return {
    ...template,
    sections: template.sections.map((section) => {
      const filled = byId.get(section.id);
      if (!filled) return section;

      const values = new Map(filled.fields.map((f) => [f.id.trim(), f.value]));
      const columns = section.table?.columns ?? [];
      const rows = filled.rows
        .map((cells) =>
          Object.fromEntries(columns.map((c, i) => [c.id, normalizeOption(cells[i] ?? "", c.options)])),
        )
        .filter((row) => Object.values(row).some((v) => v.trim() !== ""));

      return {
        ...section,
        fields: section.fields.map((field) => ({
          ...field,
          value: values.has(field.id) ? normalizeOption(values.get(field.id)!, field.options) : field.value,
        })),
        table: section.table && {
          ...section.table,
          rows: rows.length > 0 ? rows : section.table.rows,
        },
      };
    }),
  };
}
