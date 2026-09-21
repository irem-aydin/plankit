import type { NextRequest } from "next/server";
import { z } from "zod";
import { JobRepository } from "@/infrastructure/supabase/job-repository";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/infrastructure/supabase/server";
import { getJobForUser } from "@/services/job-service";

/**
 * Arka plan işinin durumu (bekleme ekranı birkaç saniyede bir sorar).
 * RLS'li istemci: kullanıcı yalnızca kendi işini görebilir.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/isler/[id]">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Bulunamadı" }, { status: 404 });

  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Oturum sona erdi" }, { status: 401 });

  const job = await getJobForUser(new JobRepository(await createSupabaseServerClient()), id);
  if (!job) return Response.json({ error: "Bulunamadı" }, { status: 404 });

  return Response.json(
    {
      status: job.status,
      title: job.title,
      progress: job.progress,
      outputId: job.outputId,
      error: job.error,
      createdAt: job.createdAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
