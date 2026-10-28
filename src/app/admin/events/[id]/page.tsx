import { Suspense } from "react";
import Link from "next/link";
import { Archive, ChevronLeft, Dices, GalleryHorizontalEnd, Globe, Images, Lock, QrCode } from "lucide-react";
import { notFound } from "next/navigation";
import { EventEditor } from "@/app/admin/event-editor";
import { CoordinatorManager } from "@/app/admin/events/[id]/coordinator-manager";
import type { Contributor } from "@/app/admin/contributor-table";
import { requireEventAccess } from "@/lib/event-auth";
import { getEvent, listEventCoordinators, listEventPhotos } from "@/lib/event-repository";
import { getPhotoReadUrl, getUploadReadUrl } from "@/lib/local-storage";

async function EventEditContent({
  params,
}: Pick<PageProps<"/admin/events/[id]">, "params">) {
  const { id } = await params;
  const auth = await requireEventAccess(id);
  const event = await getEvent(id);
  if (!event) notFound();
  const coordinators = await listEventCoordinators(id);
  const coverImageUrl = event.coverImageBlobName
    ? getUploadReadUrl(event.coverImageBlobName)
    : null;
  const photos = await listEventPhotos(id);
  const contributorsByEmail = new Map<string, Omit<Contributor, "number">>();
  for (const photo of photos) {
    const email = photo.uploadedBy.trim();
    if (!email) continue;
    const key = email.toLocaleLowerCase();
    const contributor = contributorsByEmail.get(key) ?? { email, photoCount: 0, photos: [] };
    contributor.photoCount += 1;
    contributor.photos.push({
      id: photo.id,
      caption: photo.caption,
      previewUrl: getPhotoReadUrl(photo.blobUrl),
      status: photo.status,
      uploadedAt: photo.uploadedAt,
    });
    contributorsByEmail.set(key, contributor);
  }
  const firstUpload = (contributor: Omit<Contributor, "number">) =>
    Math.min(...contributor.photos.map((photo) => Date.parse(photo.uploadedAt) || 0));
  // Number contributors by when they first submitted so "No." stays stable under any sort.
  const contributors: Contributor[] = Array.from(contributorsByEmail.values())
    .sort((left, right) => firstUpload(left) - firstUpload(right) ||
      left.email.localeCompare(right.email, undefined, { sensitivity: "base" }))
    .map((contributor, index) => ({
      ...contributor,
      number: index + 1,
      photos: contributor.photos.sort((left, right) => Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt)),
    }));

  return (
    <main className="admin-main">
      <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-charcoal-ink hover:text-primary mb-4" href="/admin">
        <ChevronLeft size={16} /> ← Director Terminal
      </Link>
      <div className="admin-title-row editor-title-row border-b-2 border-charcoal-ink/20 pb-6 mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-secondary text-white px-2.5 py-0.5 border border-charcoal-ink/20 shadow-brutal-sm">
              EVENT DIRECTOR // {event.id.slice(0, 8).toUpperCase()}
            </span>
            {event.isPrivate ? (
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-charcoal-ink text-paper-bright px-2.5 py-0.5 border border-charcoal-ink shadow-brutal-sm inline-flex items-center gap-1">
                <Lock size={11} /> PRIVATE ALBUM // UNLISTED
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-electric-lime text-charcoal-ink px-2.5 py-0.5 border border-charcoal-ink shadow-brutal-sm inline-flex items-center gap-1">
                <Globe size={11} /> PUBLIC ALBUM // LISTED
              </span>
            )}
            <span className="text-[10px] font-serif italic text-primary font-bold">
              Don't be Epal; use heyPal!
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium italic text-on-surface">
            {event.name}
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-on-surface-variant mt-1">
            Archival parameters and live telemetry. Changes reflect immediately on attendee consoles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            className={`border-2 border-charcoal-ink shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal font-mono text-xs uppercase font-bold px-3 py-2 flex items-center gap-1.5 transition-all ${event.isPhotoWallPublic ? "bg-secondary text-white" : "bg-tertiary-fixed text-on-tertiary-fixed"
              }`}
            href={`/admin/events/${event.id}/photo-wall`}
            title={event.isPhotoWallPublic ? "Public Picture Wall is enabled" : "Picture Wall is private"}
          >
            <GalleryHorizontalEnd size={15} />
            <span>Photo Wall</span>
            {event.isPhotoWallPublic && (
              <span className="w-2 h-2 rounded-full bg-electric-lime animate-pulse ml-0.5" />
            )}
          </Link>
          <Link
            className="border-2 border-charcoal-ink bg-surface-container text-on-surface shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal font-mono text-xs uppercase font-bold px-3 py-2 flex items-center gap-1.5 transition-all"
            href={`/admin/events/${event.id}/wheel`}
          >
            <Dices size={15} />
            Raffle Wheel
          </Link>
          <Link
            className="border-2 border-charcoal-ink bg-surface-container text-on-surface shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal font-mono text-xs uppercase font-bold px-3 py-2 flex items-center gap-1.5 transition-all"
            href={`/admin/events/${event.id}/export`}
          >
            <Archive size={15} />
            Export Archive
          </Link>
          <Link
            className="border-2 border-charcoal-ink bg-surface-container text-on-surface shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal font-mono text-xs uppercase font-bold px-3 py-2 flex items-center gap-1.5 transition-all"
            href={`/admin/events/${event.id}/photos`}
          >
            <Images size={15} />
            Submissions
          </Link>
          <Link
            className="border-2 border-charcoal-ink bg-[#c85038] text-white shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal hover:bg-[#a73823] font-mono text-xs uppercase font-extrabold px-3.5 py-2 flex items-center gap-1.5 transition-all"
            href={`/admin/events/${event.id}/qr`}
            style={{ color: "#ffffff" }}
            title="Generate & print QR code poster for attendees"
          >
            <QrCode size={16} className="text-white shrink-0" />
            <span>QR Generator</span>
          </Link>
        </div>
      </div>
      <EventEditor coverImageUrl={coverImageUrl} contributors={contributors} event={event} />
      <CoordinatorManager
        eventId={event.id}
        coordinators={coordinators}
        isDefaultAdmin={auth.isDefaultAdmin}
        currentUserEmail={auth.user.email}
        canManageCoordinators={
          auth.isDefaultAdmin ||
          (Boolean(auth.user.email) && event.createdBy.toLowerCase() === auth.user.email?.toLowerCase()) ||
          auth.isCoordinator
        }
      />
    </main>
  );
}

function EditorFallback() {
  return (
    <main className="admin-main" aria-busy="true">
      <p className="admin-eyebrow">EVENT SETUP</p>
      <h1 className="admin-title">Loading event</h1>
    </main>
  );
}

export default function EditEventPage({ params }: PageProps<"/admin/events/[id]">) {
  return (
    <Suspense fallback={<EditorFallback />}>
      <EventEditContent params={params} />
    </Suspense>
  );
}