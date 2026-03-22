import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://idphoto.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return {
    title: t("title"),
    description: t("description"),
    keywords: [
      "interview photo",
      "school photo",
      "Hong Kong",
      "AI photo",
      "children photo",
      "primary school",
      "passport photo",
      "兒童面試相",
      "證件相",
      "AI證件相",
      "小學面試相",
      "香港證件照",
    ],
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        en: `${SITE_URL}/en`,
        "zh-HK": `${SITE_URL}/zh-HK`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${SITE_URL}/${locale}`,
      siteName: "IDPhoto",
      locale: locale === "zh-HK" ? "zh_HK" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "IDPhoto",
    description:
      "AI-powered professional interview photo service for children in Hong Kong",
    provider: {
      "@type": "Organization",
      name: "IDPhoto",
      url: SITE_URL,
    },
    areaServed: {
      "@type": "Place",
      name: "Hong Kong",
    },
    serviceType: "Photo Processing",
    offers: [
      {
        "@type": "Offer",
        name: "Single Photo",
        price: "50",
        priceCurrency: "HKD",
      },
      {
        "@type": "Offer",
        name: "Bundle (3 Photos)",
        price: "100",
        priceCurrency: "HKD",
      },
    ],
  };

  return (
    <NextIntlClientProvider messages={messages}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </NextIntlClientProvider>
  );
}
