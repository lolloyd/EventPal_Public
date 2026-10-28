import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isHeyPalAdminUser, requireAuthenticated } from "@/lib/event-auth";
import { getEvent, getPhoto, savePhoto } from "@/lib/event-repository";
import { deletePhotoFile, saveEventPhoto } from "@/lib/local-storage";
import { detectPhotoType, maxPhotoBytes, photoTypes } from "@/lib/photo-validation";
import type { PhotoRecord } from "@/lib/event-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadSchema = z.object({
  eventId: z.string().min(1).max(100),
  photoId: z.string().uuid(),
  caption: z.string().trim().max(300).optional().default(""),
});

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function safeRevalidate(eventId: string) {
  for (const path of [`/events/${eventId}`, `/admin/events/${eventId}/photos`, "/admin"]) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.warn("[heypal] revalidatePath failed", { path, error });
    }
  }
}

export async function POST(request: Request) {
  try {
    return await handleUpload(request);
  } catch (error) {
    // Last-resort guard: never let an unexpected exception produce an HTML 500 page.
    console.error("[heypal] Unhandled upload error", error);
    return jsonError("Something went wrong while uploading. Please try again.", 500);
  }
}

async function handleUpload(request: Request) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch {
    return jsonError("Your session has expired. Sign in again to upload.", 401);
  }

  // Reject obviously oversized bodies before buffering them into memory.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxPhotoBytes + 1024 * 1024) {
    return jsonError("The uploaded photo exceeds the 40 MB size limit.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.warn("[heypal] Could not parse upload form data", error);
    return jsonError("The upload was interrupted or incomplete. Please try again.", 400);
  }

  const rawEventId = formData.get("eventId");
  const rawPhotoId = formData.get("photoId");
  const rawCaption = formData.get("caption");

  const parsed = uploadSchema.safeParse({
    eventId: typeof rawEventId === "string" ? rawEventId : "",
    photoId: typeof rawPhotoId === "string" ? rawPhotoId : "",
    caption: typeof rawCaption === "string" ? rawCaption : "",
  });

  if (!parsed.success) {
    return jsonError("The photo upload details are invalid.", 400);
  }

  const { eventId, photoId, caption } = parsed.data;

  const file = formData.get("file") || formData.get("photo");
  if (!(file instanceof File)) {
    return jsonError("Choose a JPEG, PNG, or WebP photo to upload.", 400);
  }

  if (file.size === 0) {
    return jsonError("The uploaded file is empty.", 400);
  }

  if (file.size > maxPhotoBytes) {
    return jsonError("The uploaded photo exceeds the 40 MB size limit.", 413);
  }

  const event = await getEvent(eventId);
  if (!event || event.status !== "active") {
    return jsonError("This event is not accepting photo uploads.", 404);
  }

  // Idempotent retries: if the client already uploaded this photoId (e.g. the response
  // was lost on a flaky connection), acknowledge it instead of overwriting the file.
  const existing = await getPhoto(photoId);
  if (existing) {
    if (existing.eventId === eventId && existing.uploadedById === user.id) {
      return NextResponse.json({ photoId: existing.id, duplicate: true }, { status: 200 });
    }
    return jsonError("This upload ID is already in use. Please reselect the photo.", 409);
  }

  let fileBuffer: Uint8Array;
  try {
    fileBuffer = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    console.warn("[heypal] Could not read uploaded file", error);
    return jsonError("The upload was interrupted. Please try again.", 400);
  }

  // Trust the file bytes, not the browser-declared MIME type (some phones send "" or octet-stream).
  const detectedType = detectPhotoType(fileBuffer);
  if (!detectedType) {
    return jsonError("Choose a valid JPEG, PNG, or WebP image. HEIC/RAW files are not supported.", 415);
  }
  if (file.type && file.type in photoTypes && file.type !== detectedType) {
    return jsonError("The uploaded file does not match its declared image type.", 400);
  }

  let savedBlobName: string;
  try {
    const saved = await saveEventPhoto(eventId, photoId, fileBuffer, detectedType);
    savedBlobName = saved.blobName;
  } catch (error) {
    console.error("[heypal] saveEventPhoto failed", { eventId, photoId, error });
    return jsonError("The photo could not be saved on the server. Please try again.", 500);
  }

  const photo: PhotoRecord = {
    id: photoId,
    eventId,
    blobUrl: savedBlobName,
    uploadedBy: user.name,
    uploadedById: user.id,
    uploadedByIsAdmin: isHeyPalAdminUser(user),
    uploadedAt: new Date().toISOString(),
    caption: caption || null,
    status: "approved",
  };

  try {
    await savePhoto(photo);
  } catch (error) {
    console.error("[heypal] savePhoto failed", { eventId, photoId, error });
    await deletePhotoFile(savedBlobName).catch(() => undefined);
    const busy = error instanceof Error && /SQLITE_BUSY|database is locked/i.test(error.message);
    return jsonError(
      busy ? "The server is busy. Please retry in a moment." : "The photo could not be recorded. Please try again.",
      busy ? 503 : 500,
    );
  }

  safeRevalidate(eventId);

  return NextResponse.json({ photoId: photo.id }, { status: 201 });
}
