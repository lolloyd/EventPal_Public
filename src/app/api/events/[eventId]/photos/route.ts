import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/event-auth";
import { getPhotoReadUrl } from "@/lib/local-storage";
import { getEvent, listApprovedEventPhotos } from "@/lib/event-repository";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/events/[eventId]/photos">,
) {
  try {
    await requireAuthenticated();
  } catch {
    return NextResponse.json({ error: "Sign in to view event photos." }, { status: 401 });
  }

  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event || event.status !== "active") {
    return NextResponse.json({ error: "This event is unavailable." }, { status: 404 });
  }

  const photos = await listApprovedEventPhotos(eventId);
  return NextResponse.json({
    photos: photos.map((photo) => ({
      id: photo.id,
      imageUrl: getPhotoReadUrl(photo.blobUrl),
      uploadedAt: photo.uploadedAt,
      caption: photo.caption,
    })),
  });
}