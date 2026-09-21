export type GenerationErrorCode =
  | "EMPTY_SELECTION"
  | "TOO_MANY_SELECTIONS"
  | "UNKNOWN_SUBCATEGORY"
  | "NO_CONTENT"
  | "INVALID_CONTENT"
  | "AI_UNAVAILABLE"
  | "AI_FAILED"
  | "NOT_FOUND";

/**
 * Çıktı üretim motorunun beklenen (kullanıcıya gösterilebilir) hataları.
 * Taşıma katmanı (server action, REST API) bunu kendi formatına çevirir.
 */
export class GenerationError extends Error {
  constructor(
    public readonly code: GenerationErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}
