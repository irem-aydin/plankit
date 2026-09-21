import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { generatedDocumentSchema } from "@/core/output/document";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { OutputEditor } from "./output-editor";

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

  const profiles = await new ProfileRepository(await createSupabaseServerClient())
    .list()
    .catch(() => [])
    .then((list) => list.map((p) => ({ id: p.id, name: p.name })));

  return <OutputEditor outputId={output.id} initialDocument={parsed.data} profiles={profiles} />;
}
