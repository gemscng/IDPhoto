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

// Head-to-frame ratio targets
export const HEAD_RATIO = { min: 0.65, target: 0.75, max: 0.85 };

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/**
 * Estimate face region from the subject bounds.
 * Assumes the face is in the upper portion of the subject.
 */
export function estimateFaceRegion(
  bounds: { top: number; bottom: number; left: number; right: number },
) {
  const subjectHeight = bounds.bottom - bounds.top;
  const subjectWidth = bounds.right - bounds.left;

  const faceTop = bounds.top;
  const faceBottom = bounds.top + subjectHeight * 0.35;
  const faceHeight = faceBottom - faceTop;
  const faceCenterX = bounds.left + subjectWidth / 2;
  const faceWidth = faceHeight * 0.75;

  return {
    top: faceTop,
    bottom: faceBottom,
    left: Math.max(bounds.left, faceCenterX - faceWidth / 2),
    right: Math.min(bounds.right, faceCenterX + faceWidth / 2),
    centerX: faceCenterX,
    centerY: (faceTop + faceBottom) / 2,
    height: faceHeight,
    width: faceWidth,
  };
}

/**
 * Calculate the crop region for the ID photo.
 * Centers the face and ensures proper head-to-frame ratio.
 */
export function calculateCrop(
  imageWidth: number,
  imageHeight: number,
  face: ReturnType<typeof estimateFaceRegion>,
  targetAspect: number,
): { left: number; top: number; width: number; height: number } {
  const cropHeight = Math.min(
    face.height / HEAD_RATIO.target,
    imageHeight,
  );
  const cropWidth = Math.min(cropHeight * targetAspect, imageWidth);

  let left = Math.round(face.centerX - cropWidth / 2);
  let top = Math.round(face.top - cropHeight * 0.15);

  left = Math.max(0, Math.min(left, imageWidth - cropWidth));
  top = Math.max(0, Math.min(top, imageHeight - cropHeight));

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}
