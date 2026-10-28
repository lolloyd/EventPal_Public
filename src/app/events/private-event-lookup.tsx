"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";

export function PrivateEventLookup() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim();
    if (!clean) return;

    // Support both raw ID and full URL paste
    let targetId = clean;
    if (clean.includes("/events/")) {
      targetId = clean.split("/events/")[1].split("/")[0].split("?")[0];
    } else if (clean.startsWith("http")) {
      try {
        const url = new URL(clean);
        const parts = url.pathname.split("/").filter(Boolean);
        targetId = parts[parts.length - 1];
      } catch {}
    }

    if (!targetId) {
      setError("Please enter a valid event link or ID.");
      return;
    }

    router.push(`/events/${encodeURIComponent(targetId)}`);
  }

  return (
    <div className="p-4 sm:p-5 bg-paper-bright border-2 border-charcoal-ink/15 shadow-brutal-sm mb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[#18372F] text-[#FAF9F3] flex items-center justify-center shrink-0 shadow-brutal-sm border border-[#111816]/30 dark:border-white/20">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-ink">
              Invited to a Private Gathering?
            </h3>
            <p className="text-xs text-on-surface-variant font-normal">
              Private events are unlisted from this public directory. Point your camera at the physical broadside QR code, or paste your invite link / code:
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full lg:w-auto">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste invite link or code..."
            className="flex-1 lg:w-72 font-mono text-xs px-3 py-2 bg-surface text-charcoal-ink border-2 border-charcoal-ink/30 focus:outline-none focus:border-primary shadow-sm"
          />
          <button
            type="submit"
            className="btn-brutal px-4 py-2 bg-primary text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-brutal-sm hover:bg-primary-dark transition-colors shrink-0"
          >
            <span>Open</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
      {error && <p className="text-xs font-mono text-red-600 font-bold mt-2">{error}</p>}
    </div>
  );
}
