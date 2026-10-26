import { notFound } from "next/navigation";
import { AttendeeExperience } from "@/app/events/[eventId]/attendee-experience";
import { requireAuthenticated, isLocalDemoMode } from "@/lib/event-auth";
import { getPhotoReadUrl, getUploadReadUrl } from "@/lib/local-storage";
import { getEvent, listApprovedEventPhotos } from "@/lib/event-repository";

export const instant = false;

async function AttendeeEventContent({
  params,
}: Pick<PageProps<"/events/[eventId]">, "params">) {
  const { eventId } = await params;
  const user = await requireAuthenticated();
  const event = await getEvent(eventId);
  if (!event || event.status !== "active") notFound();

  const photos = await listApprovedEventPhotos(eventId);
  const coverImageUrl = event.coverImageBlobName
    ? getUploadReadUrl(event.coverImageBlobName)
    : null;
  const initialPhotos = photos.map((photo) => ({
    id: photo.id,
    imageUrl: getPhotoReadUrl(photo.blobUrl),
    uploadedAt: photo.uploadedAt,
    caption: photo.caption,
  }));

  return (
    <AttendeeExperience
      demoMode={isLocalDemoMode()}
      event={event}
      initialPhotos={initialPhotos}
      coverImageUrl={coverImageUrl}
      userName={user.name}
    />
  );
}

export default async function AttendeeEventPage({ params }: PageProps<"/events/[eventId]">) {
  return AttendeeEventContent({ params });
}