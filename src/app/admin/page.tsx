import { CalendarDays, Image as ImageIcon, Users, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { EventList } from "@/app/admin/event-list";
import { requireAdmin } from "@/lib/event-auth";
import { getEventMetrics, listEvents } from "@/lib/event-repository";

async function AdminDashboardContent() {
  await requireAdmin();
  const [events, metrics] = await Promise.all([listEvents(), getEventMetrics()]);
  const totals = Object.values(metrics).reduce(
    (result, current) => ({
      uploads: result.uploads + current.uploads,
      participants: result.participants + current.participants,
    }),
    { uploads: 0, participants: 0 },
  );

  return (
    <main className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16">
      {/* ── TITLE & ACTION ROW ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-6 border-b border-charcoal-ink/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-[2px] bg-primary" />
            <span className="text-label-caps uppercase text-primary tracking-widest font-bold">
              DIRECTOR TERMINAL // EVENT CURATION
            </span>
          </div>
          <h1 className="font-display-hero text-4xl sm:text-5xl lg:text-6xl text-charcoal-ink tracking-tight mb-2">
            Events Overview
          </h1>
          <p className="text-base text-on-surface-variant max-w-xl">
            Set the scene, launch public albums, and curate communal memories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block px-3.5 py-2 bg-tertiary-fixed text-charcoal-ink shadow-brutal-sm border border-charcoal-ink/10">
            <span className="text-label-caps font-bold tracking-wider uppercase">
              Bawal Epal; use heyPal!
            </span>
          </div>
          <Link
            href="/admin/events/new"
            className="btn-brutal inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-bold text-sm tracking-wide rounded-none shadow-brutal hover:bg-primary-dark"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        </div>
      </div>

      {/* ── METRIC STRIP (TACTILE BRUTALIST PLATES) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12" aria-label="Event metrics">
        {/* Total Events Plate */}
        <div className="p-6 bg-paper-bright rounded-none shadow-brutal border border-charcoal-ink/10 flex items-center justify-between">
          <div>
            <span className="text-label-mono-tag uppercase tracking-widest text-secondary font-bold block mb-1">
              METRIC 01 // ARCHIVE
            </span>
            <div className="font-display-hero text-4xl sm:text-5xl font-bold text-charcoal-ink">
              {events.length}
            </div>
            <span className="text-xs text-on-surface-variant font-medium">Total Gatherings</span>
          </div>
          <div className="w-12 h-12 bg-secondary text-white rounded-none flex items-center justify-center shadow-brutal-sm">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>

        {/* Total Uploads Plate */}
        <div className="p-6 bg-paper-bright rounded-none shadow-brutal border border-charcoal-ink/10 flex items-center justify-between">
          <div>
            <span className="text-label-mono-tag uppercase tracking-widest text-primary font-bold block mb-1">
              METRIC 02 // SUBMISSIONS
            </span>
            <div className="font-display-hero text-4xl sm:text-5xl font-bold text-primary">
              {totals.uploads}
            </div>
            <span className="text-xs text-on-surface-variant font-medium">Total Raw Photos</span>
          </div>
          <div className="w-12 h-12 bg-primary text-white rounded-none flex items-center justify-center shadow-brutal-sm">
            <ImageIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Contributors Plate */}
        <div className="p-6 bg-paper-bright rounded-none shadow-brutal border border-charcoal-ink/10 flex items-center justify-between">
          <div>
            <span className="text-label-mono-tag uppercase tracking-widest text-slate-blue font-bold block mb-1">
              METRIC 03 // COMMUNITY
            </span>
            <div className="font-display-hero text-4xl sm:text-5xl font-bold text-charcoal-ink">
              {totals.participants}
            </div>
            <span className="text-xs text-on-surface-variant font-medium">Unique Photographers</span>
          </div>
          <div className="w-12 h-12 bg-slate-blue text-charcoal-ink rounded-none flex items-center justify-center shadow-brutal-sm font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* ── EVENT LIST SECTION ── */}
      <EventList events={events} metrics={metrics} />
    </main>
  );
}

function DashboardFallback() {
  return (
    <main className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16" aria-busy="true">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-[2px] bg-primary" />
        <span className="text-label-caps uppercase text-primary tracking-widest font-bold">
          DIRECTOR TERMINAL
        </span>
      </div>
      <h1 className="font-display-hero text-4xl font-bold text-charcoal-ink">Loading Director Terminal...</h1>
    </main>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <AdminDashboardContent />
    </Suspense>
  );
}