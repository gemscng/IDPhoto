import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events. Currently logs checkout.session.completed
 * for audit purposes. Payment verification is done at download time by
 * checking session.payment_status directly with the Stripe API.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        `Payment completed: session=${session.id}, sessionKey=${session.metadata?.sessionKey}, amount=${session.amount_total}, currency=${session.currency}`,
      );
      // Payment verification happens at download time via /api/download
      // by checking session.payment_status with the Stripe API directly.
      // This webhook serves as an audit log and could be extended for
      // email notifications, analytics, etc.
      break;
    }
    default:
      // Unhandled event types are acknowledged but ignored
      break;
  }

  return NextResponse.json({ received: true });
}
