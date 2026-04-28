import { getSiteUrl } from "@/lib/site-url";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    host: siteUrl,
    rules: {
      allow: "/",
      userAgent: "*",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
