/**
 * Arka plan işleri (plan üretimi / güncellemesi) için saf yardımcılar.
 * Veritabanı ve çerçeveden bağımsızdır; servis katmanı ve arayüz kullanır.
 */

export const JOB_KINDS = ["generate", "refine"] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export const JOB_STATUSES = ["queued", "running", "succeeded", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface JobRecord {
  id: string;
  kind: JobKind;
  status: JobStatus;
  title: string;
  progress: string | null;
  outputId: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

/** Aynı anda en fazla bu kadar iş çalışabilir (maliyet ve kötüye kullanım koruması). */
export const MAX_ACTIVE_JOBS = 2;

/**
 * Bu sürelerden sonra hâlâ bitmemiş bir iş, sunucu süreci sonlandığı için
 * yarıda kalmış sayılır (ör. platformun azami çalışma süresi aşıldı).
 */
export const QUEUED_TIMEOUT_MS = 5 * 60_000;
export const RUNNING_TIMEOUT_MS = 15 * 60_000;

export const INTERRUPTED_MESSAGE =
  "Planın hazırlanırken işlem yarıda kesildi. Kullanım hakkından düşülmedi; lütfen tekrar dene.";

export const GENERIC_JOB_ERROR = "Beklenmeyen bir hata oluştu. Kullanım hakkından düşülmedi; lütfen tekrar dene.";

/**
 * Kayıttaki durumu, zaman aşımını da hesaba katarak kullanıcıya gösterilecek
 * duruma çevirir. Veritabanını değiştirmez.
 */
export function effectiveJob(job: JobRecord, now: Date = new Date()): JobRecord {
  if (job.status === "queued" && now.getTime() - Date.parse(job.createdAt) > QUEUED_TIMEOUT_MS) {
    return { ...job, status: "failed", error: INTERRUPTED_MESSAGE };
  }
  if (job.status === "running" && now.getTime() - Date.parse(job.startedAt ?? job.createdAt) > RUNNING_TIMEOUT_MS) {
    return { ...job, status: "failed", error: INTERRUPTED_MESSAGE };
  }
  return job;
}

export function isActive(job: JobRecord, now: Date = new Date()): boolean {
  const status = effectiveJob(job, now).status;
  return status === "queued" || status === "running";
}

/** "2 / 3 bölüm hazır · son biten: Risk Planı" */
export function progressMessage(completed: number, total: number, finished: string): string {
  const name = finished.length > 80 ? `${finished.slice(0, 77)}…` : finished;
  return total > 1 ? `${completed} / ${total} bölüm hazır · son biten: ${name}` : `${name} hazır, kaydediliyor`;
}

/** Bir kullanıcının son bir saatte başlatabileceği en fazla iş (otomasyon/kötüye kullanım koruması). */
export const HOURLY_JOB_LIMIT = 10;

/** Tüm site için günlük üst sınır (acil fren); ortam değişkeniyle değiştirilebilir. */
export const DEFAULT_GLOBAL_DAILY_JOB_LIMIT = 500;

/**
 * Yeni iş başlatılabilir mi? Kredisi/hakkı süren işlere yetmeyen kullanıcı
 * aynı anda yeni iş başlatamaz (aksi hâlde biri boşuna maliyet üretip
 * başarısız olur). Hak kontrolü (canAfford) bundan önce yapılmalıdır.
 */
export function canStartJob(input: {
  activeCount: number;
  /** Son bir saatte başlatılan iş sayısı */
  recentCount: number;
  /** Kalan hak/kredi; sınırsızda null */
  remaining: number | null;
  /** Bu işin maliyeti (denemede 1) */
  cost: number;
}): { ok: true } | { ok: false; reason: string } {
  if (input.activeCount >= MAX_ACTIVE_JOBS) {
    return { ok: false, reason: `Aynı anda en fazla ${MAX_ACTIVE_JOBS} plan hazırlanabilir. Devam edenlerin bitmesini bekle.` };
  }
  if (input.recentCount >= HOURLY_JOB_LIMIT) {
    return { ok: false, reason: "Son bir saatte çok sayıda plan başlattın. Biraz sonra tekrar dene." };
  }
  // Süren her iş en az 1 hak ayırır.
  if (input.remaining !== null && input.activeCount > 0 && input.remaining < input.cost + input.activeCount) {
    return { ok: false, reason: "Hazırlanmakta olan planların kalan hakkını kullanıyor. Önce onların bitmesini bekle." };
  }
  return { ok: true };
}

/** Kullanıcıya gösterilen iş adı. */
export function jobTitle(value: string | null | undefined, fallback = "Yeni plan"): string {
  const clean = (value ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean;
}
