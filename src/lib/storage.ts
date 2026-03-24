import { put, del, list } from "@vercel/blob";
import crypto from "crypto";

/**
 * Generate a unique session key for grouping processed images.
 */
export function generateSessionKey(): string {
  return crypto.randomUUID();
}

/**
 * Upload a processed image to Vercel Blob storage.
 * Images are stored under: idphoto/{sessionKey}/{size}.jpg
 */
export async function uploadImage(
  sessionKey: string,
  size: string,
  imageBuffer: Buffer,
): Promise<string> {
  const pathname = `idphoto/${sessionKey}/${size}.jpg`;
  const blob = await put(pathname, imageBuffer, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: false,
  });
  return blob.url;
}

/**
 * List all images stored for a given session key.
 * Returns a map of size → blob URL.
 */
export async function listSessionImages(
  sessionKey: string,
): Promise<Record<string, string>> {
  const prefix = `idphoto/${sessionKey}/`;
  const { blobs } = await list({ prefix });

  const result: Record<string, string> = {};
  for (const blob of blobs) {
    // Extract size from pathname: idphoto/{sessionKey}/{size}.jpg
    const filename = blob.pathname.split("/").pop();
    if (filename) {
      const size = filename.replace(".jpg", "");
      result[size] = blob.url;
    }
  }
  return result;
}

/**
 * Delete all images for a session (for cleanup/expiry).
 */
export async function deleteSessionImages(
  sessionKey: string,
): Promise<void> {
  const prefix = `idphoto/${sessionKey}/`;
  const { blobs } = await list({ prefix });
  for (const blob of blobs) {
    await del(blob.url);
  }
}
