import Link from "next/link";
import { ChevronLeft, ShieldAlert, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/event-auth";
import { listEventCreators } from "@/lib/event-repository";
import { CreatorList } from "@/app/admin/creators/creator-list";

export const dynamic = "force-dynamic";

export default async function CreatorsPage() {
  await requireAdmin();
  const creators = await listEventCreators();

  return (
    <main className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16">
      <Link
        className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-charcoal-ink hover:text-primary mb-6"
        href="/admin"
      >
        <ChevronLeft size={16} /> ← Director Terminal
      </Link>

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-6 border-b border-charcoal-ink/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-[2px] bg-red-600" />
            <span className="text-label-caps uppercase text-red-600 tracking-widest font-bold">
              SUPER ADMIN GOVERNANCE // ANTI-ABUSE REGISTRY
            </span>
          </div>
          <h1 className="font-display-hero text-4xl sm:text-5xl lg:text-6xl text-charcoal-ink tracking-tight mb-2">
            Event Creators Roster
          </h1>
          <p className="text-base text-on-surface-variant max-w-2xl">
            To prevent platform abuse and spam, accounts that initialize an event are placed on this registry and restricted from creating further gatherings. Clear an account from this list to allow them to create another event.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-paper-bright text-charcoal-ink shadow-brutal-sm border border-charcoal-ink/15 font-mono text-xs">
            <span className="text-on-surface-variant">LOCKED ACCOUNTS:</span>{" "}
            <span className="font-bold text-red-600 text-sm">{creators.length}</span>
          </div>
        </div>
      </div>

      <CreatorList creators={creators} />
    </main>
  );
}
