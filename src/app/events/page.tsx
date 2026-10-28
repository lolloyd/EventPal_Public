import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Sparkles, LogOut, Plus, FolderKanban } from "lucide-react";
import { requireAuthenticated, isDefaultAdmin } from "@/lib/event-auth";
import { listEvents } from "@/lib/event-repository";
import { ThemeToggle } from "@/app/theme";
import { PrivateEventLookup } from "@/app/events/private-event-lookup";

export const dynamic = "force-dynamic";

function formatDate(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" });
  if (start.toDateString() === end.toDateString()) return date.format(start);
  return `${date.format(start)} – ${date.format(end)}`;
}

export default async function EventDirectoryPage() {
  const user = await requireAuthenticated();
  const isAdmin = isDefaultAdmin(user);
  const { isUserCoordinatorAny } = await import("@/lib/event-repository");
  const isCoordinator = user.email ? await isUserCoordinatorAny(user.email) : false;
  const canManageEvents = isAdmin || isCoordinator;

  // Private events are hidden from the "Find your album" page — accessible only via direct link or QR code
  const events = (await listEvents()).filter((event) => event.status === "active" && !event.isPrivate);

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface antialiased flex flex-col justify-between">
      {/* ── EDITORIAL HEADER ── */}
      <header className="sticky top-0 left-0 w-full z-50 bg-paper-bright/95 backdrop-blur-md border-b border-charcoal-ink/10 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-20 w-full px-5 sm:px-8 lg:px-12 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link className="flex items-baseline gap-1.5 tracking-tight group" href="/">
              <span className="font-display-hero text-2xl sm:text-3xl font-bold text-charcoal-ink group-hover:text-primary transition-colors">
                heyPal!
              </span>
              <span className="text-label-mono-tag uppercase px-1.5 py-0.5 bg-charcoal-ink text-paper-bright font-bold">
                35mm
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-surface-container shadow-brutal-sm">
              <span className="w-2 h-2 rounded-full bg-electric-lime animate-pulse" />
              <span className="text-label-caps tracking-widest text-on-surface uppercase">
                Active Catalog
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/admin/events/new"
              className="btn-brutal inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary !text-white text-label-caps uppercase font-bold tracking-wider shadow-brutal-sm hover:bg-primary-dark transition-all text-xs"
              title="Create your own event gathering"
            >
              <Plus className="w-3.5 h-3.5 shrink-0 !text-white" />
              <span className="!text-white">Create Event</span>
            </Link>
            {canManageEvents && (
              <Link
                href="/admin"
                className="btn-brutal inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#18372F] !text-[#FAF9F3] text-label-caps uppercase font-bold tracking-wider shadow-brutal-sm hover:bg-[#112822] border border-[#111816]/30 dark:border-white/20 transition-all text-xs"
                title={isAdmin ? "Open Director Terminal" : "Open Coordinator Terminal"}
              >
                <FolderKanban className="w-3.5 h-3.5 shrink-0 text-[#FFDEA4]" />
                <span className="!text-[#FAF9F3] font-bold">{isAdmin ? "Director Terminal" : "My Events"}</span>
              </Link>
            )}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-surface-container-high border border-charcoal-ink/10 text-xs font-mono">
              <span className="text-on-surface-variant">ATTENDEE:</span>
              <span className="font-bold text-charcoal-ink">{user.isDemo ? "DEMO ATTENDEE" : user.name}</span>
            </div>
            <ThemeToggle />
            <a
              className="btn-brutal inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-charcoal-ink text-label-caps uppercase font-bold tracking-wider shadow-brutal-sm hover:bg-red-500 hover:text-white transition-colors text-xs"
              href="/api/auth/signout"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── MAIN DIRECTORY ── */}
      <main className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 flex-1">
        {/* Title Area */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12 pb-6 border-b border-charcoal-ink/10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-[2px] bg-primary" />
              <span className="text-label-caps uppercase text-primary tracking-widest font-bold">
                HEYPAL! / ACTIVE ALBUMS
              </span>
            </div>
            <h1 className="font-display-hero text-4xl sm:text-5xl lg:text-6xl text-charcoal-ink tracking-tight mb-2">
              Find your album.
            </h1>
            <p className="text-base text-on-surface-variant max-w-xl">
              Choose an active gathering to upload photos and see moments captured by your fellow attendees.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/events/new"
              className="btn-brutal inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-bold text-sm tracking-wide rounded-none shadow-brutal hover:bg-primary-dark transition-all"
              title="Initialize a new event gathering"
            >
              <Plus className="w-4 h-4" />
              <span>Create an Event</span>
            </Link>
            <div className="px-3.5 py-3 bg-tertiary-fixed text-charcoal-ink shadow-brutal-sm border border-charcoal-ink/10">
              <span className="text-label-caps font-bold tracking-wider uppercase">
                Don't be Epal; use heyPal!
              </span>
            </div>
          </div>
        </div>

        {/* Private Event Direct Access Box */}
        <PrivateEventLookup />

        {/* Event Cards Grid */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {events.map((event, index) => {
              const plateNumber = String(index + 1).padStart(2, "0");
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="btn-brutal group flex flex-col justify-between p-6 bg-paper-bright rounded-none shadow-brutal-lg border border-charcoal-ink/10 hover:border-primary transition-all"
                >
                  <div>
                    {/* Header Plate Metadata */}
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-charcoal-ink/10">
                      <span className="text-label-mono-tag uppercase tracking-widest text-primary font-bold">
                        PLATE {plateNumber} // ACTIVE
                      </span>
                      <span className="text-label-mono-tag uppercase font-mono text-on-surface-variant">
                        35MM RAW
                      </span>
                    </div>

                    <h2 className="font-display-hero text-2xl sm:text-3xl text-charcoal-ink mb-3 group-hover:text-primary transition-colors leading-snug">
                      {event.name}
                    </h2>

                    {event.description && (
                      <p className="text-sm text-on-surface-variant mb-6 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-charcoal-ink/10 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono text-charcoal-ink/85">
                      <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{formatDate(event.startsAt, event.endsAt)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-xs font-mono text-charcoal-ink/85">
                        <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="pt-2 flex items-center justify-between text-label-caps font-bold text-primary group-hover:translate-x-1 transition-transform">
                      <span>ENTER ALBUM</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-12 bg-paper-bright border border-charcoal-ink/10 shadow-brutal-lg text-center max-w-xl mx-auto my-12">
            <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-display-hero text-2xl text-charcoal-ink mb-2">No active events found</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              There are currently no active public gatherings accepting submissions. Check back once your organizer has launched the space.
            </p>
            <div className="inline-block px-3 py-1.5 bg-surface-container text-label-caps font-bold uppercase text-charcoal-ink shadow-brutal-sm">
              Archival Catalog Standby
            </div>
          </div>
        )}

        {/* Hosting CTA for Attendees */}
        <section className="mt-16 p-8 sm:p-10 bg-paper-bright border border-charcoal-ink/15 shadow-brutal flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-label-mono-tag uppercase text-secondary font-bold">
                HOSTING // INITIATE GATHERING
              </span>
            </div>
            <h2 className="font-display-hero text-2xl sm:text-3xl font-bold text-charcoal-ink mb-1">
              Hosting a wedding, reunion, or party?
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant font-mono max-w-2xl leading-relaxed">
              Create your private gathering space. You will automatically become its Event Coordinator with live QR codes, photo moderation, and communal photo walls.
            </p>
          </div>
          <Link
            href="/admin/events/new"
            className="btn-brutal inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-white font-bold text-sm uppercase tracking-wider shadow-brutal hover:bg-primary-dark transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your Event</span>
          </Link>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="w-full bg-paper-bright border-t border-charcoal-ink/10 py-6 px-5 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-label-mono-tag text-on-surface-variant">
          <span>HEYPAL! // PRIVATE EVENT ALBUMS</span>
          <span>AUTHENTICATED AS {user.name.toUpperCase()}</span>
          <a className="hover:text-primary transition-colors underline" href="/api/auth/signout">
            Sign out
          </a>
        </div>
      </footer>
    </div>
  );
}