import type { MetadataRoute } from "next";
import { publicEnv } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Kullanıcıya özel sayfalar ve paylaşılan planlar taranmaz.
      disallow: ["/panel", "/olustur", "/ciktilar", "/profiller", "/ayarlar", "/abonelik", "/api/", "/auth/", "/p/"],
    },
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}
