import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://idphoto.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["en", "zh-HK"];
  const pages = ["", "/upload"];

  return locales.flatMap((locale) =>
    pages.map((page) => ({
      url: `${SITE_URL}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: page === "" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${SITE_URL}/${l}${page}`]),
        ),
      },
    })),
  );
}
