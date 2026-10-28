"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Globe, Lock } from "lucide-react";
import { togglePhotoWallPublicAction } from "@/app/admin/event-actions";

export function PublicWallToggle({
  eventId,
  isPublic: initialIsPublic,
}: {
  eventId: string;
  isPublic: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/wall/${eventId}`
    : `/wall/${eventId}`;

  function toggle() {
    const next = !isPublic;
    setIsPublic(next);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set("isPublic", String(next));
      await togglePhotoWallPublicAction(formData);
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="w-full bg-paper-bright border-2 border-charcoal-ink shadow-brutal p-5 sm:p-6 mb-8 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-ink/15">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 border border-charcoal-ink flex items-center justify-center shadow-brutal-sm ${isPublic ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"}`}>
            {isPublic ? <Globe className="w-5 h-5 animate-pulse" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isPublic ? "bg-electric-lime animate-ping" : "bg-charcoal-ink/40"}`} />
              <h2 className="text-label-caps uppercase font-bold text-charcoal-ink tracking-widest text-xs">
                {isPublic ? "PUBLIC PICTURE WALL: ENABLED" : "PUBLIC PICTURE WALL: DISABLED"}
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
              {isPublic
                ? "Anyone with this public projector link can view the live wall without signing in."
                : "The live picture wall is private. Enable it to broadcast on smart TVs, projectors, or share with attendees."}
            </p>
          </div>
        </div>

        <button
          onClick={toggle}
          disabled={isPending}
          type="button"
          className={`btn-brutal px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-2 border-charcoal-ink transition-all cursor-pointer ${
            isPublic
              ? "bg-surface-container-high text-charcoal-ink hover:bg-red-500 hover:text-white shadow-brutal-sm"
              : "bg-secondary text-white shadow-brutal hover:bg-secondary/90"
          }`}
        >
          {isPending ? "Updating…" : isPublic ? "Disable Public Link" : "Enable Public Link"}
        </button>
      </div>

      {isPublic && (
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-surface px-3 py-2 border border-charcoal-ink/20 font-mono text-xs text-charcoal-ink truncate">
            <span className="text-on-surface-variant select-none">URL:</span>
            <span className="select-all truncate font-semibold">{publicUrl}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyLink}
              type="button"
              className="btn-brutal flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-paper-bright border-2 border-charcoal-ink text-charcoal-ink text-xs font-mono font-bold uppercase tracking-wider shadow-brutal-sm hover:bg-tertiary-fixed transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </button>

            <a
              href={`/wall/${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-brutal flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary text-white border-2 border-charcoal-ink text-xs font-mono font-bold uppercase tracking-wider shadow-brutal-sm hover:bg-primary-dark transition-all"
            >
              <span>Open Public Wall</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
