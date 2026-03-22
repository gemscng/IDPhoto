"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RotateCcw, Download } from "lucide-react";

type ProcessingState = "idle" | "processing" | "done";

interface ImagePreviewProps {
  file: File | null;
  previewUrl: string | null;
  onReset: () => void;
}

export function ImagePreview({ file, previewUrl, onReset }: ImagePreviewProps) {
  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");

  if (!file || !previewUrl) return null;

  const handleProcess = () => {
    setProcessingState("processing");
    // Simulate processing — will be replaced with real AI pipeline
    setTimeout(() => {
      setProcessingState("done");
    }, 2000);
  };

  return (
    <div className="w-full space-y-6">
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
                  Click &ldquo;Process Photo&rdquo; to generate your interview
                  photo.
                </p>
              )}
              {processingState === "processing" && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Processing...</p>
                </div>
              )}
              {processingState === "done" && (
                <>
                  <Image
                    src={previewUrl}
                    alt="Processed photo"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-end justify-center pb-4">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Preview — AI processing coming soon
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {processingState === "idle" && (
          <Button size="lg" onClick={handleProcess}>
            Process Photo
          </Button>
        )}
        {processingState === "processing" && (
          <Button size="lg" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </Button>
        )}
        {processingState === "done" && (
          <Button size="lg" disabled>
            <Download className="mr-2 h-4 w-4" />
            Download (coming soon)
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Upload Another
        </Button>
      </div>
    </div>
  );
}
