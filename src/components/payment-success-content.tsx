"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Download, Camera, Loader2, AlertCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

const DOWNLOAD_SIZES = [
  { key: "35x45", label: "35×45mm (HK Standard)" },
  { key: "25x35", label: "25×35mm" },
  { key: "passport", label: "Passport (35×45mm)" },
];

type DownloadState = "loading" | "ready" | "error";

export function PaymentSuccessContent() {
  const t = useTranslations("payment");
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id") ?? null;

  const [downloadState, setDownloadState] = useState<DownloadState>("loading");
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setDownloadState("error");
      setErrorMessage("No payment session found.");
      return;
    }

    async function fetchDownloads() {
      try {
        const response = await fetch(`/api/download?session_id=${encodeURIComponent(sessionId!)}`);
        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.error || "Failed to load downloads.");
          setDownloadState("error");
          return;
        }

        setImageUrls(data.images);
        setDownloadState("ready");
      } catch {
        setErrorMessage("Network error. Please refresh the page.");
        setDownloadState("error");
      }
    }

    fetchDownloads();
  }, [sessionId]);

  const handleDownload = (url: string, size: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `idphoto-${size}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    for (const size of DOWNLOAD_SIZES) {
      const url = imageUrls[size.key];
      if (url) {
        setTimeout(() => handleDownload(url, size.key), DOWNLOAD_SIZES.indexOf(size) * 300);
      }
    }
  };

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
              {downloadState === "loading" && (
                <>
                  <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
                  <h1 className="text-2xl font-bold">{t("successTitle")}</h1>
                  <p className="mt-2 text-muted-foreground">
                    {t("loadingDownloads")}
                  </p>
                </>
              )}

              {downloadState === "error" && (
                <>
                  <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                  <h1 className="text-2xl font-bold">{t("downloadError")}</h1>
                  <p className="mt-2 text-muted-foreground">
                    {errorMessage}
                  </p>
                </>
              )}

              {downloadState === "ready" && (
                <>
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold">{t("successTitle")}</h1>
                  <p className="mt-2 text-muted-foreground">
                    {t("successMessage")}
                  </p>

                  <div className="mt-8 space-y-3">
                    {DOWNLOAD_SIZES.map((size) => {
                      const url = imageUrls[size.key];
                      return (
                        <Button
                          key={size.key}
                          variant="outline"
                          className="w-full justify-start"
                          disabled={!url}
                          onClick={() => url && handleDownload(url, size.key)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {t("downloadSize", { size: size.label })}
                        </Button>
                      );
                    })}

                    <Button
                      className="w-full mt-2"
                      onClick={handleDownloadAll}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t("downloadAll")}
                    </Button>
                  </div>
                </>
              )}

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
