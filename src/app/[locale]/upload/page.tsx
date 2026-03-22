import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UploadPageContent } from "@/components/upload-page-content";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://idphoto.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return {
    title: t("uploadTitle"),
    description: t("uploadDescription"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/upload`,
      languages: {
        en: `${SITE_URL}/en/upload`,
        "zh-HK": `${SITE_URL}/zh-HK/upload`,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function UploadPage() {
  return <UploadPageContent />;
}
