import "server-only";
import type { Attachment } from "@/core/ai/attachments";
import { getEntitlement, TRIAL_GENERATION_LIMIT } from "@/core/billing/entitlements";
import {
  generateOutput,
  type GenerateOutputInput,
  type GenerateOutputOptions,
} from "@/core/output/generator";
import type { GeneratedDocument } from "@/core/output/document";
import { GenerationError } from "@/core/output/errors";
import { refineSection, type RefineSectionInput } from "@/core/output/refiner";
import { ClaudePersonalizer, isAiConfigured } from "@/infrastructure/ai/claude-personalizer";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin";
import { AccountRepository } from "@/infrastructure/supabase/account-repository";
import { SupabaseCatalogRepository } from "@/infrastructure/supabase/catalog-repository";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";

export class EntitlementError extends Error {
  readonly code = "ENTITLEMENT_REQUIRED";
  constructor() {
    super("Ücretsiz deneme hakkınız doldu. Devam etmek için abone olun.");
    this.name = "EntitlementError";
  }
}

export interface GenerateForUserResult {
  outputId: string;
  document: GeneratedDocument;
}

/**
 * Kullanım senaryosu: kimliği doğrulanmış bir kullanıcı için çıktı üret.
 *
 *   hak kontrolü → motor (core/output/generator, gerekirse yapay zekâ) → kredi düş → kaydet
 *
 * Çağıranın kimliği doğrulaması gerekir; bu fonksiyon userId'ye güvenir.
 * Web formu (server action) bugün, REST API ileride bunu çağırır.
 */
export async function generateForUser(
  userId: string,
  input: GenerateOutputInput,
  attachments: Attachment[] = [],
  options: Pick<GenerateOutputOptions, "onProgress"> = {},
): Promise<GenerateForUserResult> {
  const admin = createSupabaseAdminClient();
  const accounts = new AccountRepository(admin);

  const account = await accounts.findById(userId);
  if (!account || !getEntitlement(account).canGenerate) {
    throw new EntitlementError();
  }

  // Hata varsa (boş seçim, içerik yok vb.) kredi düşmeden önce fırlatılır.
  const document = await generateOutput(input, new SupabaseCatalogRepository(admin), {
    personalizer: input.context && isAiConfigured() ? new ClaudePersonalizer() : undefined,
    attachments,
    onProgress: options.onProgress,
  });

  const allowed = await accounts.consumeGenerationCredit(userId, TRIAL_GENERATION_LIMIT);
  if (!allowed) throw new EntitlementError();

  const outputId = await new OutputRepository(admin).create(userId, document);
  return { outputId, document };
}

/**
 * Kullanım senaryosu: kişiselleştirilmiş bir bölümü açık soru cevaplarıyla güncelle.
 * Yapay zekâ maliyeti oluştuğu için yeni üretim gibi 1 kullanım hakkı sayılır.
 * Doküman sahipliği çağıran tarafından doğrulanmalıdır; kaydı çağıran yapar.
 */
export async function refineSectionForUser(
  userId: string,
  document: GeneratedDocument,
  input: RefineSectionInput,
): Promise<GeneratedDocument> {
  if (!isAiConfigured()) {
    throw new GenerationError("AI_UNAVAILABLE", "Yapay zekâ özelliği şu anda kullanılamıyor.");
  }

  const accounts = new AccountRepository(createSupabaseAdminClient());
  const account = await accounts.findById(userId);
  if (!account || !getEntitlement(account).canGenerate) {
    throw new EntitlementError();
  }

  const updated = await refineSection(document, input, new ClaudePersonalizer());

  const allowed = await accounts.consumeGenerationCredit(userId, TRIAL_GENERATION_LIMIT);
  if (!allowed) throw new EntitlementError();

  return updated;
}
