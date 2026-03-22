import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

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

// Standard photo sizes in pixels at 300 DPI
const SIZES: Record<string, { width: number; height: number; label: string }> = {
  "35x45": { width: 413, height: 531, label: "35×45mm (HK Standard)" },
  "25x35": { width: 295, height: 413, label: "25×35mm" },
  passport: { width: 413, height: 531, label: "Passport (35×45mm)" },
};

// Head-to-frame ratio targets
const HEAD_RATIO = { min: 0.65, target: 0.75, max: 0.85 };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
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
 * Estimate face region from the subject bounds.
 * Assumes the face is in the upper portion of the subject.
 * For a person standing upright, head is roughly the top 25-35% of subject height.
 */
function estimateFaceRegion(
  bounds: { top: number; bottom: number; left: number; right: number },
) {
  const subjectHeight = bounds.bottom - bounds.top;
  const subjectWidth = bounds.right - bounds.left;

  // Face is typically in the top 30% of the body, centered horizontally
  const faceTop = bounds.top;
  const faceBottom = bounds.top + subjectHeight * 0.35;
  const faceHeight = faceBottom - faceTop;
  const faceCenterX = bounds.left + subjectWidth / 2;
  const faceWidth = faceHeight * 0.75; // Face aspect ratio ~3:4

  return {
    top: faceTop,
    bottom: faceBottom,
    left: Math.max(bounds.left, faceCenterX - faceWidth / 2),
    right: Math.min(bounds.right, faceCenterX + faceWidth / 2),
    centerX: faceCenterX,
    centerY: (faceTop + faceBottom) / 2,
    height: faceHeight,
    width: faceWidth,
  };
}

/**
 * Calculate the crop region for the ID photo.
 * Centers the face and ensures proper head-to-frame ratio.
 */
function calculateCrop(
  imageWidth: number,
  imageHeight: number,
  face: ReturnType<typeof estimateFaceRegion>,
  targetAspect: number,
): { left: number; top: number; width: number; height: number } {
  // Target: face height should be HEAD_RATIO.target of the output height
  const cropHeight = Math.min(
    face.height / HEAD_RATIO.target,
    imageHeight,
  );
  const cropWidth = Math.min(cropHeight * targetAspect, imageWidth);

  // Center horizontally on face
  let left = Math.round(face.centerX - cropWidth / 2);
  // Position face in upper third of frame
  let top = Math.round(face.top - cropHeight * 0.15);

  // Clamp to image bounds
  left = Math.max(0, Math.min(left, imageWidth - cropWidth));
  top = Math.max(0, Math.min(top, imageHeight - cropHeight));

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}

export async function POST(req: NextRequest) {
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
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width!;
    const imgHeight = metadata.height!;

    // Find the subject bounds (non-transparent area)
    const bounds = await findSubjectBounds(imageBuffer, imgWidth, imgHeight);

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
