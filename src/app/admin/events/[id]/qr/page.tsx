import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { QrPoster } from "@/app/admin/events/[id]/qr/qr-poster";
import { requireAdmin } from "@/lib/event-auth";
import { getEvent } from "@/lib/event-repository";

async function QrMaterialsContent({
  params,
}: Pick<PageProps<"/admin/events/[id]/qr">, "params">) {
  const { id } = await params;
  await requireAdmin();
  const event = await getEvent(id);
  if (!event) notFound();
  const attendeeUrl = `${await getPublicOrigin()}/events/${encodeURIComponent(event.id)}`;

  return (
    <main className="admin-main qr-page">
      <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#111816] hover:text-[#C85038] mb-4" href={`/admin/events/${event.id}`}>
        <ChevronLeft size={16} /> ← Event Parameters
      </Link>
      <div className="admin-title-row editor-title-row border-b-2 border-[#111816] pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-[#18372F] text-[#FAF9F3] px-2.5 py-0.5 border border-[#111816]">
              PRINT BROADSIDE // {event.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-[10px] font-serif italic text-[#C85038] font-bold">
              Bawal Epal; use heyPal!
            </span>
          </div>
          <h1 className="font-['Bodoni_Moda',serif] text-3xl sm:text-4xl font-medium italic text-[#111816]">
            {event.name} QR Poster
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-[#111816]/70 mt-1">
            Printable physical broadside. Attendees point phone cameras to access the private album immediately.
          </p>
        </div>
      </div>
      <QrPoster attendeeUrl={attendeeUrl} event={event} />
    </main>
  );
}

function QrFallback() {
  return (
    <main className="admin-main" aria-busy="true">
      <p className="admin-eyebrow">PRINT MATERIALS</p>
      <h1 className="admin-title">Preparing event code</h1>
    </main>
  );
}

export default function QrMaterialsPage({ params }: PageProps<"/admin/events/[id]/qr">) {
  return (
    <Suspense fallback={<QrFallback />}>
      <QrMaterialsContent params={params} />
    </Suspense>
  );
}

async function getPublicOrigin() {
  const configuredOrigin = process.env.HEYPAL_PUBLIC_ORIGIN;
  if (configuredOrigin) {
    const url = new URL(configuredOrigin);
    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
      throw new Error("HEYPAL_PUBLIC_ORIGIN must use HTTPS in production.");
    }
    return url.origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Set HEYPAL_PUBLIC_ORIGIN to the deployed heyPal! origin.");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) throw new Error("The heyPal! host could not be determined.");
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}