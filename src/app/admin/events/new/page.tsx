import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EventEditor } from "@/app/admin/event-editor";

export default function NewEventPage() {
  return (
    <main className="admin-main">
      <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#111816] hover:text-[#C85038] mb-4" href="/admin">
        <ChevronLeft size={16} /> ← Director Terminal
      </Link>
      <div className="admin-title-row editor-title-row border-b-2 border-[#111816] pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-[#18372F] text-[#FAF9F3] px-2.5 py-0.5 border border-[#111816]">
              INITIATE GATHERING // 35MM REPOSITORY
            </span>
            <span className="text-[10px] font-serif italic text-[#C85038] font-bold">
              Bawal Epal; use heyPal!
            </span>
          </div>
          <h1 className="font-['Bodoni_Moda',serif] text-3xl sm:text-4xl font-medium italic text-[#111816]">
            Create New Event
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-[#111816]/70 mt-1">
            Give your gathering a private album archive, venue coordinates, and attendee protocol.
          </p>
        </div>
      </div>
      <EventEditor coverImageUrl={null} event={null} />
    </main>
  );
}