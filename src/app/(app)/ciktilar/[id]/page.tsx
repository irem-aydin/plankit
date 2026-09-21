import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { generatedDocumentSchema } from "@/core/output/document";
import { isActive } from "@/core/jobs/job";
import { JobRepository } from "@/infrastructure/supabase/job-repository";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { OutputEditor } from "./output-editor";

/**
 * Arka plan işleri (after) bu sayfanın sunucu işlevlerinin süre sınırıyla
 * çalışır. Vercel'de Fluid Compute ile ücretsiz planda en fazla 300 sn.
 */
export const maxDuration = 300;

async function loadOutput(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createSupabaseServerClient();
  return new OutputRepository(supabase).findById(id);
}

export async function generateMetadata({ params }: PageProps<"/ciktilar/[id]">): Promise<Metadata> {
  const { id } = await params;
  const output = await loadOutput(id);
  return { title: output?.title ?? "Çıktı" };
}

export default async function OutputPage({ params }: PageProps<"/ciktilar/[id]">) {
  const { id } = await params;
  const output = await loadOutput(id);
  if (!output) notFound();

  const parsed = generatedDocumentSchema.safeParse(output.document);
  if (!parsed.success) {
    throw new Error("Kayıtlı doküman okunamadı (şema uyumsuz).");
  }

  const supabase = await createSupabaseServerClient();
  const [profiles, activeRefine] = await Promise.all([
    new ProfileRepository(supabase)
      .list()
      .catch(() => [])
      .then((list) => list.map((p) => ({ id: p.id, name: p.name }))),
    findActiveRefine(supabase, output.id),
  ]);

  return (
    <OutputEditor
      outputId={output.id}
      initialDocument={parsed.data}
      profiles={profiles}
      activeRefineJobId={activeRefine}
    />
  );
}

/** Sayfa yenilendiğinde süren güncelleme işi kaybolmasın. */
async function findActiveRefine(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, outputId: string) {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const jobs = await new JobRepository(supabase).listRecent(userId).catch(() => []);
  return jobs.find((j) => j.kind === "refine" && j.outputId === outputId && isActive(j))?.id ?? null;
}
