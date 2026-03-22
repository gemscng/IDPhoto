"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, Camera } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function PaymentCancelledPage() {
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
              <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold">{t("cancelledTitle")}</h1>
              <p className="mt-2 text-muted-foreground">
                {t("cancelledMessage")}
              </p>

              <div className="mt-8 space-y-3">
                <Link href="/upload" className="block">
                  <Button className="w-full">{t("tryAgain")}</Button>
                </Link>
                <Link href="/" className="block">
                  <Button variant="outline" className="w-full">
                    {t("backToPhoto")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
