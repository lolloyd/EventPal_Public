import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ExportDashboard } from "@/app/admin/events/[id]/export/export-dashboard";
import { requireAdmin } from "@/lib/event-auth";
import { getEvent } from "@/lib/event-repository";

export const instant = false;

async function ExportPageContent({
  params,
}: Pick<PageProps<"/admin/events/[id]/export">, "params">) {
  const { id } = await params;
  await requireAdmin();
  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <main className="admin-main export-page">
      <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#111816] hover:text-[#C85038] mb-4" href={`/admin/events/${event.id}`}>
        <ChevronLeft size={16} /> ← Event Parameters
      </Link>
      <div className="admin-title-row editor-title-row border-b-2 border-[#111816] pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-[#18372F] text-[#FAF9F3] px-2.5 py-0.5 border border-[#111816]">
              ARCHIVE EXTRACTION // {event.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-[10px] font-serif italic text-[#C85038] font-bold">
              Bawal Epal; use heyPal!
            </span>
          </div>
          <h1 className="font-['Bodoni_Moda',serif] text-3xl sm:text-4xl font-medium italic text-[#111816]">
            Export {event.name}
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-[#111816]/70 mt-1">
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