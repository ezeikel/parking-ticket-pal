type CompressionResult = {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
};

const MAX_DIMENSION = 2048;
const TARGET_SIZE = 1_000_000; // 1MB
const INITIAL_QUALITY = 0.8;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.1;
const SKIP_THRESHOLD = 1_000_000; // 1MB — don't compress files already under this

/**
 * Compress an image file using the Canvas API.
 *
 * - Skips PDFs and non-image files (returns original)
 * - Skips files already under 1MB
 * - Downscales to max 2048px on longest edge
 * - Iteratively reduces JPEG quality (0.8 → 0.4) until under 1MB
 * - Always outputs JPEG
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  // Pass through non-image files (PDFs, etc.)
  if (!file.type.startsWith("image/")) {
    return { file, originalSize, compressedSize: originalSize, wasCompressed: false };
  }

  // Skip files already under threshold
  if (file.size <= SKIP_THRESHOLD) {
    return { file, originalSize, compressedSize: originalSize, wasCompressed: false };
  }

  // Load the image as a bitmap (promise-based, memory-efficient)
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate scaled dimensions (max 2048px on longest edge)
  let targetWidth = width;
  let targetHeight = height;
  const longest = Math.max(width, height);

  if (longest > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longest;
    targetWidth = Math.round(width * scale);
    targetHeight = Math.round(height * scale);
  }

  // Draw to canvas
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    // Canvas context unavailable — return original
    bitmap.close();
    return { file, originalSize, compressedSize: originalSize, wasCompressed: false };
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  // Iteratively reduce quality until under target size
  let quality = INITIAL_QUALITY;
  let blob: Blob | null = null;

  while (quality >= MIN_QUALITY) {
    blob = await canvas.convertToBlob({ type: "image/jpeg", quality });

    if (blob.size <= TARGET_SIZE) {
      break;
    }

    quality -= QUALITY_STEP;
  }

  // If we still don't have a blob (shouldn't happen), fall back
  if (!blob) {
    return { file, originalSize, compressedSize: originalSize, wasCompressed: false };
  }

  // Build a new File from the compressed blob
  const compressedFile = new File(
    [blob],
    file.name.replace(/\.[^.]+$/, ".jpg"),
    { type: "image/jpeg" },
  );

  return {
    file: compressedFile,
    originalSize,
    compressedSize: compressedFile.size,
    wasCompressed: true,
  };
}
