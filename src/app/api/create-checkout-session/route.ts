import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

const PLANS = {
  single: {
    name: "IDPhoto — Single Photo",
    amount: 5000, // HKD 50 in cents
    currency: "hkd",
    description: "1 professional interview photo in 3 standard HK sizes",
  },
  bundle: {
    name: "IDPhoto — Bundle (3 Photos)",
    amount: 10000, // HKD 100 in cents
    currency: "hkd",
    description: "3 professional interview photos in 3 standard HK sizes",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (!plan || !(plan in PLANS)) {
      return NextResponse.json(
        { error: "Invalid plan. Use 'single' or 'bundle'." },
        { status: 400 },
      );
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "http://localhost:3000";

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: planConfig.currency,
            product_data: {
              name: planConfig.name,
              description: planConfig.description,
            },
            unit_amount: planConfig.amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 },
    );
  }
}
