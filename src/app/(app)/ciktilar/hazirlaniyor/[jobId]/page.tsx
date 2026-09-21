import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { JobRepository } from "@/infrastructure/supabase/job-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getJobForUser } from "@/services/job-service";
import { JobWaiter } from "./job-waiter";

export const metadata: Metadata = { title: "Planın hazırlanıyor" };

export default async function PreparingPage({ params }: PageProps<"/ciktilar/hazirlaniyor/[jobId]">) {
  const { jobId } = await params;
  if (!z.uuid().safeParse(jobId).success) notFound();

  const job = await getJobForUser(new JobRepository(await createSupabaseServerClient()), jobId);
  if (!job) notFound();
  if (job.status === "succeeded" && job.outputId) redirect(`/ciktilar/${job.outputId}`);

  return (
    <JobWaiter
      jobId={job.id}
      initial={{
        status: job.status,
        title: job.title,
        progress: job.progress,
        outputId: job.outputId,
        error: job.error,
        createdAt: job.createdAt,
      }}
    />
  );
}
