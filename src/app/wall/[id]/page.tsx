import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Lock, LogIn, Radio } from "lucide-react";
import { PhotoWall } from "@/app/admin/events/[id]/photo-wall/photo-wall";
import { ThemeToggle } from "@/app/theme";
import { getEvent, listApprovedEventPhotos } from "@/lib/event-repository";
import { getPhotoReadUrl, getUploadReadUrl } from "@/lib/local-storage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/wall/[id]">): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: "Picture Wall | heyPal!" };
  return {
    title: `${event.name} — Live Picture Wall | heyPal!`,
    description: `Live photo wall exhibition for ${event.name}. Don't be Epal; use heyPal!`,
  };
}

export default async function PublicPhotoWallPage({
  params,
}: PageProps<"/wall/[id]">) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event || event.status === "archived") notFound();

  // If public photo wall is disabled, show clean unauthorized screen
  if (!event.isPhotoWallPublic) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-between">
        <header className="w-full bg-paper-bright/95 backdrop-blur-md border-b-2 border-charcoal-ink px-6 lg:px-12 py-3.5 flex items-center justify-between">
          <Link className="flex items-baseline gap-1.5 font-sans font-bold tracking-tight text-charcoal-ink" href="/">
            <span className="font-display-hero text-2xl font-bold">heyPal!</span>
            <span className="text-label-mono-tag px-1.5 py-0.5 bg-charcoal-ink text-paper-bright">35mm</span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="max-w-2xl mx-auto px-6 py-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 border-2 border-charcoal-ink bg-surface-container-high text-charcoal-ink flex items-center justify-center shadow-brutal mb-6">
            <Lock size={30} strokeWidth={2.4} />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-secondary text-white px-2.5 py-0.5 border border-charcoal-ink shadow-brutal-sm">
              PROJECTOR TERMINAL // RESTRICTED
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium italic text-charcoal-ink mb-4">
            Picture Wall is Private
          </h1>

          <p className="text-sm sm:text-base text-on-surface-variant font-normal leading-relaxed max-w-lg mb-8">
            The organizer has not enabled the public link for this live photo wall yet. If you are hosting this gathering, you can activate public broadcasting from your Director Terminal.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <a
              href={`/api/auth/google?callbackUrl=%2Fadmin%2Fevents%2F${event.id}%2Fphoto-wall`}
              className="btn-brutal w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white text-xs font-mono font-bold uppercase tracking-wider border-2 border-charcoal-ink shadow-brutal hover:bg-primary-dark"
            >
              <LogIn size={15} />
              <span>Director Sign In</span>
            </a>

            <Link
              href={`/events/${event.id}`}
              className="btn-brutal w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-paper-bright text-charcoal-ink text-xs font-mono font-bold uppercase tracking-wider border-2 border-charcoal-ink shadow-brutal hover:bg-surface-container"
            >
              <span>Attendee Album View</span>
              <ExternalLink size={15} />
            </Link>
          </div>
        </main>

        <footer className="w-full border-t border-charcoal-ink/15 py-4 px-6 text-center font-mono text-[11px] text-on-surface-variant">
          Don't be Epal; use heyPal!
        </footer>
      </div>
    );
  }

  // Fetch approved photos for the wall
  const photos = await listApprovedEventPhotos(event.id);
  const coverImageUrl = event.coverImageBlobName
    ? getUploadReadUrl(event.coverImageBlobName)
    : null;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* ── BROADCAST TOPBAR ── */}
      <header className="sticky top-0 z-40 bg-paper-bright/95 backdrop-blur-md border-b-2 border-charcoal-ink px-5 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link className="flex items-baseline gap-1.5 tracking-tight group" href={`/events/${event.id}`}>
            <span className="font-display-hero text-xl sm:text-2xl font-bold text-charcoal-ink group-hover:text-primary transition-colors">
              heyPal!
            </span>
            <span className="text-label-mono-tag uppercase px-1.5 py-0.5 bg-charcoal-ink text-paper-bright font-bold text-[10px]">
              35mm
            </span>
          </Link>

          <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 bg-secondary text-white shadow-brutal-sm border border-charcoal-ink">
            <Radio className="w-3.5 h-3.5 text-electric-lime animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
              Live Projection
            </span>
          </div>

          <div className="hidden md:block border-l border-charcoal-ink/20 pl-4">
            <h1 className="font-serif text-lg font-medium italic text-charcoal-ink truncate max-w-xs lg:max-w-md">
              {event.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/events/${event.id}`}
            className="btn-brutal hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-tertiary-fixed text-charcoal-ink text-xs font-mono font-bold uppercase tracking-wider border border-charcoal-ink shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5"
            title="Upload your photos to this wall"
          >
            <span>+ Add Photos</span>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* ── LIVE PHOTO WALL CAROUSEL ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col justify-center">
        <PhotoWall
          coverImageUrl={coverImageUrl}
          eventName={event.name}
          eventId={event.id}
          enablePolling={true}
          isPublicView={true}
          photos={photos.map((photo) => ({
            id: photo.id,
            uploadedBy: photo.uploadedBy || photo.caption || "Guest",
            caption: photo.caption,
            previewUrl: getPhotoReadUrl(photo.blobUrl),
          }))}
        />
      </main>

      {/* ── BROADCAST FOOTER WITH CONTROLS CHEATSHEET ── */}
      <footer className="w-full bg-paper-bright border-t-2 border-charcoal-ink py-3 px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
        <div className="flex items-center gap-3">
          <span className="font-bold text-charcoal-ink">PROJECTION COMMANDS:</span>
          <span className="hidden md:inline">[SPACE] PAUSE · [←/→] STEP · [F] FULLSCREEN</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-serif italic text-primary font-bold lowercase">Don't be Epal; use heyPal!</span>
          <span>● AUTO-REFRESH: 1M</span>
        </div>
      </footer>
    </div>
  );
}
