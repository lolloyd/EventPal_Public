export const photoTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const maxPhotoBytes = 40 * 1024 * 1024;

export type PhotoContentType = keyof typeof photoTypes;

/** Identify a supported image format from its magic bytes. Returns null if unknown. */
export function detectPhotoType(bytes: Uint8Array): PhotoContentType | null {
  if (!bytes || bytes.byteLength < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // WEBP
  ) return "image/webp";
  return null;
}

export function validatePhotoSignature(contentType: string, bytes: Uint8Array) {
  const detected = detectPhotoType(bytes);
  return detected !== null && detected === contentType;
}

export async function validatePhotoBytes(file: File) {
  if (!(file.type in photoTypes) || file.size === 0 || file.size > maxPhotoBytes) {
    return false;
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return validatePhotoSignature(file.type, bytes);
}