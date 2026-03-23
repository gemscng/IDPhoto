import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
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
  /** Base64-encoded image with background already removed (RGBA PNG) */
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

    // Decode the base64 image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const rawBuffer = Buffer.from(base64Data, "base64");

    // Get image metadata and downscale oversized images to avoid memory issues
    const initialMeta = await sharp(rawBuffer).metadata();
    const MAX_DIM = 2048;
    let imageBuffer: Buffer;
    if (
      (initialMeta.width! > MAX_DIM || initialMeta.height! > MAX_DIM)
    ) {
      imageBuffer = await sharp(rawBuffer)
        .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
        .ensureAlpha()
        .png()
        .toBuffer() as Buffer;
    } else {
      imageBuffer = rawBuffer;
    }

    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width!;
    const imgHeight = metadata.height!;

    // Validate image dimensions
    if (imgWidth < 200 || imgHeight < 200) {
      return NextResponse.json(
        { error: "Image is too small. Please upload a higher resolution photo (at least 500×500 pixels)." },
        { status: 400 },
      );
    }

    // Find the subject bounds (non-transparent area)
    const bounds = await findSubjectBounds(imageBuffer, imgWidth, imgHeight);

    // Check if any subject was found (face detection proxy)
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

    // Build the processing pipeline
    let pipeline = sharp(imageBuffer).ensureAlpha();

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

    // Apply basic enhancement
    if (enhance) {
      pipeline = pipeline
        .modulate({
          brightness: 1.05,
          saturation: 1.05,
        })
        .sharpen({ sigma: 0.8 })
        .gamma(1.1);
    }

    // Flatten onto background color (composites the RGBA image onto the solid color)
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
    return NextResponse.json(
      { error: "Failed to process image. Please try again." },
      { status: 500 },
    );
  }
}
