import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PhotoReview } from "@/app/admin/events/[id]/photos/photo-review";
import { requireAdmin } from "@/lib/event-auth";
import { getPhotoReadUrl } from "@/lib/local-storage";
import { getEvent, listEventPhotos } from "@/lib/event-repository";

async function PhotoReviewContent({
  params,
}: Pick<PageProps<"/admin/events/[id]/photos">, "params">) {
  const { id } = await params;
  await requireAdmin();
  const event = await getEvent(id);
  if (!event) notFound();

  const photos = await listEventPhotos(id);
  const photosWithPreviews = photos.map((photo) => ({
    ...photo,
    previewUrl: photo.blobUrl ? getPhotoReadUrl(photo.blobUrl) : null,
  }));

  return (
    <main className="admin-main">
      <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#111816] hover:text-[#C85038] mb-4" href={`/admin/events/${event.id}`}>
        <ChevronLeft size={16} /> ← Event Parameters
      </Link>
      <div className="admin-title-row editor-title-row border-b-2 border-[#111816] pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-[#18372F] text-[#FAF9F3] px-2.5 py-0.5 border border-[#111816]">
              MEDIA CURATION // {event.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-[10px] font-serif italic text-[#C85038] font-bold">
              Bawal Epal; use heyPal!
            </span>
          </div>
          <h1 className="font-['Bodoni_Moda',serif] text-3xl sm:text-4xl font-medium italic text-[#111816]">
            {event.name} Submissions
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-[#111816]/70 mt-1">
            Review and moderate raw exposures before they join the live archive exhibition.
          </p>
        </div>
      </div>
      <PhotoReview eventId={id} photos={photosWithPreviews} />
    </main>
  );
}

function PhotoReviewFallback() {
  return (
    <main className="admin-main" aria-busy="true">
      <p className="admin-eyebrow">MEDIA REVIEW</p>
      <h1 className="admin-title">Loading submissions</h1>
    </main>
  );
}

export default function EventPhotosPage({ params }: PageProps<"/admin/events/[id]/photos">) {
  return (
    <Suspense fallback={<PhotoReviewFallback />}>
      <PhotoReviewContent params={params} />
    </Suspense>
  );
}