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
  it("estimates face in the upper portion of the image", () => {
    const face = estimateFaceRegion(800, 1200);

    expect(face.top).toBe(1200 * 0.05); // 60
    expect(face.bottom).toBe(1200 * 0.40); // 480
    expect(face.height).toBe(face.bottom - face.top);
  });

  it("centers face horizontally on the image", () => {
    const face = estimateFaceRegion(800, 1200);

    expect(face.centerX).toBe(400); // 800 / 2
  });

  it("calculates face width as 75% of face height", () => {
    const face = estimateFaceRegion(800, 1200);

    expect(face.width).toBe(face.height * 0.75);
  });

  it("clamps face left/right to image bounds", () => {
    // Narrow image — face width might exceed image bounds
    const face = estimateFaceRegion(50, 1000);

    expect(face.left).toBeGreaterThanOrEqual(0);
    expect(face.right).toBeLessThanOrEqual(50);
  });
});

describe("calculateCrop", () => {
  it("returns crop dimensions within image bounds", () => {
    const face = estimateFaceRegion(800, 1200);
    const crop = calculateCrop(800, 1200, face, SIZES["35x45"].width / SIZES["35x45"].height);

    expect(crop.left).toBeGreaterThanOrEqual(0);
    expect(crop.top).toBeGreaterThanOrEqual(0);
    expect(crop.left + crop.width).toBeLessThanOrEqual(800);
    expect(crop.top + crop.height).toBeLessThanOrEqual(1200);
  });

  it("produces a crop with correct aspect ratio (within rounding)", () => {
    const face = estimateFaceRegion(800, 1200);
    const targetAspect = SIZES["35x45"].width / SIZES["35x45"].height;
    const crop = calculateCrop(800, 1200, face, targetAspect);

    const actualAspect = crop.width / crop.height;
    expect(Math.abs(actualAspect - targetAspect)).toBeLessThan(0.02);
  });

  it("clamps crop to image when face is near edge", () => {
    const face = estimateFaceRegion(300, 500);
    const crop = calculateCrop(300, 500, face, SIZES["25x35"].width / SIZES["25x35"].height);

    expect(crop.left).toBeGreaterThanOrEqual(0);
    expect(crop.top).toBeGreaterThanOrEqual(0);
  });

  it("limits crop height to image height", () => {
    // Very small image — crop should not exceed image
    const face = estimateFaceRegion(100, 100);
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
