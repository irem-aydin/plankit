/**
 * Plana eklenen dosyalar: ekran görüntüsü, rapor, tablo, sunum çıktısı…
 * Yapay zekâ bunları okuyup plana dahil eder.
 *
 * Dosyaların kendisi saklanmaz; yalnızca üretim anında yapay zekâya gönderilir
 * ve dokümana adı/türü kaydedilir (gizlilik ve maliyet için bilinçli tercih).
 */
import { z } from "zod";

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const MAX_TEXT_ATTACHMENT_CHARS = 200_000;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export const PDF_TYPES = ["application/pdf"] as const;
export const TEXT_TYPES = ["text/plain", "text/csv", "text/markdown", "text/tab-separated-values", "application/json"] as const;

/** Dosya seçicide gösterilecek kabul listesi */
export const ACCEPTED_FILE_TYPES = [...IMAGE_TYPES, ...PDF_TYPES, ...TEXT_TYPES, ".csv", ".md", ".txt"].join(",");

export type AttachmentKind = "image" | "pdf" | "text";

export interface AttachmentMeta {
  name: string;
  mediaType: string;
  kind: AttachmentKind;
  size: number;
}

export interface Attachment extends AttachmentMeta {
  /** Görsel ve PDF için base64; metin dosyaları için düz metin */
  data: string;
}

export const attachmentMetaSchema = z.object({
  name: z.string().max(200),
  mediaType: z.string().max(100),
  kind: z.enum(["image", "pdf", "text"]),
  size: z.number().int().nonnegative(),
});

/** Dosya türünü sınıflandırır; desteklenmiyorsa null döner. */
export function classifyAttachment(mediaType: string, fileName: string): AttachmentKind | null {
  const type = mediaType.toLowerCase();
  const name = fileName.toLowerCase();

  if ((IMAGE_TYPES as readonly string[]).includes(type)) return "image";
  if ((PDF_TYPES as readonly string[]).includes(type) || name.endsWith(".pdf")) return "pdf";
  if ((TEXT_TYPES as readonly string[]).includes(type)) return "text";
  if (/\.(txt|csv|tsv|md|json)$/.test(name)) return "text";
  return null;
}

export const UNSUPPORTED_FILE_MESSAGE =
  "Desteklenen dosyalar: görsel (JPG, PNG, GIF, WEBP), PDF ve metin dosyaları (TXT, CSV, MD, JSON). Word ve Excel dosyalarını PDF olarak kaydedip yükleyebilirsin.";

export function validateAttachments(files: { name: string; size: number }[]): string | null {
  if (files.length > MAX_ATTACHMENTS) return `En fazla ${MAX_ATTACHMENTS} dosya ekleyebilirsin.`;

  const tooBig = files.find((f) => f.size > MAX_ATTACHMENT_BYTES);
  if (tooBig) {
    return `"${tooBig.name}" çok büyük. Dosya başına sınır ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB.`;
  }

  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
    return `Dosyaların toplam boyutu ${Math.round(MAX_TOTAL_ATTACHMENT_BYTES / 1024 / 1024)} MB'ı aşamaz.`;
  }
  return null;
}

/** Yapay zekâya dosyaların ne olduğunu ve nasıl kullanılacağını anlatan not. */
export function attachmentsPromptNote(attachments: AttachmentMeta[]): string {
  if (attachments.length === 0) return "";

  const list = attachments
    .map((a) => `- ${a.name} (${a.kind === "image" ? "görsel" : a.kind === "pdf" ? "PDF" : "metin dosyası"})`)
    .join("\n");

  return [
    "<ekli_dosyalar>",
    "Kullanıcı aşağıdaki dosyaları ekledi; bu mesajda sana iletildiler:",
    list,
    "",
    "Dosyaları kullanırken:",
    "- İçeriklerini oku ve plana dahil et; dosyadaki rakamları, tarihleri ve isimleri kullan.",
    "- Dosyadan okuduğun bir bilgiyi kullanırken kaynağını belirt (ör. \"satış raporuna göre\").",
    "- Dosya okunaksızsa veya beklediğin veriyi içermiyorsa bunu \"openQuestions\" listesinde söyle; uydurma.",
    "- Dosyadaki veriyle kullanıcının anlatımı çelişiyorsa çelişkiyi açıkça belirt.",
    "</ekli_dosyalar>",
    "",
  ].join("\n");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
