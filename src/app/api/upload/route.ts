import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isHeyPalAdminUser, requireAuthenticated } from "@/lib/event-auth";
import { getEvent, savePhoto } from "@/lib/event-repository";
import { deletePhotoFile, saveEventPhoto } from "@/lib/local-storage";
import { maxPhotoBytes, photoTypes, validatePhotoSignature } from "@/lib/photo-validation";
import type { PhotoRecord } from "@/lib/event-models";

const uploadSchema = z.object({
  eventId: z.string().min(1).max(100),
  photoId: z.string().uuid(),
  caption: z.string().trim().max(300).optional().default(""),
});

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch {
    return NextResponse.json({ error: "Sign in with your Google account to upload." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
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
    return NextResponse.json({ error: "The photo upload details are invalid." }, { status: 400 });
  }

  const { eventId, photoId, caption } = parsed.data;

  const file = formData.get("file") || formData.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a JPEG, PNG, or WebP photo to upload." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  if (file.size > maxPhotoBytes) {
    return NextResponse.json({ error: "The uploaded photo exceeds the 40 MB size limit." }, { status: 413 });
  }

  if (!(file.type in photoTypes)) {
    return NextResponse.json({ error: "Choose a valid JPEG, PNG, or WebP image." }, { status: 400 });
  }

  const event = await getEvent(eventId);
  if (!event || event.status !== "active") {
    return NextResponse.json({ error: "This event is not accepting photo uploads." }, { status: 404 });
  }

  const fileBuffer = new Uint8Array(await file.arrayBuffer());
  if (!validatePhotoSignature(file.type, fileBuffer)) {
    return NextResponse.json({ error: "The uploaded file does not match its declared image type." }, { status: 400 });
  }

  let savedBlobName: string;
  try {
    const saved = await saveEventPhoto(eventId, photoId, fileBuffer, file.type);
    savedBlobName = saved.blobName;
  } catch (error) {
    const message = error instanceof Error ? error.message : "The file could not be saved.";
    return NextResponse.json({ error: message }, { status: 500 });
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
    await deletePhotoFile(savedBlobName);
    const message = error instanceof Error ? error.message : "The photo could not be recorded.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/photos`);
  revalidatePath("/admin");

  return NextResponse.json({ photoId: photo.id }, { status: 201 });
}
