"use client";

import { useActionState, useTransition } from "react";
import { ShieldCheck, UserCheck, UserMinus, UserPlus, Users, AlertCircle, CheckCircle2, Shield } from "lucide-react";
import { assignCoordinatorAction, removeCoordinatorAction } from "@/app/admin/event-actions";
import type { EventCoordinatorRecord } from "@/lib/event-models";

interface CoordinatorManagerProps {
  eventId: string;
  coordinators: EventCoordinatorRecord[];
  isDefaultAdmin: boolean;
  currentUserEmail?: string;
  canManageCoordinators?: boolean;
}

export function CoordinatorManager({
  eventId,
  coordinators,
  isDefaultAdmin,
  currentUserEmail,
  canManageCoordinators = true,
}: CoordinatorManagerProps) {
  const [assignState, formAction, isAssignPending] = useActionState(
    async (_prev: { error: string | null; success: boolean }, formData: FormData) => {
      const result = await assignCoordinatorAction(formData);
      if (result?.error) {
        return { error: result.error, success: false };
      }
      return { error: null, success: true };
    },
    { error: null, success: false }
  );

  const [isRemoving, startRemoveTransition] = useTransition();

  const handleRemove = (email: string) => {
    if (!window.confirm(`Are you sure you want to remove coordinator access for ${email}?`)) {
      return;
    }
    startRemoveTransition(async () => {
      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set("email", email);
      await removeCoordinatorAction(formData);
    });
  };

  return (
    <section className="bg-paper-bright border-2 border-charcoal-ink shadow-brutal p-6 sm:p-8 mt-10">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-charcoal-ink/15 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 bg-primary" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
              ACCESS DELEGATION // DISCRETIONARY ACCESS
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-charcoal-ink flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <span>Event Coordinators</span>
          </h2>
          <p className="text-xs text-on-surface-variant font-mono uppercase tracking-wider mt-1">
            {isDefaultAdmin
              ? "Super admins and event creators can assign coordinators to grant dedicated terminal access for this event."
              : "Coordinators have access to curate photos, trigger raffle wheels, and manage broadsides for this event."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isDefaultAdmin ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary text-white text-[11px] font-mono font-bold uppercase tracking-wider shadow-brutal-sm">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Control Enabled</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-tertiary-fixed text-charcoal-ink text-[11px] font-mono font-bold uppercase tracking-wider shadow-brutal-sm">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Coordinator View</span>
            </span>
          )}
        </div>
      </div>

      {/* ── ASSIGN FORM (ALLOWED FOR ADMINS & EVENT CREATORS/COORDINATORS) ── */}
      {canManageCoordinators && (
        <form action={formAction} className="mb-8 p-4 sm:p-5 bg-surface-container-low border border-charcoal-ink/20 shadow-brutal-sm">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-primary" />
            <label htmlFor="coordinator-email" className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-ink">
              Assign New Coordinator by Google Email
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="coordinator-email"
              name="email"
              type="email"
              required
              placeholder="e.g. coordinator@example.com"
              className="flex-1 px-3.5 py-2.5 bg-paper-bright border-2 border-charcoal-ink font-mono text-sm text-charcoal-ink placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
            />
            <button
              type="submit"
              disabled={isAssignPending}
              className="btn-brutal inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-mono text-xs font-bold uppercase tracking-wider shadow-brutal hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAssignPending ? "Assigning..." : "Assign Coordinator"}</span>
            </button>
          </div>

          {assignState.error && (
            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-red-600 bg-red-50 p-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{assignState.error}</span>
            </div>
          )}

          {assignState.success && (
            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-green-700 bg-green-50 p-2 border border-green-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Coordinator assigned successfully!</span>
            </div>
          )}

          <p className="text-[11px] font-mono text-on-surface-variant mt-2.5">
            The assigned user can log into heyPal! using their Google account to manage only this event.
          </p>
        </form>
      )}

      {/* ── COORDINATOR ROSTER ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-ink flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-secondary" />
            <span>Assigned Coordinators ({coordinators.length})</span>
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant uppercase">
            Scoped Access
          </span>
        </div>

        {coordinators.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-charcoal-ink/20 bg-surface-container-lowest">
            <Users className="w-8 h-8 text-on-surface-variant/40 mx-auto mb-2" />
            <p className="font-mono text-xs font-bold text-charcoal-ink uppercase tracking-wider">
              No Event Coordinators Assigned
            </p>
            <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
              {canManageCoordinators
                ? "Add an event coordinator using the form above to grant them access to this gathering's photos, raffle, and picture wall."
                : "No coordinators have been assigned to this event yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-charcoal-ink/10 border-2 border-charcoal-ink bg-paper-bright">
            {coordinators.map((coordinator) => {
              const isSelf = Boolean(
                currentUserEmail &&
                coordinator.email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()
              );

              return (
                <div
                  key={coordinator.email}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-8 h-8 bg-charcoal-ink text-paper-bright flex items-center justify-center font-mono font-bold text-xs uppercase shadow-brutal-sm shrink-0">
                      {coordinator.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-charcoal-ink break-all">
                          {coordinator.email}
                        </span>
                        <span className="px-1.5 py-0.2 bg-secondary text-white text-[9px] font-mono font-bold uppercase tracking-widest">
                          COORDINATOR
                        </span>
                        {isSelf && (
                          <span className="px-1.5 py-0.2 bg-primary text-white text-[9px] font-mono font-bold uppercase tracking-widest">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-on-surface-variant mt-0.5">
                        Assigned on {new Date(coordinator.assignedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {coordinator.assignedBy && ` by ${coordinator.assignedBy}`}
                      </p>
                    </div>
                  </div>

                  {/* Self-removal prevention: Users cannot remove themselves */}
                  {isSelf ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-charcoal-ink/50 bg-surface-container-high border border-charcoal-ink/15 shadow-brutal-sm self-start sm:self-auto cursor-not-allowed"
                      title="You cannot remove yourself from the Event Coordinator list"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                      <span>Cannot remove self</span>
                    </span>
                  ) : canManageCoordinators ? (
                    <button
                      type="button"
                      disabled={isRemoving}
                      onClick={() => handleRemove(coordinator.email)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-red-600 bg-red-50 border border-red-300 shadow-brutal-sm hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 self-start sm:self-auto"
                      title="Remove coordinator access"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
