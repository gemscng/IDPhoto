/**
 * Image processing utility functions for ID photo generation.
 * Extracted for testability.
 */

// Standard photo sizes in pixels at 300 DPI
export const SIZES: Record<string, { width: number; height: number; label: string }> = {
  "35x45": { width: 413, height: 531, label: "35×45mm (HK Standard)" },
  "25x35": { width: 295, height: 413, label: "25×35mm" },
  passport: { width: 413, height: 531, label: "Passport (35×45mm)" },
};

// Head-to-frame ratio targets (ICAO standard: head 70-80% of photo height)
export const HEAD_RATIO = { min: 0.60, target: 0.70, max: 0.80 };

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/**
 * Estimate face region from image dimensions.
 * After background removal, the subject typically occupies the center of the image.
 * The face is estimated as roughly the top 30-35% of the image, centered horizontally.
 */
export function estimateFaceRegion(
  imageWidth: number,
  imageHeight: number,
) {
  // Assume the subject is roughly centered and the head is in the upper portion
  const faceTop = imageHeight * 0.05;
  const faceBottom = imageHeight * 0.40;
  const faceHeight = faceBottom - faceTop;
  const faceCenterX = imageWidth / 2;
  const faceWidth = faceHeight * 0.75;

  return {
    top: faceTop,
    bottom: faceBottom,
    left: Math.max(0, faceCenterX - faceWidth / 2),
    right: Math.min(imageWidth, faceCenterX + faceWidth / 2),
    centerX: faceCenterX,
    centerY: (faceTop + faceBottom) / 2,
    height: faceHeight,
    width: faceWidth,
  };
}

/**
 * Calculate the crop region for the ID photo.
 * Centers the face and ensures proper head-to-frame ratio.
 * Positions the head in the upper portion with space above for standard ID photo framing.
 */
export function calculateCrop(
  imageWidth: number,
  imageHeight: number,
  face: ReturnType<typeof estimateFaceRegion>,
  targetAspect: number,
): { left: number; top: number; width: number; height: number } {
  // Calculate crop height based on head-to-frame ratio
  const cropHeight = Math.min(
    face.height / HEAD_RATIO.target,
    imageHeight,
  );
  const cropWidth = Math.min(cropHeight * targetAspect, imageWidth);

  // Position the crop so there's ~10-15% space above the head (standard for ID photos)
  let left = Math.round(face.centerX - cropWidth / 2);
  let top = Math.round(face.top - cropHeight * 0.10);

  // Clamp to image bounds
  left = Math.max(0, Math.min(left, imageWidth - cropWidth));
  top = Math.max(0, Math.min(top, imageHeight - cropHeight));

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}
