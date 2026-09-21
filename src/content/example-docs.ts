/**
 * Örnek planların içerikleri (scripts/generate-examples.mts ile üretilir).
 * Dosyalar statik olarak içe aktarılır; böylece sayfalar derleme anında
 * hazırlanır ve yayında ek dosya okuma gerekmez.
 */
import { generatedDocumentSchema, type GeneratedDocument } from "@/core/output/document";
import paydas from "./examples/paydas-analizi-ornegi.json";
import pazaraGiris from "./examples/pazara-giris-plani-ornegi.json";
import projeBerati from "./examples/proje-berati-ornegi.json";
import risk from "./examples/risk-yonetim-plani-ornegi.json";
import satis from "./examples/satis-stratejisi-ornegi.json";
import swot from "./examples/swot-analizi-ornegi.json";
import prd from "./examples/urun-gereksinim-dokumani-prd-ornegi.json";
import yolHaritasi from "./examples/urun-yol-haritasi-ornegi.json";

const DOCUMENTS: Record<string, unknown> = {
  "swot-analizi-ornegi": swot,
  "paydas-analizi-ornegi": paydas,
  "proje-berati-ornegi": projeBerati,
  "risk-yonetim-plani-ornegi": risk,
  "urun-gereksinim-dokumani-prd-ornegi": prd,
  "urun-yol-haritasi-ornegi": yolHaritasi,
  "satis-stratejisi-ornegi": satis,
  "pazara-giris-plani-ornegi": pazaraGiris,
};

export function loadExampleDocument(slug: string): GeneratedDocument | null {
  const raw = DOCUMENTS[slug];
  if (!raw) return null;
  const parsed = generatedDocumentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export const EXAMPLE_DOCUMENT_SLUGS = Object.keys(DOCUMENTS);
