import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  Sparkles,
  Download,
  Camera,
  CheckCircle2,
} from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload",
    description:
      "Upload any casual photo of your child — phone photos work great.",
  },
  {
    icon: Sparkles,
    title: "AI Enhancement",
    description:
      "Our AI removes the background, centers the face, and enhances the image.",
  },
  {
    icon: Download,
    title: "Download",
    description:
      "Get your studio-quality interview photo in standard HK sizes, ready to print.",
  },
];

const pricingFeatures = [
  "AI background removal & replacement",
  "Auto face detection & centering",
  "Brightness & contrast enhancement",
  "Multiple standard sizes (35×45mm, 25×35mm, passport)",
  "Instant digital download",
  "Unlimited re-edits",
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">IDPhoto</span>
          </div>
          <Link href="/upload">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-32 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Professional interview photos
            <br />
            <span className="text-muted-foreground">
              for your child in seconds.
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Skip the expensive photo studio. Upload a photo of your child and
            get a studio-quality interview photo powered by AI.{" "}
            <span className="font-semibold text-foreground">From HKD 50.</span>
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/upload">
              <Button size="lg" className="w-full sm:w-auto text-base px-8">
                <Upload className="mr-2 h-5 w-5" />
                Upload Photo
              </Button>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium h-9 px-8 w-full sm:w-auto text-base transition-colors"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t bg-muted/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-center">
            How it works
          </h2>
          <p className="mt-4 text-muted-foreground text-center text-lg max-w-xl mx-auto">
            Three simple steps to get your child&apos;s perfect interview photo.
          </p>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <Card key={step.title} className="relative text-center">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-center">
            Simple pricing
          </h2>
          <p className="mt-4 text-muted-foreground text-center text-lg max-w-xl mx-auto">
            Pay per photo. No subscriptions, no hidden fees.
          </p>
          <Card className="mt-14 max-w-md mx-auto">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Per Photo
                </p>
                <p className="mt-3 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">HKD 50</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  ~USD 6.50
                </p>
              </div>
              <ul className="mt-8 space-y-3">
                {pricingFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/upload" className="block mt-8">
                <Button className="w-full" size="lg">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span>IDPhoto</span>
          </div>
          <p>&copy; 2026 IDPhoto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
