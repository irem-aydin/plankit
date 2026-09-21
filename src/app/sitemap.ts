import type { MetadataRoute } from "next";
import { publicEnv } from "@/config/env";
import { EXAMPLES } from "@/content/examples";

/** Arama motorlarına açık sayfalar. Kullanıcıya özel sayfalar ve paylaşım bağlantıları dahil değildir. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.siteUrl;
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ornekler`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/fiyatlar`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ornek-plan`, changeFrequency: "monthly", priority: 0.7 },
    ...EXAMPLES.map((e) => ({ url: `${base}/ornekler/${e.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${base}/kayit`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/yasal`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
