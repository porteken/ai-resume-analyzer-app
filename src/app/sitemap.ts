import { getSiteUrl } from "@/lib/site-url";

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return [
    {
      changeFrequency: "weekly",
      lastModified,
      priority: 1,
      url: siteUrl,
    },
    {
      changeFrequency: "monthly",
      lastModified,
      priority: 0.6,
      url: `${siteUrl}/about`,
    },
  ];
}
