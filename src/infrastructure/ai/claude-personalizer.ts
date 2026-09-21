import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import {
  buildCustomDocumentPrompt,
  customDocumentSchema,
  customResponseToTemplate,
  CUSTOM_DESIGN_SYSTEM_PROMPT,
  type CustomDocumentRequest,
} from "@/core/ai/custom-document";
import {
  IMAGE_TYPES,
  MAX_TEXT_ATTACHMENT_CHARS,
  type Attachment,
} from "@/core/ai/attachments";
import {
  buildDecisionExtractionPrompt,
  decisionExtractionSchema,
  normalizeDecisions,
  DECISION_EXTRACTION_SYSTEM_PROMPT,
  type DecisionExtractionRequest,
  type ExtractedDecision,
} from "@/core/ai/decisions";
import type { DetailLevel } from "@/core/ai/intake";
import {
  PersonalizationError,
  type ContentPersonalizer,
  type DesignedDocumentResult,
  type PersonalizationRequest,
  type PersonalizationResult,
} from "@/core/ai/personalizer";
import {
  applyTemplateFill,
  buildTemplateFillPrompt,
  TEMPLATE_FILL_SYSTEM_PROMPT,
  templateFillSchema,
} from "@/core/ai/template-fill";

const MODEL = "claude-opus-5";

/** ContentPersonalizer'ın Claude (Anthropic API) uygulaması. */
export class ClaudePersonalizer implements ContentPersonalizer {
  constructor(private readonly client: Anthropic = new Anthropic()) {}

  /** Hazır şablonu kullanıcının durumuna göre doldurur. */
  async personalizeTemplate(request: PersonalizationRequest): Promise<PersonalizationResult> {
    const { parsed, model } = await this.ask(
      TEMPLATE_FILL_SYSTEM_PROMPT,
      buildTemplateFillPrompt(request),
      templateFillSchema,
      request.context.detail,
      { attachments: request.attachments },
    );

    return {
      template: applyTemplateFill(request.template, parsed),
      keyFindings: parsed.keyFindings,
      assumptions: parsed.assumptions,
      openQuestions: parsed.openQuestions,
      model,
    };
  }

  /** Hazır şablon yoksa: konuya uygun şablonu tasarlar ve doldurur. */
  async designDocument(request: CustomDocumentRequest): Promise<DesignedDocumentResult> {
    const { parsed, model } = await this.ask(
      CUSTOM_DESIGN_SYSTEM_PROMPT,
      buildCustomDocumentPrompt(request),
      customDocumentSchema,
      request.context.detail,
      { attachments: request.attachments },
    );

    if (parsed.sections.length === 0) {
      throw new PersonalizationError("Yapay zekâ bu konu için bir çerçeve oluşturamadı. İsteğini biraz daha açık yazmayı dene.");
    }

    return {
      title: parsed.title || request.topic,
      template: customResponseToTemplate(parsed),
      keyFindings: parsed.keyFindings,
      assumptions: parsed.assumptions,
      openQuestions: parsed.openQuestions,
      model,
    };
  }

  /** Dokümandan kalıcı kararları çıkarır (kısa ve ucuz bir çağrı). */
  async extractDecisions(request: DecisionExtractionRequest): Promise<ExtractedDecision[]> {
    const { parsed } = await this.ask(
      DECISION_EXTRACTION_SYSTEM_PROMPT,
      buildDecisionExtractionPrompt(request),
      decisionExtractionSchema,
      "summary",
      { maxTokens: 4_000, effort: "low" },
    );
    return normalizeDecisions(parsed);
  }

  private async ask<Schema extends z.ZodType>(
    system: string,
    prompt: string,
    schema: Schema,
    detail: DetailLevel,
    options: { maxTokens?: number; effort?: "low" | "medium" | "high"; attachments?: Attachment[] } = {},
  ): Promise<{ parsed: z.infer<Schema>; model: string }> {
    let message;
    try {
      // Uzun çıktı üretilebildiği için akış (stream) kullanılır; zaman aşımını önler.
      const stream = this.client.beta.messages.stream({
        model: MODEL,
        max_tokens: options.maxTokens ?? 32000,
        thinking: { type: "adaptive" },
        // Güvenlik sınıflandırıcısı reddederse istek sunucu tarafında uygun modele aktarılır.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // Özet planda daha hızlı ve ekonomik yanıt; detaylı planda derin analiz.
        output_config: {
          effort: options.effort ?? (detail === "detailed" ? "high" : "medium"),
          format: betaZodOutputFormat(schema),
        },
        system,
        messages: [{ role: "user", content: [...toContentBlocks(options.attachments ?? []), { type: "text", text: prompt }] }],
      });
      message = await stream.finalMessage();
    } catch (error) {
      throw new PersonalizationError(describeApiError(error), error);
    }

    if (message.stop_reason === "refusal") {
      throw new PersonalizationError(
        "Yapay zekâ bu içerik için yanıt üretemedi. Anlatımını farklı ifade edip tekrar deneyebilirsin.",
      );
    }
    if (message.stop_reason === "max_tokens") {
      throw new PersonalizationError("Yanıt çok uzun olduğu için tamamlanamadı. Lütfen tekrar dene.");
    }

    const parsed = message.parsed_output as z.infer<Schema> | null;
    if (!parsed) {
      throw new PersonalizationError("Yapay zekâ yanıtı okunamadı. Lütfen tekrar dene.");
    }

    return { parsed, model: message.model };
  }
}

/** Eklenen dosyaları Claude içerik bloklarına çevirir. */
function toContentBlocks(attachments: Attachment[]): Anthropic.Beta.BetaContentBlockParam[] {
  return attachments.map((file) => {
    if (file.kind === "image") {
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: (IMAGE_TYPES as readonly string[]).includes(file.mediaType)
            ? (file.mediaType as (typeof IMAGE_TYPES)[number])
            : "image/png",
          data: file.data,
        },
      };
    }
    if (file.kind === "pdf") {
      return {
        type: "document",
        title: file.name,
        source: { type: "base64", media_type: "application/pdf", data: file.data },
      };
    }
    return {
      type: "document",
      title: file.name,
      source: { type: "text", media_type: "text/plain", data: file.data.slice(0, MAX_TEXT_ATTACHMENT_CHARS) },
    };
  });
}

function describeApiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error("Anthropic API anahtarı geçersiz:", error.message);
    return "Yapay zekâ servisine bağlanılamadı (yapılandırma hatası).";
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error('Anthropic isteği reddedildi:', error.message);
    return error.message.includes('image') || error.message.includes('document') || error.message.includes('pdf')
      ? 'Eklediğin dosyalardan biri okunamadı. Dosyayı kontrol edip (bozuk veya çok küçük olabilir) tekrar dene.'
      : 'İstek işlenemedi. Eklediğin dosyaları kaldırıp veya anlatımını kısaltıp tekrar dene.';
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Yapay zekâ servisi şu anda yoğun. Birkaç dakika sonra tekrar dene.";
  }
  if (error instanceof Anthropic.APIError) {
    console.error(`Anthropic API hatası ${error.status}:`, error.message);
    return "Yapay zekâ servisinde geçici bir sorun oluştu. Lütfen tekrar dene.";
  }
  console.error("Yapay zekâ çağrısı başarısız:", error);
  return "Yapay zekâ servisine ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.";
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
