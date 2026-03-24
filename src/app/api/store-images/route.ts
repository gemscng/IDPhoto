import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { generateSessionKey, uploadImage } from "@/lib/storage";

interface StoreRequest {
  /** Map of size key to base64 data URI (e.g. { "35x45": "data:image/jpeg;base64,..." }) */
  images: Record<string, string>;
}

/**
 * POST /api/store-images
 * Stores processed images in Vercel Blob before initiating checkout.
 * Returns a sessionKey that links images to the Stripe checkout session.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = rateLimit(`store:${ip}`, { limit: 10, windowMs: 60_000 });
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

  try {
    const body: StoreRequest = await req.json();
    const { images } = body;

    if (!images || typeof images !== "object" || Object.keys(images).length === 0) {
      return NextResponse.json(
        { error: "Missing or empty images object." },
        { status: 400 },
      );
    }

    const validSizes = ["35x45", "25x35", "passport"];
    const entries = Object.entries(images);

    for (const [size] of entries) {
      if (!validSizes.includes(size)) {
        return NextResponse.json(
          { error: `Invalid size key: ${size}` },
          { status: 400 },
        );
      }
    }

    const sessionKey = generateSessionKey();

    // Upload all images in parallel
    await Promise.all(
      entries.map(async ([size, dataUri]) => {
        // Strip data URI prefix to get raw base64
        const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        await uploadImage(sessionKey, size, buffer);
      }),
    );

    return NextResponse.json({ sessionKey });
  } catch (error) {
    console.error("Store images error:", error);
    return NextResponse.json(
      { error: "Failed to store images." },
      { status: 500 },
    );
  }
}
