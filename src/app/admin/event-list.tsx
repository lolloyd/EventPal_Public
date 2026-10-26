"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, Search, CalendarDays, MapPin } from "lucide-react";
import type { EventMetrics, EventRecord, EventStatus } from "@/lib/event-models";

type StatusFilter = "all" | EventStatus;

const filters: { label: string; value: StatusFilter }[] = [
  { label: "All Events", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

function formatDateRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  if (start.toDateString() === end.toDateString()) {
    return `${date.format(start)} · ${time.format(start)}–${time.format(end)}`;
  }
  return `${date.format(start)} – ${date.format(end)}`;
}

export function EventList({
  events,
  metrics,
}: {
  events: EventRecord[];
  metrics: Record<string, EventMetrics>;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const filteredEvents = events.filter((event) => {
    const matchesStatus = status === "all" || event.status === status;
    const matchesSearch = `${event.name} ${event.location}`.toLocaleLowerCase().includes(deferredSearch);
    return matchesStatus && matchesSearch;
  });

  return (
    <section className="w-full bg-paper-bright border border-charcoal-ink/10 shadow-brutal-lg p-6 sm:p-8" aria-label="Event catalog">
      {/* ── TOOLBAR: FILTERS & SEARCH ── */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8 pb-6 border-b border-charcoal-ink/10">
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter events by status">
          {filters.map((filter) => {
            const isSelected = status === filter.value;
            return (
              <button
                key={filter.value}
                className={`btn-brutal px-3.5 py-1.5 text-label-caps uppercase font-bold transition-all border ${
                  isSelected
                    ? "bg-secondary text-white border-secondary shadow-brutal-sm"
                    : "bg-surface-container-low text-charcoal-ink border-charcoal-ink/15 hover:bg-surface-container"
                }`}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
                {filter.value === "all" && <span className="ml-1.5 opacity-75 font-mono">({events.length})</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <label className="relative flex-1 sm:w-72 flex items-center">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 pointer-events-none" />
            <span className="sr-only">Search events</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gatherings..."
              className="w-full pl-9 pr-3 py-2 bg-surface text-charcoal-ink text-sm border border-charcoal-ink/20 rounded-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono placeholder:text-on-surface-variant/60"
            />
          </label>
        </div>
      </div>

      {/* ── BROADHEADER TABLE ── */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-charcoal-ink/15 text-label-mono-tag text-on-surface-variant uppercase">
              <th scope="col" className="py-3 px-4 font-bold">Event &amp; Venue</th>
              <th scope="col" className="py-3 px-4 font-bold">Timeline</th>
              <th scope="col" className="py-3 px-4 font-bold">Status</th>
              <th scope="col" className="py-3 px-4 font-bold text-right">Raw Photos</th>
              <th scope="col" className="py-3 px-4 font-bold text-right">Contributors</th>
              <th scope="col" className="py-3 px-4 text-center"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-ink/10">
            {filteredEvents.map((event, index) => {
              const plateNumber = String(index + 1).padStart(2, "0");
              const isEventActive = event.status === "active";
              const isEventDraft = event.status === "draft";

              return (
                <tr key={event.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="py-4 px-4">
                    <Link className="block group-hover:text-primary transition-colors" href={`/admin/events/${event.id}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono font-bold text-primary">#{plateNumber}</span>
                        <span className="font-display-hero text-lg font-bold text-charcoal-ink group-hover:text-primary">
                          {event.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
                        <MapPin className="w-3 h-3 text-secondary shrink-0" />
                        <span>{event.location || "Venue TBD"}</span>
                      </div>
                    </Link>
                  </td>

                  <td className="py-4 px-4 text-xs font-mono text-charcoal-ink/85 whitespace-nowrap">
                    {formatDateRange(event.startsAt, event.endsAt)}
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-1 text-label-mono-tag font-bold uppercase shadow-brutal-sm ${
                        isEventActive
                          ? "bg-secondary text-white"
                          : isEventDraft
                            ? "bg-tertiary-fixed text-charcoal-ink"
                            : "bg-surface-container-highest text-charcoal-ink"
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-right font-display-hero font-bold text-base text-primary">
                    {metrics[event.id]?.uploads ?? 0}
                  </td>

                  <td className="py-4 px-4 text-right font-mono text-sm text-charcoal-ink">
                    {metrics[event.id]?.participants ?? 0}
                  </td>

                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <Link
                      className="btn-brutal inline-flex items-center justify-center w-8 h-8 bg-surface text-charcoal-ink border border-charcoal-ink/20 shadow-brutal-sm hover:bg-primary hover:text-white hover:border-primary transition-colors"
                      href={`/admin/events/${event.id}`}
                      aria-label={`Manage ${event.name}`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredEvents.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-display-hero text-xl text-charcoal-ink mb-2">
              {events.length === 0 ? "No events created yet." : "No gatherings match the current filter."}
            </p>
            {events.length === 0 && (
              <Link
                href="/admin/events/new"
                className="btn-brutal inline-flex items-center gap-2 px-4 py-2 mt-2 bg-primary text-white text-xs font-bold uppercase tracking-wider shadow-brutal"
              >
                <Plus className="w-4 h-4" />
                <span>Initialize First Event</span>
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-charcoal-ink/10 flex items-center justify-between text-label-mono-tag text-on-surface-variant">
        <span>Catalog Display: {filteredEvents.length} of {events.length} Events</span>
        <span className="font-bold text-primary">Plate Protocol Active</span>
      </div>
    </section>
  );
}