import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ExportDashboard } from "@/app/admin/events/[id]/export/export-dashboard";
import { requireEventAccess } from "@/lib/event-auth";
import { getEvent } from "@/lib/event-repository";

export const dynamic = "force-dynamic";

async function ExportPageContent({
  params,
}: Pick<PageProps<"/admin/events/[id]/export">, "params">) {
  const { id } = await params;
  await requireEventAccess(id);
  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <main className="admin-main export-page">
      <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-charcoal-ink hover:text-primary mb-4" href={`/admin/events/${event.id}`}>
        <ChevronLeft size={16} /> ← Event Parameters
      </Link>
      <div className="admin-title-row editor-title-row border-b-2 border-charcoal-ink/20 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-secondary text-white px-2.5 py-0.5 border border-charcoal-ink/20 shadow-brutal-sm">
              ARCHIVE EXTRACTION // {event.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-[10px] font-serif italic text-primary font-bold">
              Don't be Epal; use heyPal!
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium italic text-on-surface">
            Export {event.name}
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-on-surface-variant mt-1">
            Generate and download high-resolution ZIP bundles with metadata manifests.
          </p>
        </div>
      </div>
      <ExportDashboard eventId={event.id} eventName={event.name} />
    </main>
  );
}

export default async function EventExportPage({ params }: PageProps<"/admin/events/[id]/export">) {
  return ExportPageContent({ params });
}