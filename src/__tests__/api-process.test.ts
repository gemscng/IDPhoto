import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock sharp before importing the route
vi.mock("sharp", () => {
  const mockSharp = vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 800, height: 1000 }),
    ensureAlpha: vi.fn().mockReturnThis(),
    raw: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.alloc(800 * 1000 * 4, 255)),
    extract: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    modulate: vi.fn().mockReturnThis(),
    sharpen: vi.fn().mockReturnThis(),
    gamma: vi.fn().mockReturnThis(),
    flatten: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
  }));
  return { default: mockSharp };
});

import { POST } from "@/app/api/process/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Minimal 1x1 white PNG as base64
const TINY_IMAGE_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

describe("POST /api/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when image is missing", async () => {
    const req = makeRequest({ backgroundColor: "#FFFFFF", size: "35x45" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 400 when backgroundColor is missing", async () => {
    const req = makeRequest({ image: TINY_IMAGE_BASE64, size: "35x45" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when size is missing", async () => {
    const req = makeRequest({ image: TINY_IMAGE_BASE64, backgroundColor: "#FFFFFF" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid size", async () => {
    const req = makeRequest({
      image: TINY_IMAGE_BASE64,
      backgroundColor: "#FFFFFF",
      size: "99x99",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid size");
  });

  it("returns 400 for too-small images", async () => {
    const { default: sharp } = await import("sharp");
    (sharp as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      metadata: vi.fn().mockResolvedValue({ width: 50, height: 50 }),
      ensureAlpha: vi.fn().mockReturnThis(),
      raw: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.alloc(50 * 50 * 4)),
    });

    const req = makeRequest({
      image: TINY_IMAGE_BASE64,
      backgroundColor: "#FFFFFF",
      size: "35x45",
      enhance: false,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("too small");
  });

  it("returns 200 with processed image for valid input", async () => {
    const req = makeRequest({
      image: TINY_IMAGE_BASE64,
      backgroundColor: "#FFFFFF",
      size: "35x45",
      enhance: false,
    });
    const res = await POST(req);
    // With our mock returning all-255 alpha, subject is the full image
    // which passes the size check (800x1000 > 200x200)
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("processedImage");
    expect(data).toHaveProperty("metadata");
    expect(data.metadata.size).toBe("35×45mm (HK Standard)");
  });
});
