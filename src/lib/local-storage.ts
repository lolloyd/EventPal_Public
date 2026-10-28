import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { isLocalDemoMode } from "@/lib/event-auth";
import { getDemoPhotoFile, removeDemoPhotoFile } from "@/lib/demo-photo-storage";
import { detectPhotoType, maxPhotoBytes, photoTypes, validatePhotoSignature } from "@/lib/photo-validation";

export function getStorageRoot(): string {
  const customDir = process.env.HEYPAL_STORAGE_DIR;
  if (customDir) {
    return path.resolve(customDir);
  }
  return path.resolve(process.cwd(), "Events");
}

export function safeResolveStoragePath(subPath: string): string {
  if (!subPath || typeof subPath !== "string") {
    throw new Error("Invalid storage path.");
  }
  if (subPath.includes("\0")) {
    throw new Error("Invalid path characters.");
  }
  // Disallow explicit parent navigation
  const segments = subPath.split(/[\\/]/).filter(Boolean);
  if (segments.includes("..")) {
    throw new Error("Path traversal is not permitted.");
  }

  const root = getStorageRoot();
  const normalized = path.normalize(subPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const resolved = path.resolve(root, normalized);

  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("Path traversal is not permitted.");
  }

  return resolved;
}

export async function ensureStorageDirectories(): Promise<void> {
  const root = getStorageRoot();
  await Promise.all([
    fs.promises.mkdir(path.join(root, "covers"), { recursive: true }),
    fs.promises.mkdir(path.join(root, "photos"), { recursive: true }),
    fs.promises.mkdir(path.join(root, "exports"), { recursive: true }),
    fs.promises.mkdir(path.join(root, "database"), { recursive: true }),
  ]);
}

export async function uploadEventCover(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024 || file.size === 0) {
    throw new Error("Choose a JPEG, PNG, or WebP image smaller than 5 MB.");
  }

  const imageBytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = (file.type && file.type in photoTypes)
    ? (file.type as keyof typeof photoTypes)
    : detectPhotoType(imageBytes);

  if (!detectedType || !validatePhotoSignature(detectedType, imageBytes)) {
    throw new Error("Choose a valid JPEG, PNG, or WebP image.");
  }

  const extension = photoTypes[detectedType];
  const root = getStorageRoot();
  const coversDir = path.join(root, "covers");
  await fs.promises.mkdir(coversDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${extension}`;
  const relativeBlobName = `covers/${filename}`;
  const filePath = safeResolveStoragePath(relativeBlobName);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await fs.promises.writeFile(tempPath, Buffer.from(imageBytes));
    await fs.promises.rename(tempPath, filePath);
  } catch (error) {
    await fs.promises.unlink(tempPath).catch(() => undefined);
    throw error;
  }

  return relativeBlobName;
}

export async function saveEventPhoto(
  eventId: string,
  photoId: string,
  fileBytes: Uint8Array,
  contentType: string,
): Promise<{ blobName: string; size: number }> {
  const extension = photoTypes[contentType as keyof typeof photoTypes];
  if (!extension || !/^[a-zA-Z0-9-]{1,100}$/.test(eventId) || !/^[a-f0-9-]{36}$/i.test(photoId)) {
    throw new Error("The photo upload details are invalid.");
  }

  if (fileBytes.byteLength === 0 || fileBytes.byteLength > maxPhotoBytes) {
    throw new Error("The uploaded photo exceeds the allowable size limit.");
  }

  if (!validatePhotoSignature(contentType, fileBytes)) {
    throw new Error("The uploaded file does not match its declared image type.");
  }

  const root = getStorageRoot();
  const eventPhotosDir = path.join(root, "photos", eventId);
  await fs.promises.mkdir(eventPhotosDir, { recursive: true });

  const relativeBlobName = `photos/${eventId}/${photoId}.${extension}`;
  const filePath = safeResolveStoragePath(relativeBlobName);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await fs.promises.writeFile(tempPath, Buffer.from(fileBytes));
    await fs.promises.rename(tempPath, filePath);
  } catch (error) {
    await fs.promises.unlink(tempPath).catch(() => undefined);
    console.error("[heypal] Failed to write photo file", { eventId, photoId, error });
    throw new Error("The photo could not be saved on the server. Please try again.");
  }
  return { blobName: relativeBlobName, size: fileBytes.byteLength };
}

export function cleanStorageBlobName(blobIdentifier: string): string {
  if (!blobIdentifier) return "";
  return blobIdentifier.trim().replace(/^[\\/]+/, "");
}

export function getUploadReadUrl(blobName: string): string {
  if (!blobName || blobName.split("/").includes("..")) {
    throw new Error("The stored blob name is invalid.");
  }
  const clean = cleanStorageBlobName(blobName);
  return `/api/media/${encodeURI(clean)}`;
}

export function getPhotoReadUrl(blobUrl: string): string | null {
  if (!blobUrl) return null;
  if (isLocalDemoMode() && blobUrl.startsWith("demo-photo:")) {
    const photoId = blobUrl.slice("demo-photo:".length);
    return `/api/upload/demo/photos/${encodeURIComponent(photoId)}`;
  }

  const clean = cleanStorageBlobName(blobUrl);
  if (!clean || clean.split("/").includes("..")) {
    return null;
  }
  return `/api/media/${encodeURI(clean)}`;
}

export function getArchiveDownloadUrl(blobName: string): string {
  if (!blobName || blobName.split("/").includes("..")) {
    throw new Error("The archive blob name is invalid.");
  }
  const clean = cleanStorageBlobName(blobName);
  return `/api/media/${encodeURI(clean)}`;
}

export async function deletePhotoFile(blobUrl: string): Promise<void> {
  if (isLocalDemoMode() && blobUrl.startsWith("demo-photo:")) {
    removeDemoPhotoFile(blobUrl.slice("demo-photo:".length));
    return;
  }

  const clean = cleanStorageBlobName(blobUrl);
  if (!clean) return;

  try {
    const filePath = safeResolveStoragePath(clean);
    await fs.promises.unlink(filePath);
  } catch (error: unknown) {
    // If the file does not exist, ignore the error
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "ENOENT") {
      return;
    }
  }
}

// Backwards-compatible alias for existing callers
export const deletePhotoBlob = deletePhotoFile;

export async function getPhotoExportInfo(blobUrl: string): Promise<{ size: number; filename: string } | null> {
  if (!blobUrl) return null;
  if (isLocalDemoMode() && blobUrl.startsWith("demo-photo:")) {
    const file = getDemoPhotoFile(blobUrl.slice("demo-photo:".length));
    if (!file) return null;
    const extension = photoTypes[file.contentType as keyof typeof photoTypes] ?? "bin";
    return { size: file.bytes.byteLength, filename: `${blobUrl.slice("demo-photo:".length)}.${extension}` };
  }

  const clean = cleanStorageBlobName(blobUrl);
  if (!clean) return null;

  try {
    const filePath = safeResolveStoragePath(clean);
    const stat = await fs.promises.stat(/*turbopackIgnore: true*/ filePath);
    return {
      size: stat.size,
      filename: path.basename(filePath),
    };
  } catch {
    return null;
  }
}

export async function openPhotoForExport(
  blobUrl: string,
): Promise<{ size: number; filename: string; stream: Readable } | null> {
  if (!blobUrl) return null;
  if (isLocalDemoMode() && blobUrl.startsWith("demo-photo:")) {
    const file = getDemoPhotoFile(blobUrl.slice("demo-photo:".length));
    if (!file) return null;
    const extension = photoTypes[file.contentType as keyof typeof photoTypes] ?? "bin";
    return {
      size: file.bytes.byteLength,
      filename: `${blobUrl.slice("demo-photo:".length)}.${extension}`,
      stream: Readable.from(Buffer.from(file.bytes)),
    };
  }

  const clean = cleanStorageBlobName(blobUrl);
  if (!clean) return null;

  try {
    const filePath = safeResolveStoragePath(clean);
    const stat = await fs.promises.stat(/*turbopackIgnore: true*/ filePath);
    return {
      size: stat.size,
      filename: path.basename(filePath),
      stream: fs.createReadStream(/*turbopackIgnore: true*/ filePath),
    };
  } catch {
    return null;
  }

}
