"use client";

import { useEffect, useRef, useState } from "react";
import type { JobStatus } from "@/core/jobs/job";

export interface JobStatusResponse {
  status: JobStatus;
  title: string;
  progress: string | null;
  outputId: string | null;
  error: string | null;
  createdAt: string;
}

const POLL_MS = 3000;

/**
 * Arka plan işinin durumunu birkaç saniyede bir sorar; iş bitince durur.
 * Geçici ağ hataları yok sayılır (bir sonraki denemede düzelir).
 */
export function useJobStatus(jobId: string | null, initial?: JobStatusResponse) {
  const [job, setJob] = useState<JobStatusResponse | null>(initial ?? null);
  const [lostAccess, setLostAccess] = useState(false);
  const done = useRef(false);
  const hasInitial = Boolean(initial);

  useEffect(() => {
    if (!jobId) return;
    done.current = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/isler/${jobId}`, { cache: "no-store" });
        if (res.status === 401 || res.status === 404) {
          setLostAccess(true);
          return;
        }
        if (res.ok) {
          const next = (await res.json()) as JobStatusResponse;
          setJob(next);
          if (next.status === "succeeded" || next.status === "failed") {
            done.current = true;
            return;
          }
        }
      } catch {
        // Bağlantı geçici olarak koptu; bir sonraki turda tekrar denenir.
      }
      if (!done.current) timer = setTimeout(poll, POLL_MS);
    };

    timer = setTimeout(poll, hasInitial ? POLL_MS : 0);
    return () => {
      done.current = true;
      clearTimeout(timer);
    };
  }, [jobId, hasInitial]);

  return { job, lostAccess };
}
