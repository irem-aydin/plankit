import type { TemplateInstance } from "../output/document";
import type { Attachment } from "./attachments";
import type { CustomDocumentRequest } from "./custom-document";
import type { DecisionExtractionRequest, ExtractedDecision } from "./decisions";
import type { IntakeContext } from "./intake";

export interface PersonalizationRequest {
  /** Doldurulacak şablon (boş örnek) */
  template: TemplateInstance;
  subcategoryName: string;
  categoryName: string;
  /** Aynı dokümanda seçilen diğer başlıklar (tutarlılık için) */
  relatedTopics: string[];
  context: IntakeContext;
  /** Zaman çizelgelerinin gerçekçi olması için bugünün tarihi (YYYY-MM-DD) */
  today: string;
  /** Kullanıcının eklediği dosyalar (görsel, PDF, metin) */
  attachments?: Attachment[];
  /**
   * Güncelleme modunda: mevcut (kullanıcının düzenlemiş olabileceği) plan ve
   * kullanıcının açık sorulara verdiği yeni cevaplar.
   */
  revision?: {
    answers: { question: string; answer: string }[];
    previousAssumptions: string[];
  };
}

export interface PersonalizationResult {
  template: TemplateInstance;
  keyFindings: string[];
  assumptions: string[];
  openQuestions: string[];
  model: string;
}

/**
 * Şablonu kullanıcının bağlamına göre dolduran yapay zekâ bağımlılığı.
 * Çekirdek katman hangi modelin/sağlayıcının kullanıldığını bilmez.
 */
export interface ContentPersonalizer {
  /** Hazır (elle yazılmış) şablonu kullanıcının durumuna göre doldurur */
  personalizeTemplate(request: PersonalizationRequest): Promise<PersonalizationResult>;
  /** Hazır şablon yoksa: konuya uygun şablonu tasarlar ve doldurur */
  designDocument(request: CustomDocumentRequest): Promise<DesignedDocumentResult>;
  /** Tamamlanmış bir dokümandan hafızaya alınacak kalıcı kararları çıkarır */
  extractDecisions(request: DecisionExtractionRequest): Promise<ExtractedDecision[]>;
}

export interface DesignedDocumentResult extends PersonalizationResult {
  /** Yapay zekânın verdiği doküman başlığı */
  title: string;
}

export class PersonalizationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "PersonalizationError";
  }
}
