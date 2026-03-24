import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock stripe — must be a class constructor
vi.mock("stripe", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    url: "https://checkout.stripe.com/test-session",
  });
  class MockStripe {
    checkout = {
      sessions: {
        create: mockCreate,
      },
    };
  }
  return { default: MockStripe };
});

import { POST } from "@/app/api/create-checkout-session/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/create-checkout-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  });

  it("returns 400 when plan is missing", async () => {
    const req = makeRequest({ sessionKey: "test-key" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid plan");
  });

  it("returns 400 for invalid plan", async () => {
    const req = makeRequest({ plan: "enterprise", sessionKey: "test-key" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when sessionKey is missing", async () => {
    const req = makeRequest({ plan: "single" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("sessionKey");
  });

  it("returns checkout URL for single plan", async () => {
    const req = makeRequest({ plan: "single", sessionKey: "test-session-key" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe("https://checkout.stripe.com/test-session");
  });

  it("returns checkout URL for bundle plan", async () => {
    const req = makeRequest({ plan: "bundle", sessionKey: "test-session-key" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe("https://checkout.stripe.com/test-session");
  });
});
