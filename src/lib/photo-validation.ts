export const photoTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const maxPhotoBytes = 40 * 1024 * 1024;

export function validatePhotoSignature(contentType: string, bytes: Uint8Array) {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    Buffer.from(bytes.slice(0, 4)).toString("ascii") === "RIFF" &&
    Buffer.from(bytes.slice(8, 12)).toString("ascii") === "WEBP";
  return (
    (contentType === "image/jpeg" && isJpeg) ||
    (contentType === "image/png" && isPng) ||
    (contentType === "image/webp" && isWebp)
  );
}

export async function validatePhotoBytes(file: File) {
  if (!(file.type in photoTypes) || file.size === 0 || file.size > maxPhotoBytes) {
    return false;
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return validatePhotoSignature(file.type, bytes);
}