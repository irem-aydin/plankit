import "server-only";
import type { Attachment } from "@/core/ai/attachments";
import { getEntitlement } from "@/core/billing/entitlements";
import {
  canStartJob,
  effectiveJob,
  GENERIC_JOB_ERROR,
  isActive,
  jobTitle,
  progressMessage,
  type JobRecord,
} from "@/core/jobs/job";
import type { GeneratedDocument } from "@/core/output/document";
import { GenerationError } from "@/core/output/errors";
import type { GenerateOutputInput } from "@/core/output/generator";
import type { RefineSectionInput } from "@/core/output/refiner";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin";
import { AccountRepository } from "@/infrastructure/supabase/account-repository";
import { JobRepository } from "@/infrastructure/supabase/job-repository";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { rememberAnswers } from "./context-service";
import { EntitlementError, generateForUser, refineSectionForUser } from "./generation-service";

/**
 * Arka plan üretimi. İstek yalnızca işi kaydeder ve hemen yanıt döner;
 * asıl üretim `run` ile yanıt gönderildikten sonra çalışır (web katmanında
 * Next.js `after`, ileride bir kuyruk). Böylece kullanıcı sayfayı kapatsa
 * ya da bağlantısı kopsa bile plan hazırlanmaya devam eder.
 *
 * Kullanım hakkı yalnızca üretim başarılı olursa düşer (generateForUser).
 */
export interface StartedJob {
  jobId: string;
  /** Yanıttan sonra çalıştırılacak iş; hiçbir zaman hata fırlatmaz. */
  run: () => Promise<void>;
}

export class JobLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobLimitError";
  }
}

async function assertCanStart(userId: string, jobs: JobRepository) {
  const account = await new AccountRepository(createSupabaseAdminClient()).findById(userId);
  if (!account) throw new EntitlementError();
  const entitlement = getEntitlement(account);
  if (!entitlement.canGenerate) throw new EntitlementError();

  const active = (await jobs.listRecent(userId)).filter((j) => isActive(j));
  const check = canStartJob(active.length, entitlement);
  if (!check.ok) throw new JobLimitError(check.reason);
  return active;
}

function userMessage(error: unknown): string {
  if (error instanceof EntitlementError || error instanceof GenerationError) return error.message;
  console.error("Arka plan işi başarısız:", error);
  return GENERIC_JOB_ERROR;
}

export async function startGenerationJob(
  userId: string,
  input: GenerateOutputInput,
  attachments: Attachment[],
  displayTitle: string,
): Promise<StartedJob> {
  const jobs = new JobRepository(createSupabaseAdminClient());
  await assertCanStart(userId, jobs);
  const jobId = await jobs.create({ userId, kind: "generate", title: jobTitle(displayTitle) });

  return {
    jobId,
    run: async () => {
      try {
        await jobs.markRunning(jobId);
        const { outputId } = await generateForUser(userId, input, attachments, {
          onProgress: ({ completed, total, finished }) => {
            // Beklemeden yaz; ilerleme kaydı üretimi yavaşlatmamalı.
            jobs.setProgress(jobId, progressMessage(completed, total, finished)).catch(() => {});
          },
        });
        await jobs.markSucceeded(jobId, outputId, "Planın hazır");
      } catch (error) {
        await jobs.markFailed(jobId, userMessage(error)).catch((e) => console.error("İş durumu yazılamadı:", e));
      }
    },
  };
}

/**
 * Bir bölümü açık soru cevaplarıyla güncelleme işi. Çağıran, planın
 * kullanıcıya ait olduğunu doğrulamış olmalıdır.
 */
export async function startRefineJob(
  userId: string,
  outputId: string,
  document: GeneratedDocument,
  input: RefineSectionInput,
): Promise<StartedJob> {
  const jobs = new JobRepository(createSupabaseAdminClient());
  const active = await assertCanStart(userId, jobs);
  if (active.some((j) => j.kind === "refine" && j.outputId === outputId)) {
    throw new JobLimitError("Bu plan zaten güncelleniyor. Lütfen bitmesini bekle.");
  }
  const section = document.sections[input.sectionIndex];
  const jobId = await jobs.create({
    userId,
    kind: "refine",
    title: jobTitle(section ? `${document.title} · ${section.subcategoryName}` : document.title),
    outputId,
  });

  return {
    jobId,
    run: async () => {
      try {
        await jobs.markRunning(jobId);
        const updated = await refineSectionForUser(userId, document, input);
        // Sahiplik iş başlatılmadan önce doğrulandı; yanıt sonrası oturum çerezine güvenmemek için service role.
        const saved = await new OutputRepository(createSupabaseAdminClient()).updateDocument(outputId, updated);
        if (!saved) throw new GenerationError("NOT_FOUND", "Plan bulunamadı; silinmiş olabilir.");
        const remembered = await rememberAnswers(userId, updated.context?.profile?.id, input.answers);
        await jobs.markSucceeded(
          jobId,
          outputId,
          remembered > 0
            ? `Plan güncellendi · ${remembered} bilgi "${updated.context?.profile?.name}" profilinin hafızasına eklendi`
            : "Plan cevaplarına göre güncellendi ve kaydedildi",
        );
      } catch (error) {
        await jobs.markFailed(jobId, userMessage(error)).catch((e) => console.error("İş durumu yazılamadı:", e));
      }
    },
  };
}

/** Kullanıcının kendi işini okur (RLS'li istemci verilmeli); zaman aşımını hesaba katar. */
export async function getJobForUser(jobs: JobRepository, jobId: string): Promise<JobRecord | null> {
  const job = await jobs.findById(jobId);
  return job ? effectiveJob(job) : null;
}
