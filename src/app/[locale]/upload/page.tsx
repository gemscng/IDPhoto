"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Camera, ArrowLeft } from "lucide-react";
import { PhotoUpload } from "@/components/photo-upload";
import { ImagePreview } from "@/components/image-preview";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const t = useTranslations();

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <Camera className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-foreground">
              {t("common.appName")}
            </span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {file ? t("upload.titlePreview") : t("upload.titleUpload")}
            </h1>
            <p className="mt-3 text-muted-foreground text-lg">
              {file
                ? t("upload.subtitlePreview")
                : t("upload.subtitleUpload")}
            </p>
          </div>

          {!file ? (
            <PhotoUpload onFileSelect={handleFileSelect} />
          ) : (
            <ImagePreview
              file={file}
              previewUrl={previewUrl}
              onReset={handleReset}
            />
          )}

          {/* Tips */}
          {!file && (
            <div className="mt-12 rounded-xl bg-muted/50 border p-6">
              <h3 className="font-semibold mb-3">{t("upload.tipsTitle")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>&bull; {t("upload.tip1")}</li>
                <li>&bull; {t("upload.tip2")}</li>
                <li>&bull; {t("upload.tip3")}</li>
                <li>&bull; {t("upload.tip4")}</li>
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-muted-foreground">
          <p>{t("upload.privacyNote")}</p>
        </div>
      </footer>
    </div>
  );
}
