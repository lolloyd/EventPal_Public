import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/event-auth";
import { getPhotoReadUrl } from "@/lib/local-storage";
import { getEvent, listApprovedEventPhotos } from "@/lib/event-repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/events/[eventId]/photos">,
) {
  try {
    const { eventId } = await params;
    const event = await getEvent(eventId);
    if (!event || event.status === "archived") {
      return NextResponse.json({ error: "This event is unavailable." }, { status: 404 });
    }

    // If public photo wall is not enabled, require guest/organizer authentication
    if (!event.isPhotoWallPublic) {
      try {
        await requireAuthenticated();
      } catch {
        return NextResponse.json({ error: "Sign in to view event photos." }, { status: 401 });
      }
    }

    const photos = await listApprovedEventPhotos(eventId);
    return NextResponse.json(
      {
        photos: photos.map((photo) => {
          let imageUrl: string | null = null;
          try {
            imageUrl = getPhotoReadUrl(photo.blobUrl);
          } catch {
            imageUrl = null;
          }
          return {
            id: photo.id,
            imageUrl,
            uploadedBy: photo.uploadedBy,
            uploadedAt: photo.uploadedAt,
            caption: photo.caption,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[heypal] Failed to list event photos", error);
    return NextResponse.json({ error: "Photos could not be loaded right now." }, { status: 500 });
  }
}