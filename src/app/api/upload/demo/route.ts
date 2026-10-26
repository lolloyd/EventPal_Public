import { NextResponse } from "next/server";
import { isHeyPalAdminUser, isLocalDemoMode, requireAuthenticated } from "@/lib/event-auth";
import { getEvent, savePhoto } from "@/lib/event-repository";
import { saveDemoPhotoFile } from "@/lib/demo-photo-storage";
import { maxPhotoBytes, validatePhotoBytes } from "@/lib/photo-validation";

export async function POST(request: Request) {
  if (!isLocalDemoMode()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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

  const eventId = String(formData.get("eventId") ?? "");
  const photoId = String(formData.get("photoId") ?? "");
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 300) || null;
  const file = formData.get("photo");
  if (!(file instanceof File) || !/^[a-f0-9-]{36}$/i.test(photoId)) {
    return NextResponse.json({ error: "The photo upload details are invalid." }, { status: 400 });
  }
  if (file.size > maxPhotoBytes || !(await validatePhotoBytes(file))) {
    return NextResponse.json({ error: "Choose a valid JPEG, PNG, or WebP photo under 40 MB." }, { status: 400 });
  }

  const event = await getEvent(eventId);
  if (!event || event.status !== "active") {
    return NextResponse.json({ error: "This event is not accepting photo uploads." }, { status: 404 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  saveDemoPhotoFile(photoId, { bytes, contentType: file.type });
  await savePhoto({
    id: photoId,
    eventId,
    blobUrl: `demo-photo:${photoId}`,
    uploadedBy: user.name,
    uploadedById: user.id,
    uploadedByIsAdmin: isHeyPalAdminUser(user),
    uploadedAt: new Date().toISOString(),
    caption,
    status: "approved",
  });
  return NextResponse.json({ photoId }, { status: 201 });
}