import { describe, expect, it } from "vitest";
import {
  canStartJob,
  effectiveJob,
  INTERRUPTED_MESSAGE,
  isActive,
  jobTitle,
  MAX_ACTIVE_JOBS,
  progressMessage,
  QUEUED_TIMEOUT_MS,
  RUNNING_TIMEOUT_MS,
  type JobRecord,
} from "@/core/jobs/job";

const T0 = new Date("2026-09-21T10:00:00.000Z");
const at = (ms: number) => new Date(T0.getTime() + ms);

function job(partial: Partial<JobRecord>): JobRecord {
  return {
    id: "j1",
    kind: "generate",
    status: "queued",
    title: "Test",
    progress: null,
    outputId: null,
    error: null,
    createdAt: T0.toISOString(),
    startedAt: null,
    finishedAt: null,
    ...partial,
  };
}

describe("effectiveJob", () => {
  it("yeni sıradaki iş aktif kalır", () => {
    expect(effectiveJob(job({}), at(60_000)).status).toBe("queued");
  });

  it("çok uzun süre sırada bekleyen iş yarıda kalmış sayılır", () => {
    const e = effectiveJob(job({}), at(QUEUED_TIMEOUT_MS + 1));
    expect(e.status).toBe("failed");
    expect(e.error).toBe(INTERRUPTED_MESSAGE);
  });

  it("çalışan iş süre sınırına kadar aktif kalır", () => {
    const running = job({ status: "running", startedAt: T0.toISOString() });
    expect(effectiveJob(running, at(RUNNING_TIMEOUT_MS - 1)).status).toBe("running");
    expect(effectiveJob(running, at(RUNNING_TIMEOUT_MS + 1)).status).toBe("failed");
  });

  it("biten işe dokunmaz", () => {
    const done = job({ status: "succeeded", outputId: "o1" });
    expect(effectiveJob(done, at(RUNNING_TIMEOUT_MS * 10))).toEqual(done);
  });

  it("kaydı değiştirmez, kopya döner", () => {
    const original = job({});
    effectiveJob(original, at(QUEUED_TIMEOUT_MS + 1));
    expect(original.status).toBe("queued");
  });
});

describe("isActive", () => {
  it("sırada ve çalışan işler aktiftir, bitenler değildir", () => {
    expect(isActive(job({ status: "queued" }), at(0))).toBe(true);
    expect(isActive(job({ status: "running", startedAt: T0.toISOString() }), at(0))).toBe(true);
    expect(isActive(job({ status: "succeeded" }), at(0))).toBe(false);
    expect(isActive(job({ status: "failed" }), at(0))).toBe(false);
  });
});

describe("canStartJob", () => {
  const subscriber = { unlimited: true, remainingTrial: null };

  it("abone, sınıra kadar iş başlatabilir", () => {
    expect(canStartJob(0, subscriber).ok).toBe(true);
    expect(canStartJob(MAX_ACTIVE_JOBS - 1, subscriber).ok).toBe(true);
    expect(canStartJob(MAX_ACTIVE_JOBS, subscriber).ok).toBe(false);
  });

  it("deneme kullanıcısı kalan hakkından fazla işi aynı anda başlatamaz", () => {
    expect(canStartJob(0, { unlimited: false, remainingTrial: 1 }).ok).toBe(true);
    expect(canStartJob(1, { unlimited: false, remainingTrial: 1 }).ok).toBe(false);
    expect(canStartJob(1, { unlimited: false, remainingTrial: 3 }).ok).toBe(true);
  });

  it("reddedilince kullanıcıya bir sebep gösterir", () => {
    const result = canStartJob(MAX_ACTIVE_JOBS, subscriber);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.length).toBeGreaterThan(10);
  });
});

describe("progressMessage", () => {
  it("birden fazla bölümde sayacı gösterir", () => {
    expect(progressMessage(1, 3, "Risk Planı")).toBe("1 / 3 bölüm hazır · son biten: Risk Planı");
  });

  it("tek bölümde kaydedildiğini söyler", () => {
    expect(progressMessage(1, 1, "Strateji Analizi")).toBe("Strateji Analizi hazır, kaydediliyor");
  });

  it("çok uzun adları kısaltır", () => {
    expect(progressMessage(1, 2, "x".repeat(200)).length).toBeLessThan(130);
  });
});

describe("jobTitle", () => {
  it("boşlukları sadeleştirir", () => {
    expect(jobTitle("  Strateji   Analizi \n ")).toBe("Strateji Analizi");
  });

  it("boşsa varsayılan adı kullanır", () => {
    expect(jobTitle("")).toBe("Yeni plan");
    expect(jobTitle(null)).toBe("Yeni plan");
  });

  it("uzun adları kısaltıp … ile bitirir", () => {
    const title = jobTitle("a".repeat(300));
    expect(title.length).toBeLessThanOrEqual(120);
    expect(title.endsWith("…")).toBe(true);
  });
});
