"use server";

import { headers } from "next/headers";
import { previewForVisitor, type PreviewOutcome } from "@/services/preview-service";

/** Ana sayfadaki "kayıt olmadan dene" kutusu. */
export async function previewAction(text: string, honeypot: string): Promise<PreviewOutcome> {
  // Botlar görünmeyen alanı da doldurur; insanlar dolduramaz.
  if (honeypot) return { ok: false, error: "İstek işlenemedi." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "yerel";
  return previewForVisitor(String(text ?? ""), ip);
}
