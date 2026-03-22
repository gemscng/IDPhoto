"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RotateCcw, Download, Check } from "lucide-react";

type ProcessingState = "idle" | "removing_bg" | "processing" | "done" | "error";

interface ImagePreviewProps {
  file: File | null;
  previewUrl: string | null;
  onReset: () => void;
}

const BACKGROUND_COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Light Blue", value: "#D6EAF8" },
  { label: "Light Grey", value: "#E8E8E8" },
];

const PHOTO_SIZES = [
  { label: "35×45mm (HK Standard)", value: "35x45" },
  { label: "25×35mm", value: "25x35" },
  { label: "Passport", value: "passport" },
];

export function ImagePreview({ file, previewUrl, onReset }: ImagePreviewProps) {
  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_COLORS[0].value);
  const [selectedSize, setSelectedSize] = useState(PHOTO_SIZES[0].value);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProcess = useCallback(async () => {
    if (!file) return;

    setProcessingState("removing_bg");
    setErrorMessage(null);

    try {
      // Step 1: Remove background using @imgly/background-removal (client-side)
      const { removeBackground } = await import("@imgly/background-removal");

      const blob = await removeBackground(file, {
        output: { format: "image/png", quality: 1 },
      });

      // Convert blob to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Step 2: Send to server for cropping, enhancement, and background replacement
      setProcessingState("processing");

      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          backgroundColor: selectedBg,
          size: selectedSize,
          enhance: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Processing failed");
      }

      const data = await response.json();
      setResultUrl(data.processedImage);
      setProcessingState("done");
    } catch (error) {
      console.error("Processing error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred.",
      );
      setProcessingState("error");
    }
  }, [file, selectedBg, selectedSize]);

  const handleDownload = useCallback(() => {
    if (!resultUrl) return;

    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = `idphoto-${selectedSize}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [resultUrl, selectedSize]);

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
              Background Color
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
                  {bg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo size */}
          <div>
            <label className="text-sm font-medium mb-2 block">Photo Size</label>
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
                  {sz.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image previews */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Original image */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Original
            </p>
            <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-muted">
              <Image
                src={previewUrl}
                alt="Original photo"
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
              Result
            </p>
            <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {processingState === "idle" && (
                <p className="text-sm text-muted-foreground px-6 text-center">
                  Select your options and click &ldquo;Process Photo&rdquo; to
                  generate your interview photo.
                </p>
              )}
              {processingState === "removing_bg" && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Removing background...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This may take a moment on first use
                  </p>
                </div>
              )}
              {processingState === "processing" && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Enhancing & cropping...
                  </p>
                </div>
              )}
              {processingState === "done" && resultUrl && (
                <Image
                  src={resultUrl}
                  alt="Processed photo"
                  fill
                  className="object-contain"
                />
              )}
              {processingState === "error" && (
                <div className="flex flex-col items-center gap-3 px-6">
                  <p className="text-sm text-destructive text-center">
                    {errorMessage || "Something went wrong."}
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    Try again or upload a different photo.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {(processingState === "idle" || processingState === "error") && (
          <Button size="lg" onClick={handleProcess}>
            Process Photo
          </Button>
        )}
        {isProcessing && (
          <Button size="lg" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {processingState === "removing_bg"
              ? "Removing Background..."
              : "Processing..."}
          </Button>
        )}
        {processingState === "done" && (
          <>
            <Button size="lg" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Photo
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setProcessingState("idle");
                setResultUrl(null);
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              Change Options
            </Button>
          </>
        )}
        <Button variant="outline" size="lg" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Upload Another
        </Button>
      </div>
    </div>
  );
}
