"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import {
  Loader2,
  RotateCcw,
  Download,
  Check,
  CreditCard,
} from "lucide-react";

type ProcessingState =
  | "idle"
  | "removing_bg"
  | "processing"
  | "done"
  | "error";

interface ImagePreviewProps {
  file: File | null;
  previewUrl: string | null;
  onReset: () => void;
}

const BACKGROUND_COLORS = [
  { labelKey: "bgWhite" as const, value: "#FFFFFF" },
  { labelKey: "bgLightBlue" as const, value: "#D6EAF8" },
  { labelKey: "bgLightGrey" as const, value: "#E8E8E8" },
];

const PHOTO_SIZES = [
  { labelKey: "sizeHK" as const, value: "35x45" },
  { labelKey: "sizeSmall" as const, value: "25x35" },
  { labelKey: "sizePassport" as const, value: "passport" },
];

const ALL_SIZES = ["35x45", "25x35", "passport"] as const;

export function ImagePreview({ file, previewUrl, onReset }: ImagePreviewProps) {
  const t = useTranslations("preview");
  const tErr = useTranslations("errors");
  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_COLORS[0].value);
  const [selectedSize, setSelectedSize] = useState(PHOTO_SIZES[0].value);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<
    Record<string, string> | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleProcess = useCallback(async () => {
    if (!file) return;

    setProcessingState("removing_bg");
    setErrorMessage(null);

    try {
      const { removeBackground } = await import("@imgly/background-removal");

      const blob = await removeBackground(file, {
        output: { format: "image/png", quality: 1 },
      });

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      setProcessingState("processing");

      // Process all sizes in parallel for download-all feature
      const results = await Promise.all(
        ALL_SIZES.map(async (size) => {
          const response = await fetch("/api/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: base64,
              backgroundColor: selectedBg,
              size,
              enhance: true,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Processing failed");
          }

          const data = await response.json();
          return { size, image: data.processedImage };
        }),
      );

      const resultMap: Record<string, string> = {};
      for (const r of results) {
        resultMap[r.size] = r.image;
      }

      setAllResults(resultMap);
      setResultUrl(resultMap[selectedSize]);
      setProcessingState("done");
    } catch (error) {
      console.error("Processing error:", error);
      let message: string;
      if (error instanceof TypeError && error.message.includes("fetch")) {
        message = tErr("networkError");
      } else if (error instanceof Error) {
        message = error.message;
      } else {
        message = tErr("processingFailed");
      }
      setErrorMessage(message);
      setProcessingState("error");
    }
  }, [file, selectedBg, selectedSize, tErr]);

  const handleDownload = useCallback(
    (size?: string) => {
      const sizeKey = size || selectedSize;
      const url = allResults?.[sizeKey] || resultUrl;
      if (!url) return;

      const link = document.createElement("a");
      link.href = url;
      link.download = `idphoto-${sizeKey}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [allResults, resultUrl, selectedSize],
  );

  const handleDownloadAll = useCallback(() => {
    if (!allResults) return;
    for (const size of ALL_SIZES) {
      if (allResults[size]) {
        setTimeout(() => handleDownload(size), ALL_SIZES.indexOf(size) * 300);
      }
    }
  }, [allResults, handleDownload]);

  const handleCheckout = useCallback(
    async (plan: "single" | "bundle") => {
      setIsCheckingOut(true);
      try {
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          setErrorMessage(tErr("networkError"));
        } else {
          setErrorMessage(tErr("processingFailed"));
        }
      } finally {
        setIsCheckingOut(false);
      }
    },
    [tErr],
  );

  if (!file || !previewUrl) return null;

  const isProcessing =
    processingState === "removing_bg" || processingState === "processing";

  return (
    <div className="w-full space-y-6">
      {/* Settings */}
      {processingState !== "done" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Background color */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("backgroundColor")}
            </label>
            <div className="flex gap-2">
              {BACKGROUND_COLORS.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => setSelectedBg(bg.value)}
                  disabled={isProcessing}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedBg === bg.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  } ${isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: bg.value }}
                  />
                  {t(bg.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Photo size */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("photoSize")}
            </label>
            <div className="flex flex-wrap gap-2">
              {PHOTO_SIZES.map((sz) => (
                <button
                  key={sz.value}
                  onClick={() => setSelectedSize(sz.value)}
                  disabled={isProcessing}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedSize === sz.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  } ${isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {t(sz.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image previews */}
      {processingState === "done" && resultUrl && previewUrl ? (
        /* Before/After slider when done */
        <BeforeAfterSlider
          beforeSrc={previewUrl}
          afterSrc={resultUrl}
          beforeAlt={t("original")}
          afterAlt={t("result")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Original image */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                {t("original")}
              </p>
              <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-muted">
                <Image
                  src={previewUrl}
                  alt={t("original")}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {file.name} &middot;{" "}
                {(file.size / (1024 * 1024)).toFixed(1)}MB
              </p>
            </CardContent>
          </Card>

          {/* Result preview */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                {t("result")}
              </p>
              <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {processingState === "idle" && (
                  <p className="text-sm text-muted-foreground px-6 text-center">
                    {t("idleMessage")}
                  </p>
                )}
                {processingState === "removing_bg" && (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {t("removingBg")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("removingBgNote")}
                    </p>
                  </div>
                )}
                {processingState === "processing" && (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {t("enhancing")}
                    </p>
                  </div>
                )}
                {processingState === "error" && (
                  <div className="flex flex-col items-center gap-3 px-6">
                    <p className="text-sm text-destructive text-center">
                      {errorMessage || t("errorDefault")}
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      {t("errorRetry")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {(processingState === "idle" || processingState === "error") && (
          <Button size="lg" onClick={handleProcess}>
            {t("processPhoto")}
          </Button>
        )}
        {isProcessing && (
          <Button size="lg" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {processingState === "removing_bg"
              ? t("removingBackground")
              : t("processing")}
          </Button>
        )}
        {processingState === "done" && (
          <>
            <Button size="lg" onClick={() => handleCheckout("single")} disabled={isCheckingOut}>
              <CreditCard className="mr-2 h-4 w-4" />
              {isCheckingOut ? t("processing") : t("payToDownload")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleDownloadAll}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("downloadAll")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setProcessingState("idle");
                setResultUrl(null);
                setAllResults(null);
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              {t("changeOptions")}
            </Button>
          </>
        )}
        <Button variant="outline" size="lg" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {t("uploadAnother")}
        </Button>
      </div>

      {/* Preview-only note */}
      {processingState === "done" && (
        <p className="text-xs text-center text-muted-foreground">
          {t("previewOnly")}
        </p>
      )}
    </div>
  );
}
