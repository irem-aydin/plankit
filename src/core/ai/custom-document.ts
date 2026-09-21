/**
 * Şablonu yapay zekânın tasarladığı çıktılar.
 *
 * İki durumda kullanılır:
 *  1) Kullanıcı kategori içinde serbest bir istek yazar ("bayi sözleşmesi
 *     değerlendirme çerçevesi istiyorum") — listede böyle bir alt başlık yoktur.
 *  2) Seçilen alt başlığın elle hazırlanmış içeriği henüz yoktur; yapay zekâ
 *     alt başlığın adı ve açıklamasından uygun çerçeveyi kurar.
 *
 * Elle hazırlanmış bir şablon varsa her zaman o kullanılır (template-fill.ts).
 */
import { z } from "zod";
import type { TemplateInstance } from "../output/document";
import { attachmentsPromptNote, type Attachment } from "./attachments";
import type { DetailLevel, IntakeContext } from "./intake";

export const CUSTOM_DESIGN_SYSTEM_PROMPT = `Sen iş analizi, strateji, proje ve ürün yönetimi alanlarında 20 yıllık deneyime sahip kıdemli bir yönetim danışmanısın. Bu görevde iki iş birden yapıyorsun: önce konuya en uygun profesyonel çalışma dokümanının yapısını tasarlıyorsun, sonra onu kullanıcının gerçek durumuna göre dolduruyorsun.

Yapı tasarımı:
- Konunun alanında yerleşik çerçeveleri temel al (ör. BABOK, PMBOK, modern ürün yönetimi, satış/iş geliştirme pratikleri) ve bunu bölüm başlıklarına yansıt.
- 5-9 bölüm kur. Tipik akış: kapsam/bağlam → mevcut durum analizi → değerlendirme veya karşılaştırma → öneri/karar → uygulama adımları → riskler → takip.
- Karşılaştırma, liste, matris veya plan gerektiren yerlerde tablo kullan (3-6 sütun). Anlatım, gerekçe ve karar gerektiren yerlerde metin alanı kullan.
- Son bölüm her zaman somut, sahipli ve tarihli uygulama adımları içersin.
- Bölüm ve sütun başlıkları kısa, profesyonel ve Türkçe olsun. Şablonun jenerik değil, bu konuya özgü olması gerekir.

İçerik:
- Genel geçer tavsiyeler değil, kullanıcının sektörüne, ölçeğine, hedefine ve kısıtlarına özgü, somut içerik üret. Kullanıcının verdiği rakamları, isimleri ve detayları kullan.
- Öneri ve aksiyonlar net olsun: ne yapılacak, neden, kim sorumlu (rol olarak), hangi zaman diliminde, başarı nasıl ölçülecek.
- Kısıtlara (bütçe, ekip, süre, sezon) uymayan öneriler yapma. Bir öneri kısıtı zorluyorsa bunu açıkça belirt.
- "keyFindings": karar vericinin dokümanı okumadan bilmesi gereken en kritik 3 bulgu veya öneri.

Doğruluk kuralları:
- Birimleri karıştırma (ciro payı, marj, miktar, kapasite, kişi sayısı farklı büyüklüklerdir). Bir oranı başka bir birime çeviriyorsan hesabı kısaca göster ve varsayımı "assumptions" listesine yaz.
- Mevzuat, belge ve sertifikalarda yasal olarak zorunlu olanı, pazarın beklediği veya önerilenden açıkça ayır; emin olmadığın detay için "ilgili kurumdan teyit edilmeli" de.
- Kullanıcının vermediği bilgiyi gerçekmiş gibi sunma; yaptığın varsayımları "assumptions", eksik kritik bilgileri "openQuestions" listesine yaz.
- Tahmini maliyet, süre ve oranları "tahmini" diye işaretle ve nasıl doğrulanacağını belirt.
- Özel isimleri (şirket, marka, şube, yer, kişi) kullanıcının yazdığı gibi harfi harfine kullan.
- Tarihleri bugünün tarihine göre gerçekçi ve tutarlı ver.
- Kullanıcının daha önce aldığı kararlar (bütçe dağılımı, tarihler, karar eşikleri, kapsam dışı bırakılanlar) bağlayıcıdır: içeriğin bunlarla çelişmesin. Yeni bilgiler bir kararı geçersiz kılıyorsa, çelişkiyi sessizce geçme; neyin neden değişmesi gerektiğini açıkça yaz.

Biçim:
- Metin alanlarında kısa paragraflar ve gerektiğinde madde işaretleri ("- ") kullan. Markdown başlığı, kalın yazı veya tablo sözdizimi kullanma.
- Tablo satırları sütun sayısıyla birebir aynı uzunlukta olsun.
- Çıktının dili sana ayrıca bildirilir; bölüm başlıkları, sütun adları ve tüm içerik o dilde olmalıdır. Kullanıcının anlatımı başka bir dilde olsa bile çıktı istenen dilde yazılır; özel isimler korunur.

Yanıtı vermeden önce son kontrol yap: yapı konuya uygun mu, hesaplar ve birimler doğru mu, tarihler tutarlı mı, yazım hatası var mı, tahminler işaretli mi?`;

const DETAIL_GUIDANCE: Record<DetailLevel, string> = {
  summary:
    "Plan uzunluğu: ÖZET. 5-6 bölüm; tabloların çoğunda 3-5 satır, uygulama tablosunda 5-8 satır. Metin alanları 1-3 cümle veya en fazla 4 madde. assumptions ve openQuestions en fazla 5'er madde.",
  detailed:
    "Plan uzunluğu: DETAYLI. 7-9 bölüm; tabloların çoğunda 5-8 satır, uygulama tablosunda 10-14 satır. Metin alanları 3-6 cümle veya madde; gerekçeleri ve hesapları göster. assumptions ve openQuestions en fazla 8'er madde.",
};

export interface CustomDocumentRequest {
  /** Kullanıcının kendi cümlesi ya da alt başlığın adı */
  topic: string;
  /** Alt başlıktan geliyorsa açıklaması */
  topicDescription?: string;
  categoryName: string;
  /** Aynı dokümandaki diğer başlıklar */
  relatedTopics: string[];
  context: IntakeContext;
  today: string;
  attachments?: Attachment[];
}

export const customDocumentSchema = z.strictObject({
  title: z.string().describe("Dokümanın kısa başlığı (ör. 'Bayi Sözleşmesi Değerlendirme Çerçevesi')"),
  summary: z.string().describe("Bu dokümanın ne işe yaradığını anlatan 1-2 cümle"),
  sections: z.array(
    z.strictObject({
      title: z.string(),
      description: z.string().describe("Bölümün nasıl kullanılacağını anlatan kısa yönerge"),
      fields: z.array(z.strictObject({ label: z.string(), value: z.string() })),
      tableColumns: z.array(z.string()).describe("Tablo yoksa boş dizi"),
      tableRows: z.array(z.array(z.string())).describe("Her satır tableColumns ile aynı uzunlukta"),
    }),
  ),
  keyFindings: z.array(z.string()),
  assumptions: z.array(z.string()),
  openQuestions: z.array(z.string()),
});

export type CustomDocumentResponse = z.infer<typeof customDocumentSchema>;

export function buildCustomDocumentPrompt(request: CustomDocumentRequest): string {
  const lines: string[] = [`Bugünün tarihi: ${request.today}`, ""];

  lines.push("<kullanici_durumu>");
  for (const entry of request.context.entries) {
    lines.push(`Soru: ${entry.question}`);
    lines.push(`Cevap: ${entry.answer}`);
    lines.push("");
  }
  lines.push("</kullanici_durumu>", "");

  if (request.attachments?.length) lines.push(attachmentsPromptNote(request.attachments));

  lines.push(`<istek kategori="${request.categoryName}">`);
  lines.push(`Konu: ${request.topic}`);
  if (request.topicDescription) lines.push(`Konunun kapsamı: ${request.topicDescription}`);
  lines.push("</istek>", "");

  if (request.relatedTopics.length > 0) {
    lines.push(
      `Kullanıcı aynı dokümanda şu başlıkları da hazırlatıyor; içeriğin bunlarla çelişmesin ve tekrar etmesin: ${request.relatedTopics.join(", ")}.`,
      "",
    );
  }

  lines.push(DETAIL_GUIDANCE[request.context.detail], "");
  lines.push(
    request.context.language === "en"
      ? "Çıktı dili: İNGİLİZCE. Bölüm başlıkları, sütun adları, yönergeler ve içeriğin tamamı İngilizce olmalıdır."
      : "Çıktı dili: TÜRKÇE.",
    "",
  );
  lines.push(
    [
      `Görev: "${request.topic}" konusu için ${request.categoryName} alanına uygun profesyonel bir çalışma dokümanının yapısını tasarla ve bu kullanıcının durumuna göre doldur.`,
      "Yanıt biçimi:",
      "- sections: her bölüm için { title, description, fields, tableColumns, tableRows }.",
      "- fields: bölümdeki metin alanları; her biri { label: alan başlığı, value: doldurulmuş içerik }. Alan yoksa boş dizi.",
      "- tableColumns / tableRows: bölümde tablo varsa sütun başlıkları ve satırlar; tablo yoksa ikisi de boş dizi.",
      "- keyFindings, assumptions, openQuestions listeleri.",
    ].join("\n"),
  );

  return lines.join("\n");
}

/** Yapay zekânın tasarladığı dokümanı düzenlenebilir şablon örneğine çevirir. */
export function customResponseToTemplate(response: CustomDocumentResponse): TemplateInstance {
  return {
    kind: "template",
    summary: response.summary,
    sections: response.sections.map((section, si) => {
      const columns = section.tableColumns.map((label, ci) => ({ id: `c${ci}`, label, type: "text" as const }));
      return {
        id: `s${si}`,
        title: section.title,
        description: section.description || undefined,
        fields: section.fields.map((field, fi) => ({
          id: `s${si}f${fi}`,
          label: field.label,
          type: (field.value.length > 120 || field.value.includes("\n") ? "textarea" : "text") as "text" | "textarea",
          value: field.value,
        })),
        table:
          columns.length > 0
            ? {
                columns,
                exampleRows: [],
                rows: section.tableRows
                  .map((cells) => Object.fromEntries(columns.map((c, ci) => [c.id, cells[ci] ?? ""])))
                  .filter((row) => Object.values(row).some((v) => v.trim() !== "")),
              }
            : undefined,
      };
    }),
  };
}

export const MAX_CUSTOM_REQUEST_CHARS = 500;

export const customRequestSchema = z
  .string()
  .trim()
  .min(10, "Ne oluşturmak istediğini birkaç kelimeyle daha anlat.")
  .max(MAX_CUSTOM_REQUEST_CHARS);
