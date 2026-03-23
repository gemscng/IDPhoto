import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { fal } from "@fal-ai/client";
import {
  hexToRgb,
  estimateFaceRegion,
  calculateCrop,
  SIZES,
} from "@/lib/image-processing";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

interface ProcessRequest {
  /** Base64-encoded image (original photo, background not yet removed) */
  image: string;
  /** Background color hex (e.g. "#FFFFFF") */
  backgroundColor: string;
  /** Output size preset */
  size: "35x45" | "25x35" | "passport";
  /** Whether to apply auto-enhancement */
  enhance: boolean;
}

/**
 * Find the bounding box of non-transparent pixels (the subject).
 * Uses sharp to extract raw pixel data and scan for alpha > 0.
 */
async function findSubjectBounds(
  buffer: Buffer,
  width: number,
  height: number,
): Promise<{ top: number; bottom: number; left: number; right: number }> {
  const raw = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer();

  let top = height,
    bottom = 0,
    left = width,
    right = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = raw[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  return { top, bottom, left, right };
}

/**
 * Process the image using fal.ai Nano Banana Pro for background removal
 * and professional ID photo generation.
 */
async function processWithNanoBanana(
  imageBase64: string,
  backgroundColor: string,
): Promise<Buffer> {
  fal.config({ credentials: process.env.FAL_KEY });

  const colorName = getColorName(backgroundColor);
  const prompt = `Remove the background from this photo and replace it with a solid ${colorName} background (exact hex: ${backgroundColor}). This is for an official ID/passport photo. Keep the person exactly as they are — do not change their face, expression, clothing, or appearance in any way. The background must be a perfectly uniform solid ${colorName} color with no gradients, shadows, or variations. Maintain professional photo quality with good lighting on the subject.`;

  const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
    input: {
      prompt,
      image_urls: [imageBase64],
      num_images: 1,
      output_format: "png",
      resolution: "1K",
    },
  });

  const output = result.data as {
    images: Array<{ url: string }>;
  };

  if (!output.images || output.images.length === 0) {
    throw new Error("No image returned from Nano Banana Pro");
  }

  const imageUrl = output.images[0].url;
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Failed to download processed image from fal.ai");
  }

  return Buffer.from(await response.arrayBuffer());
}

function getColorName(hex: string): string {
  const map: Record<string, string> = {
    "#FFFFFF": "white",
    "#D6EAF8": "light blue",
    "#E8E8E8": "light grey",
  };
  return map[hex.toUpperCase()] || hex;
}

export async function POST(req: NextRequest) {
  // Rate limit: 20 requests per minute per IP
  const ip = getClientIp(req.headers);
  const rl = rateLimit(`process:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  // Validate Content-Length before parsing (reject >10MB bodies early)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Request body too large. Maximum size is 10MB." },
      { status: 413 },
    );
  }

  try {
    const body: ProcessRequest = await req.json();
    const { image, backgroundColor, size, enhance } = body;

    if (!image || !backgroundColor || !size) {
      return NextResponse.json(
        { error: "Missing required fields: image, backgroundColor, size" },
        { status: 400 },
      );
    }

    const sizeConfig = SIZES[size];
    if (!sizeConfig) {
      return NextResponse.json(
        { error: `Invalid size. Use: ${Object.keys(SIZES).join(", ")}` },
        { status: 400 },
      );
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: "AI processing is not configured. Please set FAL_KEY." },
        { status: 503 },
      );
    }

    // Ensure we have a proper data URI for fal.ai
    const imageDataUri = image.startsWith("data:")
      ? image
      : `data:image/jpeg;base64,${image}`;

    // Send to Nano Banana Pro for AI-powered background removal + replacement
    const aiProcessedBuffer = await processWithNanoBanana(
      imageDataUri,
      backgroundColor,
    );

    // Get metadata of the AI-processed image
    const metadata = await sharp(aiProcessedBuffer).metadata();
    const imgWidth = metadata.width!;
    const imgHeight = metadata.height!;

    // Validate image dimensions
    if (imgWidth < 200 || imgHeight < 200) {
      return NextResponse.json(
        { error: "Image is too small. Please upload a higher resolution photo (at least 500×500 pixels)." },
        { status: 400 },
      );
    }

    // Find subject bounds in the AI-processed image for precise cropping
    const boundsBuffer = await sharp(aiProcessedBuffer).ensureAlpha().png().toBuffer();
    const bounds = await findSubjectBounds(boundsBuffer as Buffer, imgWidth, imgHeight);

    // Check if any subject was found
    const subjectHeight = bounds.bottom - bounds.top;
    const subjectWidth = bounds.right - bounds.left;
    if (subjectHeight < 50 || subjectWidth < 50) {
      return NextResponse.json(
        { error: "No face detected in the photo. Please upload a clear, front-facing photo." },
        { status: 400 },
      );
    }

    // Estimate face position
    const face = estimateFaceRegion(bounds);

    // Calculate crop region
    const targetAspect = sizeConfig.width / sizeConfig.height;
    const crop = calculateCrop(imgWidth, imgHeight, face, targetAspect);

    // Create the background color
    const bgColor = hexToRgb(backgroundColor);

    // Build the processing pipeline with Sharp for precise cropping
    let pipeline = sharp(aiProcessedBuffer);

    // Crop to the calculated region
    pipeline = pipeline.extract({
      left: crop.left,
      top: crop.top,
      width: crop.width,
      height: crop.height,
    });

    // Resize to target dimensions
    pipeline = pipeline.resize(sizeConfig.width, sizeConfig.height, {
      fit: "cover",
      position: "centre",
    });

    // Apply basic enhancement if requested
    if (enhance) {
      pipeline = pipeline
        .modulate({
          brightness: 1.05,
          saturation: 1.05,
        })
        .sharpen({ sigma: 0.8 })
        .gamma(1.1);
    }

    // Flatten onto background color (ensures solid background)
    pipeline = pipeline.flatten({
      background: bgColor,
    });

    // Output as high-quality JPEG
    const outputBuffer = await pipeline.jpeg({ quality: 95 }).toBuffer();

    const outputBase64 = `data:image/jpeg;base64,${outputBuffer.toString("base64")}`;

    return NextResponse.json({
      processedImage: outputBase64,
      metadata: {
        size: sizeConfig.label,
        dimensions: `${sizeConfig.width}×${sizeConfig.height}px`,
        backgroundColor,
      },
    });
  } catch (error) {
    console.error("Processing error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process image";
    return NextResponse.json(
      { error: `Processing failed: ${message}. Please try again.` },
      { status: 500 },
    );
  }
}
