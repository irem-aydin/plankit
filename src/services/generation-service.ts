import "server-only";
import type { Attachment } from "@/core/ai/attachments";
import { canAfford, effectiveCost, getEntitlement, TRIAL_GENERATION_LIMIT, type Entitlement } from "@/core/billing/entitlements";
import { CREDIT_COSTS, monthlyCreditLimit, planCreditCost } from "@/core/billing/plans";
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
  constructor(message = "Ücretsiz deneme hakkınız doldu. Devam etmek için abone olun.") {
    super(message);
    this.name = "EntitlementError";
  }
}

/** Hak yetmediğinde kullanıcıya duruma uygun mesaj. */
export function entitlementMessage(entitlement: Entitlement, cost: number): string {
  if ((entitlement.kind === "credits" || entitlement.kind === "pack") && (entitlement.remaining ?? 0) > 0) {
    return `Bu işlem ${cost} kredi gerektiriyor; ${entitlement.remaining} kredin kaldı. Özet plan seçebilir ya da kredi ekleyebilirsin.`;
  }
  if (entitlement.kind === "credits") {
    return "Bu ayki kredilerin bitti. Krediler her ay yenilenir; hemen devam etmek için planını yükseltebilir ya da tek seferlik paket alabilirsin.";
  }
  if (entitlement.kind === "trial") return "Ücretsiz deneme hakkını kullandın. Devam etmek için bir plan ya da tek seferlik paket seç.";
  return "Kullanılabilir kredin kalmadı. Devam etmek için bir plan ya da tek seferlik paket seç.";
}

/** İşlemin maliyeti için yeterli hak yoksa EntitlementError fırlatır; hesabı ve hakkı döner. */
export async function requireCredits(userId: string, cost: number) {
  const account = await new AccountRepository(createSupabaseAdminClient()).findById(userId);
  if (!account) throw new EntitlementError();
  const entitlement = getEntitlement(account);
  if (!canAfford(entitlement, cost)) throw new EntitlementError(entitlementMessage(entitlement, cost));
  return { account, entitlement };
}

async function consume(userId: string, entitlement: Entitlement, cost: number, plan: Parameters<typeof monthlyCreditLimit>[0]) {
  const accounts = new AccountRepository(createSupabaseAdminClient());
  const allowed = await accounts.consumeCredits(userId, effectiveCost(entitlement, cost), TRIAL_GENERATION_LIMIT, monthlyCreditLimit(plan));
  if (!allowed) throw new EntitlementError(entitlementMessage(entitlement, cost));
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
  const cost = planCreditCost(input.context?.detail);
  const { account, entitlement } = await requireCredits(userId, cost);

  // Hata varsa (boş seçim, içerik yok vb.) kredi düşmeden önce fırlatılır.
  const document = await generateOutput(input, new SupabaseCatalogRepository(admin), {
    personalizer: input.context && isAiConfigured() ? new ClaudePersonalizer() : undefined,
    attachments,
    onProgress: options.onProgress,
  });

  // Hak yalnızca üretim başarılı olursa düşer.
  await consume(userId, entitlement, cost, account.plan ?? "free");

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

  const { account, entitlement } = await requireCredits(userId, CREDIT_COSTS.refine);

  const updated = await refineSection(document, input, new ClaudePersonalizer());

  await consume(userId, entitlement, CREDIT_COSTS.refine, account.plan ?? "free");

  return updated;
}
