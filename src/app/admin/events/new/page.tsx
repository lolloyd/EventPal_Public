import Link from "next/link";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { EventEditor } from "@/app/admin/event-editor";
import { canUserCreateEvent, isDefaultAdmin, requireAuthenticated } from "@/lib/event-auth";

export default async function NewEventPage() {
  const user = await requireAuthenticated();
  const creationCheck = await canUserCreateEvent(user);
  const isDefault = isDefaultAdmin(user);
  const backHref = isDefault ? "/admin" : "/events";
  const backLabel = isDefault ? "Director Terminal" : "Events Catalog";

  if (!creationCheck.allowed) {
    return (
      <main className="admin-main">
        <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-charcoal-ink hover:text-primary mb-4" href={backHref}>
          <ChevronLeft size={16} /> ← {backLabel}
        </Link>
        <div className="bg-paper-bright border-2 border-charcoal-ink shadow-brutal p-8 sm:p-12 max-w-2xl mx-auto my-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-600 text-white flex items-center justify-center font-bold shadow-brutal-sm shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-600 block">
                CREATION RESTRICTED // ANTI-ABUSE PROTOCOL
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-ink">
                Creation Limit Reached
              </h1>
            </div>
          </div>
          <p className="font-mono text-sm text-charcoal-ink leading-relaxed mb-4">
            You belong to the Event Creator registry and cannot create new events without administrator approval.
          </p>
          <p className="text-xs text-on-surface-variant font-mono mb-8">
            To prevent abuse and maintain system performance, each account is limited to one active gathering creation. If you need to host additional events, please contact a Default Admin to clear your account.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={backHref}
              className="btn-brutal inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-mono text-xs font-bold uppercase tracking-wider shadow-brutal hover:bg-primary-dark transition-all"
            >
              ← Return to {isDefault ? "Director Terminal" : "Events Catalog"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-main">
      <Link className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-charcoal-ink hover:text-primary mb-4" href={backHref}>
        <ChevronLeft size={16} /> ← {backLabel}
      </Link>
      <div className="admin-title-row editor-title-row border-b-2 border-charcoal-ink/20 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-secondary text-white px-2.5 py-0.5 border border-charcoal-ink/20 shadow-brutal-sm">
              INITIATE GATHERING // 35MM REPOSITORY
            </span>
            <span className="text-[10px] font-serif italic text-primary font-bold">
              Don't be Epal; use heyPal!
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium italic text-on-surface">
            Create New Event
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-on-surface-variant mt-1">
            Give your gathering a private album archive, venue coordinates, and attendee protocol.
          </p>
        </div>
      </div>
      <EventEditor coverImageUrl={null} event={null} />
    </main>
  );
}