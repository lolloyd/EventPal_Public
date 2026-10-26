"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Dices,
  Expand,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Shrink,
  UsersRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { RaffleDrawRecord } from "@/lib/event-models";
import type { RaffleEntry, RaffleSelection } from "@/lib/raffle-engine";

interface DrawLogEntry extends Omit<RaffleDrawRecord, "displayName"> {
  name: string;
  photoUrl: string | null;
}

const selectionOptions: { value: RaffleSelection; label: string }[] = [
  { value: "first", label: "First photo" },
  { value: "latest", label: "Latest photo" },
  { value: "random", label: "Random photo" },
];

function csvCell(value: string) {
  return `"${(value ?? "").replaceAll('"', '""')}"`;
}

function toDrawLogEntry(draw: RaffleDrawRecord & { photoUrl?: string | null }): DrawLogEntry {
  const { displayName: name, ...record } = draw;
  return {
    ...record,
    name,
    photoUrl: draw.photoUrl ?? null,
  };
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function upsertDraw(log: DrawLogEntry[], draw: DrawLogEntry) {
  return [draw, ...log.filter((entry) => entry.id !== draw.id)]
    .sort((left, right) => right.drawnAt.localeCompare(left.drawnAt));
}

function playTone(frequency: number, duration: number, volume = 0.04) {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
    oscillator.onended = () => void audio.close();
  } catch {
    // Sound is optional; the animation and reveal still work without audio support.
  }
}

export function RaffleWheel({
  eventId,
  eventName,
  coverImageUrl,
}: {
  eventId: string;
  eventName: string;
  coverImageUrl: string | null;
}) {
  const [selection, setSelection] = useState<RaffleSelection>("first");
  const [excludeOrganizers, setExcludeOrganizers] = useState(true);
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const [drawLog, setDrawLog] = useState<DrawLogEntry[]>([]);
  const [winner, setWinner] = useState<DrawLogEntry | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ name: string; url: string } | null>(null);
  const [isEntryListOpen, setIsEntryListOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isPreviewPaused, setIsPreviewPaused] = useState(false);
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);
  const [isPreviewFocused, setIsPreviewFocused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tickInterval = useRef<number | null>(null);
  const isBusy = useRef(false);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ selection, excludeOrganizers: String(excludeOrganizers) });
    fetch(`/api/admin/events/${encodeURIComponent(eventId)}/raffle-entries?${query}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { entries?: RaffleEntry[]; draws?: RaffleDrawRecord[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Raffle entries could not be loaded.");
        return result;
      })
      .then((result) => {
        if (active) {
          setEntries(result.entries ?? []);
          setDrawLog((result.draws ?? []).map(toDrawLogEntry));
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Raffle entries could not be loaded.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventId, selection, excludeOrganizers]);

  useEffect(() => () => {
    if (tickInterval.current !== null) window.clearInterval(tickInterval.current);
  }, []);

  useEffect(() => {
    if (!lightboxPhoto && !isEntryListOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxPhoto(null);
        setIsEntryListOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isEntryListOpen, lightboxPhoto]);

  const poolEntries = entries;
  const isLocked = isSpinning || isDeciding;
  const previewCount = Math.min(5, poolEntries.length);
  const previewCenter = Math.floor(previewCount / 2);
  const visibleCarouselEntries = previewCount > 0
    ? Array.from({ length: previewCount }, (_, offset) => {
      const index = (carouselIndex + offset - previewCenter + poolEntries.length) % poolEntries.length;
      return poolEntries[index];
    })
    : [];
  const isPreviewHeld = isPreviewPaused || isPreviewHovered || isPreviewFocused;

  useEffect(() => {
    if (
      isLoading ||
      isSpinning ||
      isEntryListOpen ||
      isPreviewHeld ||
      poolEntries.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;

    const interval = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % poolEntries.length);
    }, 2400);
    return () => window.clearInterval(interval);
  }, [isEntryListOpen, isLoading, isPreviewHeld, isSpinning, poolEntries.length]);

  async function refreshEntries() {
    const query = new URLSearchParams({ selection, excludeOrganizers: String(excludeOrganizers) });
    const response = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/raffle-entries?${query}`, { cache: "no-store" });
    const result = await response.json() as { entries?: RaffleEntry[]; draws?: RaffleDrawRecord[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Raffle entries could not be refreshed.");
    setEntries(result.entries ?? []);
    setDrawLog((result.draws ?? []).map(toDrawLogEntry));
    setCarouselIndex(0);
  }

  function startSound() {
    if (!soundEnabled) return;
    playTone(540, 0.08, 0.025);
    tickInterval.current = window.setInterval(() => playTone(760, 0.04, 0.018), 250);
  }

  function stopSound() {
    if (tickInterval.current !== null) window.clearInterval(tickInterval.current);
    tickInterval.current = null;
  }

  async function drawWinner() {
    if (isBusy.current || poolEntries.length === 0) return;
    isBusy.current = true;
    setError(null);
    setWinner(null);
    setIsSpinning(true);
    startSound();
    try {
      let result: { winner: RaffleEntry; entries: RaffleEntry[]; drawId: string; drawnAt: string; error?: string };
      try {
        const response = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/raffle-entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selection, excludeOrganizers }),
        });
        const payload = await response.json() as typeof result;
        if (!response.ok || !payload.winner || !payload.entries?.length) {
          throw new Error(payload.error ?? "A winner could not be drawn.");
        }
        result = payload;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "A winner could not be drawn.");
        return;
      }

      // Animate over the exact pool the server drew from so the reveal always lands on the recorded winner.
      const pool = result.entries;
      const winnerEntry = result.winner;
      const target = pool.findIndex((entry) => entry.participantId === winnerEntry.participantId);
      if (target < 0) {
        setError("The draw result could not be displayed. Check the draw log before drawing again.");
        await refreshEntries().catch(() => undefined);
        return;
      }
      setEntries(pool);
      if (pool.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const start = carouselIndex % pool.length;
        const distance = (target - start + pool.length) % pool.length;
        const laps = Math.max(2, Math.ceil((32 - distance) / pool.length));
        const steps = distance + laps * pool.length;
        const frames = Math.min(60, steps);

        for (let frame = 1; frame <= frames; frame += 1) {
          const progress = frame / frames;
          const eased = progress < 0.5
            ? 4 * progress ** 3
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          setCarouselIndex((start + Math.round(steps * eased)) % pool.length);
          await new Promise((resolve) => window.setTimeout(resolve, 5200 / frames));
        }
      }
      setCarouselIndex(target);
      await new Promise((resolve) => window.setTimeout(resolve, 350));

      if (soundEnabled) {
        playTone(660, 0.18);
        window.setTimeout(() => playTone(880, 0.28, 0.05), 150);
      }
      const draw: DrawLogEntry = {
        id: result.drawId,
        eventId,
        participantId: winnerEntry.participantId,
        name: winnerEntry.displayName,
        upn: winnerEntry.upn,
        photoId: winnerEntry.photoId,
        uploadedAt: winnerEntry.uploadedAt,
        drawnAt: result.drawnAt,
        disposition: "pending",
        photoUrl: winnerEntry.photoUrl,
      };
      setDrawLog((current) => upsertDraw(current, draw));
      setWinner(draw);
      confetti({ particleCount: 120, spread: 72, origin: { y: 0.63 }, colors: ["#e76f51", "#e9c46a", "#2a9d8f", "#f4a261"] });
    } finally {
      stopSound();
      setIsSpinning(false);
      isBusy.current = false;
    }
  }

  async function updateWinner(disposition: DrawLogEntry["disposition"]) {
    if (!winner || isBusy.current) return;
    isBusy.current = true;
    setIsDeciding(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/raffle-draws/${encodeURIComponent(winner.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disposition }),
      });
      const result = await response.json() as { draw?: RaffleDrawRecord; error?: string };
      if (!response.ok || !result.draw) throw new Error(result.error ?? "The winner action could not be saved.");
      setDrawLog((current) => upsertDraw(current, { ...toDrawLogEntry(result.draw!), photoUrl: winner.photoUrl }));
      setWinner(null);
      if (disposition === "removed") await refreshEntries();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The winner action could not be saved.");
      return;
    } finally {
      isBusy.current = false;
      setIsDeciding(false);
    }
    if (disposition === "respun") await drawWinner();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setIsFullscreen(Boolean(document.fullscreenElement));
    } catch {
      setError("Full-screen mode is not available in this browser.");
    }
  }

  function exportCsv() {
    const rows = ["drawnAt,employee,upn,photoId,uploadedAt,disposition"];
    for (const draw of drawLog) {
      rows.push([draw.drawnAt, draw.name, draw.upn, draw.photoId, draw.uploadedAt, draw.disposition].map(csvCell).join(","));
    }
    const blob = new Blob([`${rows.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-raffle-draws.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function movePreview(direction: -1 | 1) {
    if (poolEntries.length < 2 || isSpinning) return;
    setIsPreviewPaused(true);
    setCarouselIndex((current) => (current + direction + poolEntries.length) % poolEntries.length);
  }

  function togglePreviewPause() {
    if (isPreviewHeld) {
      setIsPreviewPaused(false);
      setIsPreviewHovered(false);
      setIsPreviewFocused(false);
    } else {
      setIsPreviewPaused(true);
    }
  }

  return (
    <section className="raffle-console" aria-label="Event raffle wheel">
      <header
        className="raffle-header"
        style={coverImageUrl ? {
          backgroundImage: `linear-gradient(90deg, rgba(18, 37, 34, 0.94) 0%, rgba(18, 37, 34, 0.78) 58%, rgba(18, 37, 34, 0.52) 100%), url("${coverImageUrl}")`,
        } : undefined}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="raffle-eyebrow font-mono text-[9px] tracking-widest text-[#FFDEA4]">
              PLATE 04 // LIVE RAFFLE WHEEL
            </span>
            <span className="text-[10px] font-serif italic text-[#FFDEA4]/80 font-bold hidden sm:inline">
              Bawal Epal; use heyPal!
            </span>
          </div>
          <h1 className="font-['Bodoni_Moda',serif] text-2xl sm:text-3xl font-medium italic text-[#FAF9F3]">{eventName}</h1>
        </div>
        <div className="raffle-header-actions">
          <button aria-label={soundEnabled ? "Mute raffle sounds" : "Enable raffle sounds"} className="raffle-icon-button" onClick={() => setSoundEnabled((enabled) => !enabled)} title={soundEnabled ? "Mute sound" : "Enable sound"} type="button">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"} className="raffle-icon-button" onClick={toggleFullscreen} title={isFullscreen ? "Exit full screen" : "Full screen"} type="button">
            {isFullscreen ? <Shrink size={18} /> : <Expand size={18} />}
          </button>
        </div>
      </header>

      <div className="raffle-controls font-mono">
        <div className="raffle-selection-control">
          <span className="text-[10px] tracking-wider uppercase">PHOTO SELECTION</span>
          <div className="raffle-segmented" role="group" aria-label="Select which participant photo to use">
            {selectionOptions.map((option) => (
              <button aria-pressed={selection === option.value} className={selection === option.value ? "selected" : ""} disabled={isLocked} key={option.value} onClick={() => {
                setIsLoading(true);
                setError(null);
                setSelection(option.value);
              }} type="button">
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <label className="raffle-exclude-toggle">
          <input checked={excludeOrganizers} disabled={isLocked} onChange={(change) => {
            setIsLoading(true);
            setError(null);
            setExcludeOrganizers(change.currentTarget.checked);
          }} type="checkbox" />
          <span className="text-xs">Exclude organizers</span>
        </label>
        <div className="raffle-eligible-count"><strong>{isLoading ? "…" : poolEntries.length}</strong><span>eligible</span></div>
      </div>

      <div
        className="raffle-stage"
        onMouseEnter={() => setIsPreviewHovered(true)}
        onMouseLeave={() => setIsPreviewHovered(false)}
        onFocusCapture={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest(".raffle-preview-button")) return;
          setIsPreviewFocused(true);
        }}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget;
          if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setIsPreviewFocused(false);
        }}
      >
        {!isLoading && poolEntries.length > 0 && (
          <div className="raffle-preview-toolbar font-mono">
            <div className="raffle-preview-summary">
              <span className="raffle-preview-eyebrow">ELIGIBLE ENTRIES</span>
              <strong>{poolEntries.length}</strong>
              <span>{poolEntries.length === 1 ? "one participant · one entry" : "one entry per participant"}</span>
            </div>
            <div className="raffle-preview-actions">
              <button
                aria-pressed={isPreviewHeld}
                className="raffle-preview-button"
                onClick={togglePreviewPause}
                type="button"
              >
                {isPreviewHeld ? <Play size={15} /> : <Pause size={15} />}
                {isPreviewHeld ? "Resume preview" : "Pause preview"}
              </button>
              <button className="raffle-preview-button raffle-view-entries" onClick={() => setIsEntryListOpen(true)} type="button">
                <UsersRound size={15} />
                View all entries
              </button>
            </div>
          </div>
        )}
        {poolEntries.length > 1 && !isLoading && (
          <>
            <button aria-label="Previous entrant" className="raffle-preview-nav raffle-preview-previous" disabled={isSpinning} onClick={() => movePreview(-1)} type="button">
              <ChevronLeft size={22} />
            </button>
            <button aria-label="Next entrant" className="raffle-preview-nav raffle-preview-next" disabled={isSpinning} onClick={() => movePreview(1)} type="button">
              <ChevronRight size={22} />
            </button>
          </>
        )}
        {visibleCarouselEntries.length > 0 && (
          <div
            aria-label={`Preview of ${poolEntries.length} eligible entries`}
            className={`raffle-carousel${isSpinning ? " is-spinning" : ""}`}
            role="list"
          >
            {visibleCarouselEntries.map((entry, index) => (
              <article
                className={`raffle-carousel-item${index === previewCenter ? " is-center" : ""}${visibleCarouselEntries.length === 5 && (index === 0 || index === 4) ? " is-edge" : ""}`}
                key={entry.participantId}
                role="listitem"
              >
                {entry.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.photoUrl} alt={`Entry photo from ${entry.displayName}`} />
                ) : <span>{initials(entry.displayName)}</span>}
                <small>{entry.displayName}</small>
              </article>
            ))}
          </div>
        )}
        {isLoading && <div className="raffle-stage-overlay"><LoaderCircle className="spin-icon" size={24} />Loading entries</div>}
        {!isLoading && poolEntries.length === 0 && (
          <div className="raffle-stage-overlay" role="status">
            {excludeOrganizers
              ? 'No eligible approved photos. Organizer uploads are excluded; uncheck "Exclude organizers" to include them.'
              : "No eligible approved photos."}
          </div>
        )}
      </div>

      <div className="raffle-draw-action">
        <button className="raffle-spin-button" disabled={isLoading || isSpinning || poolEntries.length === 0} onClick={drawWinner} type="button">
          {isSpinning ? <LoaderCircle className="spin-icon" size={20} /> : <Dices size={20} />}
          {isSpinning ? "Drawing…" : "Draw winner"}
        </button>
        <span>One entry per eligible employee</span>
      </div>

      {error && <p className="raffle-error" role="alert">{error}</p>}

      {isEntryListOpen && (
        <div className="raffle-entry-list-backdrop" onClick={() => setIsEntryListOpen(false)}>
          <section
            aria-labelledby="raffle-entry-list-title"
            aria-modal="true"
            className="raffle-entry-list-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="raffle-entry-list-header">
              <div>
                <p className="raffle-eyebrow">ENTRY CHECK</p>
                <h2 id="raffle-entry-list-title">Eligible entries <span>{poolEntries.length}</span></h2>
                <p>One selected photo per eligible employee.</p>
              </div>
              <button aria-label="Close entry list" autoFocus className="raffle-icon-button" onClick={() => setIsEntryListOpen(false)} type="button">
                <X size={19} />
              </button>
            </header>
            <div className="raffle-entry-list-grid">
              {poolEntries.map((entry) => (
                <article className="raffle-entry-list-item" key={entry.participantId}>
                  <div className="raffle-entry-list-photo">
                    {entry.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.photoUrl} alt={`Selected entry from ${entry.displayName}`} />
                    ) : <span>{initials(entry.displayName)}</span>}
                  </div>
                  <strong>{entry.displayName}</strong>
                  <small>{entry.upn}</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="raffle-log" aria-labelledby="raffle-log-title">
        <div className="raffle-log-heading">
          <div><p className="raffle-eyebrow">SESSION HISTORY</p><h2 id="raffle-log-title">Draw log <span>{drawLog.length}</span></h2></div>
          <button className="raffle-csv-button" disabled={!drawLog.length} onClick={exportCsv} type="button">Export CSV</button>
        </div>
        {drawLog.length ? (
          <ol className="raffle-log-list">
            {drawLog.map((draw, index) => (
              <li key={draw.id}>
                <span className="raffle-log-number">{String(drawLog.length - index).padStart(2, "0")}</span>
                <button
                  aria-label={draw.photoUrl ? `View winning photo from ${draw.name}` : `No photo available for ${draw.name}`}
                  className="raffle-log-photo"
                  disabled={!draw.photoUrl}
                  onClick={() => {
                    if (draw.photoUrl) setLightboxPhoto({ name: draw.name, url: draw.photoUrl });
                  }}
                  type="button"
                >
                  {draw.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draw.photoUrl} alt="" />
                  ) : <span>{initials(draw.name)}</span>}
                </button>
                <span className="raffle-log-name">{draw.name}<small>{draw.upn}</small></span>
                <span className="raffle-log-disposition">{draw.disposition === "pending" ? "Awaiting decision" : draw.disposition}</span>
                <time dateTime={draw.drawnAt}>{new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(draw.drawnAt))}</time>
              </li>
            ))}
          </ol>
        ) : <p className="raffle-log-empty">Completed draws will appear here.</p>}
      </section>

      {winner && (
        <div className="raffle-winner-backdrop">
          <section aria-labelledby="winner-title" aria-modal="true" className="raffle-winner-dialog" role="dialog">
            <button aria-label="Close winner details" className="raffle-winner-close" disabled={isDeciding} onClick={() => { setLightboxPhoto(null); setWinner(null); }} type="button"><X size={19} /></button>
            <p className="raffle-eyebrow">THE WINNER</p>
            {winner.photoUrl ? (
              <button
                aria-label={`View winning photo from ${winner.name} full screen`}
                className="raffle-winner-photo raffle-winner-photo-trigger"
                onClick={() => setLightboxPhoto({ name: winner.name, url: winner.photoUrl! })}
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={winner.photoUrl} alt={`Winning photo from ${winner.name}`} />
              </button>
            ) : (
              <div className="raffle-winner-photo"><span>{initials(winner.name)}</span></div>
            )}
            <h2 id="winner-title">{winner.name}</h2>
            <p className="raffle-winner-upn">{winner.upn}</p>
            <time dateTime={winner.uploadedAt}>Photo submitted {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(winner.uploadedAt))}</time>
            <div className="raffle-winner-actions">
              <button className="raffle-remove-winner" disabled={isDeciding} onClick={() => void updateWinner("removed")} type="button">Remove from pool</button>
              <button className="raffle-keep-winner" disabled={isDeciding} onClick={() => void updateWinner("kept")} type="button">Keep in pool</button>
              <button className="raffle-respin-winner" disabled={isDeciding} onClick={() => void updateWinner("respun")} type="button"><RotateCcw size={16} /> Re-spin</button>
            </div>
          </section>
        </div>
      )}
      {lightboxPhoto && (
        <div
          aria-label={`Full-size winning photo from ${lightboxPhoto.name}`}
          aria-modal="true"
          className="raffle-photo-lightbox"
          onClick={() => setLightboxPhoto(null)}
          role="dialog"
        >
          <button
            aria-label="Close full-size photo"
            autoFocus
            className="raffle-icon-button raffle-photo-lightbox-close"
            onClick={() => setLightboxPhoto(null)}
            type="button"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img onClick={(event) => event.stopPropagation()} src={lightboxPhoto.url} alt={`Full-size winning photo from ${lightboxPhoto.name}`} />
        </div>
      )}
    </section>
  );
}