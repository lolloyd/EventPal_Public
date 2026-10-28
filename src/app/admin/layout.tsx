import Link from "next/link";
import { LogOut, Plus, ExternalLink, Shield, UserCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { requireDirectorOrCoordinator } from "@/lib/event-auth";
import type { HeyPalUser } from "@/lib/event-auth";
import { ThemeToggle } from "@/app/theme";

export const dynamic = "force-dynamic";

function AdminHeader({ user, isDefaultAdmin }: { user: HeyPalUser; isDefaultAdmin: boolean }) {
  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-paper-bright/95 backdrop-blur-md border-b border-charcoal-ink/10 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-20 w-full px-5 sm:px-8 lg:px-12 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link className="flex items-baseline gap-1.5 tracking-tight group" href="/admin">
            <span className="font-display-hero text-2xl sm:text-3xl font-bold text-charcoal-ink group-hover:text-primary transition-colors">
              heyPal!
            </span>
            <span className="text-label-mono-tag uppercase px-1.5 py-0.5 bg-charcoal-ink text-paper-bright font-bold">
              35mm
            </span>
          </Link>
          <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1 ${isDefaultAdmin ? "bg-secondary text-white" : "bg-[#18372F] text-[#FAF9F3]"} shadow-brutal-sm`}>
            <span className="w-2 h-2 rounded-full bg-electric-lime animate-pulse" />
            <span className="text-label-caps tracking-widest uppercase font-bold text-xs">
              {isDefaultAdmin ? "Director Terminal" : "Coordinator Terminal"}
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2 bg-surface-container-low p-1 border border-charcoal-ink/10 shadow-brutal-sm">
          <Link
            href="/admin"
            className="px-3.5 py-1.5 text-label-caps uppercase font-bold bg-primary text-white shadow-brutal-sm"
          >
            {isDefaultAdmin ? "All Events" : "My Assigned Events"}
          </Link>
          <Link
            href="/admin/events/new"
            className="btn-brutal inline-flex items-center gap-1 px-3.5 py-1.5 text-label-caps uppercase text-charcoal-ink hover:bg-surface-container transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Event</span>
          </Link>
          {isDefaultAdmin && (
            <Link
              href="/admin/creators"
              className="btn-brutal inline-flex items-center gap-1.5 px-3.5 py-1.5 text-label-caps uppercase text-charcoal-ink hover:bg-surface-container transition-all"
              title="Manage users who created events and enforce creation rules"
            >
              <Users className="w-3.5 h-3.5 text-secondary" />
              <span>Creators</span>
            </Link>
          )}
          <Link
            href="/events"
            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-label-caps uppercase text-on-surface-variant hover:text-charcoal-ink hover:bg-surface-container transition-all"
            target="_blank"
            title="View attendee album experience"
          >
            <span>Attendee View</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/admin/events/new"
            className="md:hidden btn-brutal inline-flex items-center gap-1 px-2.5 py-1 text-label-caps uppercase bg-primary !text-white shadow-brutal-sm text-xs font-bold"
            title="Create an event"
          >
            <Plus className="w-3.5 h-3.5 !text-white" />
            <span className="!text-white">Create</span>
          </Link>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-surface-container-high border border-charcoal-ink/10 text-xs font-mono">
            {isDefaultAdmin ? (
              <Shield className="w-3.5 h-3.5 text-secondary shrink-0" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            )}
            <span className="text-on-surface-variant">
              {isDefaultAdmin ? "ORGANIZER:" : "COORDINATOR:"}
            </span>
            <span className="font-bold text-charcoal-ink max-w-[160px] truncate" title={user.email || user.name}>
              {user.name}
            </span>
            {user.isDemo && <span className="px-1 bg-primary text-white text-[10px]">DEMO</span>}
          </div>
          <ThemeToggle />
          <a
            className="btn-brutal inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-charcoal-ink text-label-caps uppercase font-bold tracking-wider shadow-brutal-sm hover:bg-red-500 hover:text-white transition-colors"
            href="/api/auth/signout"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </a>
        </div>
      </div>
    </header>
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await requireDirectorOrCoordinator();
  return (
    <div className="min-h-screen w-full bg-surface text-on-surface antialiased flex flex-col justify-between">
      <AdminHeader user={auth.user} isDefaultAdmin={auth.isDefaultAdmin} />
      <div className="flex-1 w-full">{children}</div>
      <footer className="w-full bg-paper-bright border-t border-charcoal-ink/10 py-6 px-5 sm:px-8 lg:px-12 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-label-mono-tag text-on-surface-variant">
          <span>HEYPAL! // {auth.isDefaultAdmin ? "DIRECTOR WORKSPACE" : "COORDINATOR WORKSPACE"}</span>
          <span>Don't be Epal; use heyPal!</span>
          <span>© 2026 HEYPAL!</span>
        </div>
      </footer>
    </div>
  );
}