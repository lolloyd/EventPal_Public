import { Suspense } from "react";
import Link from "next/link";
import { Archive, ChevronLeft, Dices, GalleryHorizontalEnd, Images, QrCode } from "lucide-react";
import { notFound } from "next/navigation";
import { EventEditor } from "@/app/admin/event-editor";
import type { Contributor } from "@/app/admin/contributor-table";
import { requireAdmin } from "@/lib/event-auth";
import { getEvent, listEventPhotos } from "@/lib/event-repository";
import { getPhotoReadUrl, getUploadReadUrl } from "@/lib/local-storage";

async function EventEditContent({
  params,
}: Pick<PageProps<"/admin/events/[id]">, "params">) {
  const { id } = await params;
  await requireAdmin();
  const event = await getEvent(id);
  if (!event) notFound();
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
      <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#111816] hover:text-[#C85038] mb-4" href="/admin">
        <ChevronLeft size={16} /> ← Director Terminal
      </Link>
      <div className="admin-title-row editor-title-row border-b-2 border-[#111816] pb-6 mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-[#18372F] text-[#FAF9F3] px-2.5 py-0.5 border border-[#111816]">
              EVENT DIRECTOR // {event.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-[10px] font-serif italic text-[#C85038] font-bold">
              Bawal Epal; use heyPal!
            </span>
          </div>
          <h1 className="font-['Bodoni_Moda',serif] text-3xl sm:text-4xl font-medium italic text-[#111816]">
            {event.name}
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-[#111816]/70 mt-1">
            Archival parameters and live telemetry. Changes reflect immediately on attendee consoles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            className="border-2 border-[#111816] bg-[#FFDEA4] text-[#111816] shadow-[2px_2px_0px_#111816] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#111816] font-mono text-xs uppercase font-bold px-3 py-2 flex items-center gap-1.5 transition-all"
            href={`/admin/events/${event.id}/photo-wall`}
          >
            <GalleryHorizontalEnd size={15} />
            Photo Wall
          </Link>
          <Link
            className="border-2 border-[#111816] bg-[#FAF9F3] text-[#111816] shadow-[2px_2px_0px_#111816] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#111816] font-mono text-xs uppercase font-bold px-3 py-2 flex items-center gap-1.5 transition-all"
            href={`/admin/events/${event.id}/wheel`}
          >
            <Dices size={15} />
            Raffle Wheel
          </Link>
          <Link
            className="border-2 border-[#111816] bg-[#FAF9F3] text-[#111816] shadow-[2px_2px_0px_#111816] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#111816] font-mono text-xs uppercase font-bold px-3 py-2 flex items-center gap-1.5 transition-all"
            href={`/admin/events/${event.id}/export`}
          >
            <Archive size={15} />
            Export Archive
          </Link>
          <Link
            className="border-2 border-[#111816] bg-[#FAF9F3] text-[#111816] shadow-[2px_2px_0px_#111816] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#111816] font-mono text-xs uppercase font-bold px-3 py-2 flex items-center gap-1.5 transition-all"
            href={`/admin/events/${event.id}/photos`}
          >
            <Images size={15} />
            Submissions
          </Link>
          <Link
            className="border-2 border-[#111816] bg-[#18372F] text-[#FAF9F3] shadow-[2px_2px_0px_#111816] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#111816] font-mono text-xs uppercase font-bold px-3 py-2 flex items-center gap-1.5 transition-all"
            href={`/admin/events/${event.id}/qr`}
          >
            <QrCode size={15} />
            QR Broadside
          </Link>
        </div>
      </div>
      <EventEditor coverImageUrl={coverImageUrl} contributors={contributors} event={event} />
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