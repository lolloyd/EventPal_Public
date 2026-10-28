import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { RaffleWheel } from "@/app/admin/events/[id]/wheel/raffle-wheel";
import { getUploadReadUrl } from "@/lib/local-storage";
import { requireEventAccess } from "@/lib/event-auth";
import { getEvent } from "@/lib/event-repository";

export const dynamic = "force-dynamic";

export default async function EventRafflePage({
  params,
}: PageProps<"/admin/events/[id]/wheel">) {
  const { id } = await params;
  await requireEventAccess(id);
  const event = await getEvent(id);
  if (!event) notFound();
  const coverImageUrl = event.coverImageBlobName
    ? getUploadReadUrl(event.coverImageBlobName)
    : null;

  return (
    <main className="admin-main raffle-page">
      <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-charcoal-ink hover:text-primary mb-4" href={`/admin/events/${event.id}`}>
        <ChevronLeft size={16} /> ← Event Parameters
      </Link>
      <RaffleWheel coverImageUrl={coverImageUrl} eventId={event.id} eventName={event.name} />
    </main>
  );
}