"use client";

import { useDeferredValue, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, ShieldAlert, CheckCircle2, UserCheck, Trash2, Calendar, ShieldCheck } from "lucide-react";
import { removeCreatorFromListAction } from "@/app/admin/event-actions";
import type { EventCreatorRecord } from "@/lib/event-models";

interface CreatorListProps {
  creators: EventCreatorRecord[];
}

export function CreatorList({ creators }: CreatorListProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const filtered = creators.filter((creator) => {
    const query = `${creator.email} ${creator.name ?? ""} ${creator.eventName ?? ""}`.toLowerCase();
    return query.includes(deferredSearch);
  });

  const handleAllowCreation = (email: string) => {
    if (!window.confirm(`Allow ${email} to create a new event? They will be removed from the restricted list.`)) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", email);
      const res = await removeCreatorFromListAction(formData);
      if (res?.error) {
        setStatusMessage(`Error: ${res.error}`);
      } else {
        setStatusMessage(`Successfully allowed ${email} to create another event.`);
      }
    });
  };

  return (
    <section className="bg-paper-bright border-2 border-charcoal-ink shadow-brutal p-6 sm:p-8">
      {/* ── TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b-2 border-charcoal-ink/10">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-secondary block mb-1">
            CREATOR TELEMETRY
          </span>
          <h2 className="font-serif text-2xl font-bold text-charcoal-ink flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>Restricted Creator Registry ({creators.length})</span>
          </h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, event..."
            className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-charcoal-ink/20 font-mono text-xs text-charcoal-ink placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
          />
        </div>
      </div>

      {statusMessage && (
        <div className="mb-6 flex items-center justify-between gap-2 p-3 bg-secondary/10 border-2 border-secondary font-mono text-xs text-charcoal-ink">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="font-bold underline text-[10px] uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── TABLE ── */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-charcoal-ink/20 bg-surface-container-lowest">
          <UserCheck className="w-10 h-10 text-secondary mx-auto mb-2" />
          <p className="font-display-hero text-lg text-charcoal-ink font-bold">
            {creators.length === 0
              ? "No restricted creators on the registry."
              : "No creators match your search query."}
          </p>
          <p className="text-xs text-on-surface-variant font-mono mt-1 max-w-md mx-auto">
            {creators.length === 0
              ? "When non-admin users create a gathering, they appear here and are prevented from creating further events until cleared."
              : "Try adjusting your search terms."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-charcoal-ink bg-paper-bright">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-charcoal-ink bg-surface-container-low text-[11px] font-mono font-bold uppercase tracking-wider text-charcoal-ink">
                <th className="py-3 px-4">Creator / Google Account</th>
                <th className="py-3 px-4">Event Created</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Creation Status</th>
                <th className="py-3 px-4 text-right">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-ink/10 font-mono text-xs">
              {filtered.map((creator) => (
                <tr key={creator.email} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-charcoal-ink text-paper-bright flex items-center justify-center font-bold text-xs uppercase shadow-brutal-sm shrink-0">
                        {creator.email.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-charcoal-ink block text-sm">
                          {creator.email}
                        </span>
                        {creator.name && creator.name !== creator.email && (
                          <span className="text-[11px] text-on-surface-variant">
                            {creator.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    {creator.eventId ? (
                      <Link
                        href={`/admin/events/${creator.eventId}`}
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                        title="View event in Director Terminal"
                      >
                        <span>{creator.eventName || creator.eventId.slice(0, 8)}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="text-on-surface-variant italic">Recorded prior event</span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-on-surface-variant">
                    {new Date(creator.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>

                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 font-bold text-[10px] uppercase tracking-wider shadow-brutal-sm">
                      <ShieldAlert className="w-3 h-3 text-red-600" />
                      <span>Creation Blocked</span>
                    </span>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAllowCreation(creator.email)}
                      className="btn-brutal inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-white font-mono text-xs font-bold uppercase tracking-wider shadow-brutal-sm hover:bg-secondary-dark transition-all disabled:opacity-50"
                      title="Clear from registry to allow creating another event"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Allow New Event</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
