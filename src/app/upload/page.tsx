"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, ArrowLeft } from "lucide-react";
import { PhotoUpload } from "@/components/photo-upload";
import { ImagePreview } from "@/components/image-preview";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);

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
            <span className="font-bold text-lg text-foreground">IDPhoto</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {file ? "Preview your photo" : "Upload your photo"}
            </h1>
            <p className="mt-3 text-muted-foreground text-lg">
              {file
                ? "Check your photo and click process when ready."
                : "Upload a clear, front-facing photo of your child for the best results."}
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
              <h3 className="font-semibold mb-3">Tips for best results</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  &bull; Use a clear, front-facing photo with good lighting
                </li>
                <li>
                  &bull; Make sure your child&apos;s face is fully visible (no
                  hats or sunglasses)
                </li>
                <li>&bull; A neutral expression works best for interviews</li>
                <li>
                  &bull; The background doesn&apos;t matter — our AI will
                  replace it
                </li>
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-muted-foreground">
          <p>Your photos are processed securely and never shared.</p>
        </div>
      </footer>
    </div>
  );
}
