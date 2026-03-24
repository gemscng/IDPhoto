import { describe, it, expect } from "vitest";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests within the limit", async () => {
    const key = `test-allow-${Date.now()}`;
    const config = { limit: 3, windowMs: 60_000 };

    expect((await rateLimit(key, config)).allowed).toBe(true);
    expect((await rateLimit(key, config)).allowed).toBe(true);
    expect((await rateLimit(key, config)).allowed).toBe(true);
  });

  it("blocks requests over the limit", async () => {
    const key = `test-block-${Date.now()}`;
    const config = { limit: 2, windowMs: 60_000 };

    await rateLimit(key, config);
    await rateLimit(key, config);
    const result = await rateLimit(key, config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks remaining count", async () => {
    const key = `test-remaining-${Date.now()}`;
    const config = { limit: 5, windowMs: 60_000 };

    expect((await rateLimit(key, config)).remaining).toBe(4);
    expect((await rateLimit(key, config)).remaining).toBe(3);
    expect((await rateLimit(key, config)).remaining).toBe(2);
  });

  it("uses separate windows for different keys", async () => {
    const config = { limit: 1, windowMs: 60_000 };

    const key1 = `test-key1-${Date.now()}`;
    const key2 = `test-key2-${Date.now()}`;

    expect((await rateLimit(key1, config)).allowed).toBe(true);
    expect((await rateLimit(key2, config)).allowed).toBe(true);

    // Both should now be blocked
    expect((await rateLimit(key1, config)).allowed).toBe(false);
    expect((await rateLimit(key2, config)).allowed).toBe(false);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "10.0.0.1" });
    expect(getClientIp(headers)).toBe("10.0.0.1");
  });

  it("returns unknown when no IP headers present", () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe("unknown");
  });
});
