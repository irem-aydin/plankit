"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GENERATE_STAGES, GenerationProgress } from "@/components/generation-progress";
import { StatusLink, StatusMessage } from "@/components/status-message";
import { useJobStatus, type JobStatusResponse } from "@/components/use-job-status";

/** Plan arka planda hazırlanırken gösterilir; bitince plana geçer. */
export function JobWaiter({ jobId, initial }: { jobId: string; initial: JobStatusResponse }) {
  const router = useRouter();
  const { job, lostAccess } = useJobStatus(jobId, initial);
  const current = job ?? initial;

  useEffect(() => {
    if (current.status === "succeeded" && current.outputId) router.replace(`/ciktilar/${current.outputId}`);
  }, [current.status, current.outputId, router]);

  if (lostAccess) {
    return (
      <StatusMessage icon="🔒" title="Oturumun sona ermiş olabilir" text="Tekrar giriş yap; planın hazır olduğunda Planlarım sayfasında görünür.">
        <StatusLink href="/giris" primary>
          Giriş yap
        </StatusLink>
      </StatusMessage>
    );
  }

  if (current.status === "failed") {
    return (
      <StatusMessage icon="⚠️" title="Plan hazırlanamadı" text={current.error ?? "Beklenmeyen bir hata oluştu."}>
        <StatusLink href="/olustur" primary>
          Tekrar dene
        </StatusLink>
        <StatusLink href="/ciktilar">Planlarım</StatusLink>
      </StatusMessage>
    );
  }

  if (current.status === "succeeded") {
    return <StatusMessage icon="✅" title="Planın hazır" text="Plana yönlendiriliyorsun…" />;
  }

  return (
    <div className="py-6">
      <p className="mb-6 text-center text-sm text-slate-600">
        <span className="font-medium text-slate-900">{current.title}</span>
      </p>
      <GenerationProgress
        inline
        title="Planın hazırlanıyor"
        stages={GENERATE_STAGES}
        expectedSeconds={150}
        startedAt={current.createdAt}
        detail={current.progress && current.progress !== "Hazırlanıyor" ? current.progress : null}
        note={
          <p>
            <strong className="font-semibold text-slate-700">Bu sayfayı kapatabilirsin.</strong> Plan sunucuda hazırlanmaya
            devam eder; bitince Planlarım sayfasında görünür. Kullanım hakkın yalnızca plan başarıyla hazırlanırsa düşer.
          </p>
        }
      />
    </div>
  );
}
