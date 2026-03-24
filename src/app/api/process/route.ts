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
  /** Base64-encoded image (original photo, background not yet removed) */
  image: string;
  /** Background color hex (e.g. "#FFFFFF") */
  backgroundColor: string;
  /** Output size preset (single) or array of presets (batch) */
  size: string | string[];
  /** Whether to apply auto-enhancement */
  enhance: boolean;
}

/**
 * Process the image using Gemini API for background removal
 * and professional ID photo generation.
 */
async function processWithGemini(
  imageBase64: string,
  backgroundColor: string,
): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Strip data URI prefix to get raw base64
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const mimeType = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  const colorName = getColorName(backgroundColor);
  const prompt = `Edit this photo: remove the background and replace it with a solid ${colorName} (${backgroundColor}) color. This is a PHOTO EDIT, not a regeneration.

CRITICAL — DO NOT CHANGE THE PERSON:
- This is the #1 rule. The face, body, hair, and clothing must be PIXEL-LEVEL FAITHFUL to the input.
- Do NOT regenerate, redraw, smooth, reshape, or beautify any part of the person. Copy the person exactly as they are.
- Every facial feature — wrinkles, moles, blemishes, scars, asymmetries, skin texture — must remain identical.
- Hair style, hair color, clothing, accessories, and jewelry must be unchanged.
- Skin tone and complexion must match the original exactly. No whitening, tanning, or color shifts.
- If you are unsure about a detail, keep the original pixel data.

BACKGROUND ONLY:
- Replace ONLY the background with a perfectly uniform flat solid ${colorName} color (hex: ${backgroundColor}).
- No gradients, no shadows, no vignetting, no color variation in the background.
- Clean edges around hair and shoulders — no halos, fringing, or rough cutouts.
- Remove all background objects and environmental elements.

MINIMAL LIGHTING ADJUSTMENT:
- You may SLIGHTLY even out harsh shadows on the face, but do not alter skin color or texture.
- Do not over-brighten or over-smooth. Subtle adjustments only.
- Preserve the natural look of the original photo.

FRAMING:
- Keep the full head (including top of hair) and shoulders. Do not crop.
- Output at the same resolution as input.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          temperature: 0.2,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  const candidates = result.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No response from Gemini API");
  }

  // Find the image part in the response
  const parts = candidates[0].content?.parts;
  if (!parts) {
    throw new Error("No content parts in Gemini response");
  }

  const imagePart = parts.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith("image/"),
  );
  if (!imagePart?.inlineData?.data) {
    throw new Error("No image returned from Gemini API");
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

function getColorName(hex: string): string {
  const map: Record<string, string> = {
    "#FFFFFF": "white",
    "#D6EAF8": "light blue",
    "#E8E8E8": "light grey",
  };
  return map[hex.toUpperCase()] || hex;
}

/**
 * Crop and resize the AI-processed image to a specific ID photo size.
 */
async function cropToSize(
  aiProcessedBuffer: Buffer,
  imgWidth: number,
  imgHeight: number,
  face: ReturnType<typeof estimateFaceRegion>,
  sizeKey: string,
  backgroundColor: string,
  enhance: boolean,
): Promise<{ size: string; image: string; metadata: Record<string, string> }> {
  const sizeConfig = SIZES[sizeKey];
  const targetAspect = sizeConfig.width / sizeConfig.height;
  const crop = calculateCrop(imgWidth, imgHeight, face, targetAspect);
  const bgColor = hexToRgb(backgroundColor);

  let pipeline = sharp(aiProcessedBuffer);

  pipeline = pipeline.extract({
    left: crop.left,
    top: crop.top,
    width: crop.width,
    height: crop.height,
  });

  pipeline = pipeline.resize(sizeConfig.width, sizeConfig.height, {
    fit: "cover",
    position: "centre",
  });

  if (enhance) {
    pipeline = pipeline
      .modulate({
        brightness: 1.08,
        saturation: 1.10,
      })
      .sharpen({ sigma: 1.0, m1: 1.5, m2: 0.7 })
      .gamma(1.05)
      .normalise({ lower: 1, upper: 99 });
  }

  pipeline = pipeline.flatten({ background: bgColor });

  const outputBuffer = await pipeline.jpeg({ quality: 98, chromaSubsampling: "4:4:4" }).toBuffer();
  const outputBase64 = `data:image/jpeg;base64,${outputBuffer.toString("base64")}`;

  return {
    size: sizeKey,
    image: outputBase64,
    metadata: {
      size: sizeConfig.label,
      dimensions: `${sizeConfig.width}×${sizeConfig.height}px`,
      backgroundColor,
    },
  };
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 requests per minute per IP (reduced since batch does more per call)
  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`process:${ip}`, { limit: 10, windowMs: 60_000 });
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
    const { image, backgroundColor, enhance } = body;

    // Normalize size to an array for batch processing
    const sizes = Array.isArray(body.size) ? body.size : [body.size];

    if (!image || !backgroundColor || sizes.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: image, backgroundColor, size" },
        { status: 400 },
      );
    }

    // Validate all requested sizes
    for (const s of sizes) {
      if (!SIZES[s]) {
        return NextResponse.json(
          { error: `Invalid size "${s}". Use: ${Object.keys(SIZES).join(", ")}` },
          { status: 400 },
        );
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI processing is not configured. Please set GEMINI_API_KEY." },
        { status: 503 },
      );
    }

    // Ensure we have a proper data URI for Gemini
    const imageDataUri = image.startsWith("data:")
      ? image
      : `data:image/jpeg;base64,${image}`;

    // Single Gemini call for background removal
    const aiProcessedBuffer = await processWithGemini(
      imageDataUri,
      backgroundColor,
    );

    // Get metadata of the AI-processed image
    const metadata = await sharp(aiProcessedBuffer).metadata();
    const imgWidth = metadata.width!;
    const imgHeight = metadata.height!;

    if (imgWidth < 200 || imgHeight < 200) {
      return NextResponse.json(
        { error: "Image is too small. Please upload a higher resolution photo (at least 500×500 pixels)." },
        { status: 400 },
      );
    }

    // Estimate face region from the full AI-processed image
    const face = estimateFaceRegion(imgWidth, imgHeight);

    // Crop to all requested sizes in parallel
    const results = await Promise.all(
      sizes.map((s) =>
        cropToSize(aiProcessedBuffer, imgWidth, imgHeight, face, s, backgroundColor, enhance),
      ),
    );

    // If single size requested (backward-compatible), return flat response
    if (results.length === 1) {
      return NextResponse.json({
        processedImage: results[0].image,
        metadata: results[0].metadata,
      });
    }

    // Batch response: map of size -> result
    const batchResults: Record<string, string> = {};
    const batchMetadata: Record<string, Record<string, string>> = {};
    for (const r of results) {
      batchResults[r.size] = r.image;
      batchMetadata[r.size] = r.metadata;
    }

    return NextResponse.json({
      results: batchResults,
      metadata: batchMetadata,
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
