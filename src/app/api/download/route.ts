import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { listSessionImages } from "@/lib/storage";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

/**
 * GET /api/download?session_id=cs_xxx
 * Verifies payment via Stripe API and returns download URLs for the stored images.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = rateLimit(`download:${ip}`, { limit: 30, windowMs: 60_000 });
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

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing session_id parameter." },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();

    // Verify payment status directly with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment has not been completed." },
        { status: 402 },
      );
    }

    const sessionKey = session.metadata?.sessionKey;
    if (!sessionKey) {
      return NextResponse.json(
        { error: "No images associated with this payment session." },
        { status: 404 },
      );
    }

    // Get the stored image URLs
    const images = await listSessionImages(sessionKey);

    if (Object.keys(images).length === 0) {
      return NextResponse.json(
        { error: "Images not found. They may have expired." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      images,
      paymentStatus: session.payment_status,
    });
  } catch (error) {
    console.error("Download verification error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: "Invalid or expired payment session." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to verify payment." },
      { status: 500 },
    );
  }
}
