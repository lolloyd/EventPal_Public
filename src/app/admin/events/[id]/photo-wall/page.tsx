import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PhotoWall } from "@/app/admin/events/[id]/photo-wall/photo-wall";
import { PublicWallToggle } from "@/app/admin/events/[id]/photo-wall/public-wall-toggle";
import { getPhotoReadUrl, getUploadReadUrl } from "@/lib/local-storage";
import { requireEventAccess } from "@/lib/event-auth";
import { getEvent, listApprovedEventPhotos } from "@/lib/event-repository";

export const dynamic = "force-dynamic";

export default async function EventPhotoWallPage({
  params,
}: PageProps<"/admin/events/[id]/photo-wall">) {
  const { id } = await params;
  await requireEventAccess(id);
  const event = await getEvent(id);
  if (!event) notFound();
  const photos = await listApprovedEventPhotos(id);
  const coverImageUrl = event.coverImageBlobName
    ? getUploadReadUrl(event.coverImageBlobName)
    : null;

  return (
    <main className="admin-main">
      <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-charcoal-ink hover:text-primary mb-4" href={`/admin/events/${event.id}`}>
        <ChevronLeft size={16} /> ← Event Parameters
      </Link>
      <div className="admin-title-row editor-title-row border-b-2 border-charcoal-ink/20 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-secondary text-white px-2.5 py-0.5 border border-charcoal-ink/20 shadow-brutal-sm">
              PROJECTION TERMINAL // {event.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-[10px] font-serif italic text-primary font-bold">
              Don't be Epal; use heyPal!
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium italic text-on-surface">
            {event.name} Photo Wall
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-on-surface-variant mt-1">
            Archival live carousel · Checks for newly added photos every minute · Flagged submissions omitted.
          </p>
        </div>
      </div>

      <PublicWallToggle eventId={event.id} isPublic={Boolean(event.isPhotoWallPublic)} />

      <PhotoWall
        coverImageUrl={coverImageUrl}
        eventName={event.name}
        eventId={event.id}
        enablePolling={true}
        photos={photos.map((photo) => ({
          id: photo.id,
          uploadedBy: photo.uploadedBy,
          caption: photo.caption,
          previewUrl: getPhotoReadUrl(photo.blobUrl),
        }))}
      />
    </main>
  );
}
