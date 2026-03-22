"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Download, Camera } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

const DOWNLOAD_SIZES = [
  { key: "35x45", label: "35×45mm (HK Standard)" },
  { key: "25x35", label: "25×35mm" },
  { key: "passport", label: "Passport (35×45mm)" },
];

export function PaymentSuccessContent() {
  const t = useTranslations("payment");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <Camera className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">IDPhoto</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 py-20">
          <Card>
            <CardContent className="pt-8 pb-8 px-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold">{t("successTitle")}</h1>
              <p className="mt-2 text-muted-foreground">
                {t("successMessage")}
              </p>

              <div className="mt-8 space-y-3">
                {DOWNLOAD_SIZES.map((size) => (
                  <Button
                    key={size.key}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // In production, these would be signed URLs from storage
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t("downloadSize", { size: size.label })}
                  </Button>
                ))}
              </div>

              <Link href="/upload" className="block mt-6">
                <Button variant="outline" className="w-full">
                  {t("backToPhoto")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
