import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  estimateFaceRegion,
  calculateCrop,
  SIZES,
  HEAD_RATIO,
} from "@/lib/image-processing";

describe("hexToRgb", () => {
  it("converts standard hex with hash", () => {
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("converts hex without hash", () => {
    expect(hexToRgb("FF0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("converts black", () => {
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("converts arbitrary color", () => {
    expect(hexToRgb("#4A90D9")).toEqual({ r: 74, g: 144, b: 217 });
  });

  it("handles lowercase hex", () => {
    expect(hexToRgb("#ff8800")).toEqual({ r: 255, g: 136, b: 0 });
  });
});

describe("estimateFaceRegion", () => {
  it("estimates face in the top 35% of subject", () => {
    const bounds = { top: 100, bottom: 1100, left: 200, right: 600 };
    const face = estimateFaceRegion(bounds);

    expect(face.top).toBe(100);
    expect(face.bottom).toBe(100 + 1000 * 0.35); // 450
    expect(face.height).toBe(350);
  });

  it("centers face horizontally on subject", () => {
    const bounds = { top: 0, bottom: 1000, left: 100, right: 500 };
    const face = estimateFaceRegion(bounds);

    expect(face.centerX).toBe(300); // (100 + 500) / 2
  });

  it("calculates face width as 75% of face height", () => {
    const bounds = { top: 0, bottom: 1000, left: 0, right: 400 };
    const face = estimateFaceRegion(bounds);

    expect(face.width).toBe(face.height * 0.75);
  });

  it("clamps face left/right to subject bounds", () => {
    // Narrow subject — face width might exceed subject bounds
    const bounds = { top: 0, bottom: 1000, left: 190, right: 210 };
    const face = estimateFaceRegion(bounds);

    expect(face.left).toBeGreaterThanOrEqual(bounds.left);
    expect(face.right).toBeLessThanOrEqual(bounds.right);
  });
});

describe("calculateCrop", () => {
  const makeFace = (bounds: { top: number; bottom: number; left: number; right: number }) =>
    estimateFaceRegion(bounds);

  it("returns crop dimensions within image bounds", () => {
    const face = makeFace({ top: 100, bottom: 900, left: 200, right: 600 });
    const crop = calculateCrop(800, 1200, face, SIZES["35x45"].width / SIZES["35x45"].height);

    expect(crop.left).toBeGreaterThanOrEqual(0);
    expect(crop.top).toBeGreaterThanOrEqual(0);
    expect(crop.left + crop.width).toBeLessThanOrEqual(800);
    expect(crop.top + crop.height).toBeLessThanOrEqual(1200);
  });

  it("produces a crop with correct aspect ratio (within rounding)", () => {
    const face = makeFace({ top: 100, bottom: 900, left: 200, right: 600 });
    const targetAspect = SIZES["35x45"].width / SIZES["35x45"].height;
    const crop = calculateCrop(800, 1200, face, targetAspect);

    const actualAspect = crop.width / crop.height;
    expect(Math.abs(actualAspect - targetAspect)).toBeLessThan(0.02);
  });

  it("clamps crop to image when face is near edge", () => {
    const face = makeFace({ top: 0, bottom: 500, left: 0, right: 300 });
    const crop = calculateCrop(300, 500, face, SIZES["25x35"].width / SIZES["25x35"].height);

    expect(crop.left).toBeGreaterThanOrEqual(0);
    expect(crop.top).toBeGreaterThanOrEqual(0);
  });

  it("limits crop height to image height", () => {
    // Very small image relative to face — crop should not exceed image
    const face = makeFace({ top: 0, bottom: 100, left: 0, right: 100 });
    const crop = calculateCrop(100, 100, face, 1);

    expect(crop.height).toBeLessThanOrEqual(100);
    expect(crop.width).toBeLessThanOrEqual(100);
  });
});

describe("SIZES", () => {
  it("has all expected presets", () => {
    expect(Object.keys(SIZES)).toEqual(["35x45", "25x35", "passport"]);
  });

  it("35x45 and passport have same dimensions", () => {
    expect(SIZES["35x45"].width).toBe(SIZES["passport"].width);
    expect(SIZES["35x45"].height).toBe(SIZES["passport"].height);
  });

  it("25x35 is smaller than 35x45", () => {
    expect(SIZES["25x35"].width).toBeLessThan(SIZES["35x45"].width);
  });
});

describe("HEAD_RATIO", () => {
  it("has min < target < max", () => {
    expect(HEAD_RATIO.min).toBeLessThan(HEAD_RATIO.target);
    expect(HEAD_RATIO.target).toBeLessThan(HEAD_RATIO.max);
  });
});
