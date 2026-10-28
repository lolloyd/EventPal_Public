"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Pause, Play, Shrink } from "lucide-react";

interface WallPhoto {
  id: string;
  uploadedBy: string;
  caption: string | null;
  previewUrl: string | null;
}

export function PhotoWall({
  coverImageUrl,
  eventName,
  photos: initialPhotos,
  eventId,
  enablePolling = false,
  isPublicView = false,
}: {
  coverImageUrl: string | null;
  eventName: string;
  photos: WallPhoto[];
  eventId?: string;
  enablePolling?: boolean;
  isPublicView?: boolean;
}) {
  const wallRef = useRef<HTMLElement>(null);
  const [photos, setPhotos] = useState<WallPhoto[]>(initialPhotos);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isFallbackFullscreen, setIsFallbackFullscreen] = useState(false);
  const [failedPreviews, setFailedPreviews] = useState<string[]>([]);
  const [newPhotoAlert, setNewPhotoAlert] = useState<string | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFullscreen = isNativeFullscreen || isFallbackFullscreen;

  // Track latest photos and index in refs so polling callbacks always see freshest values
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const indexRef = useRef(index);
  indexRef.current = index;

  // Sync initialPhotos if parent prop changes
  const initialPhotosMounted = useRef(false);
  useEffect(() => {
    if (!initialPhotosMounted.current) {
      initialPhotosMounted.current = true;
      return;
    }
    if (initialPhotos.length > 0) {
      setPhotos((current) => (current.length === 0 ? initialPhotos : current));
    }
  }, [initialPhotos]);

  // Clean up alert timeout on unmount
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, []);

  // Poll every minute (60,000 ms) to check for newly added photos
  useEffect(() => {
    if (!enablePolling || !eventId) return;

    async function checkForNewPhotos() {
      try {
        const res = await fetch(`/api/events/${encodeURIComponent(eventId ?? "")}/photos`, { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as {
          photos?: {
            id: string;
            imageUrl: string;
            uploadedBy?: string;
            caption: string | null;
            uploadedAt?: string;
          }[];
        };

        if (!Array.isArray(data.photos)) return;

        const incoming: WallPhoto[] = data.photos
          .filter((p) => p && typeof p.id === "string" && typeof p.imageUrl === "string" && p.imageUrl)
          .map((p) => ({
            id: p.id,
            uploadedBy: p.uploadedBy || p.caption || "Guest",
            caption: p.caption,
            previewUrl: p.imageUrl,
          }));

        const currentPhotos = photosRef.current;
        const currentCount = currentPhotos.length;
        const currentIdx = currentCount ? indexRef.current % currentCount : 0;
        const currentPhotoId = currentPhotos[currentIdx]?.id;

        const incomingMap = new Map(incoming.map((p) => [p.id, p]));
        const existingIds = new Set(currentPhotos.map((p) => p.id));

        // Identify newly added photos not yet in our active playlist
        // Server sends uploadedAt DESC; reversing gives chronological order among new arrivals
        const newlyAdded = incoming
          .filter((p) => !existingIds.has(p.id))
          .reverse();

        // Check if any existing photos were unapproved or removed
        const hasRemoved = currentPhotos.some((p) => !incomingMap.has(p.id));

        // If no additions and no removals, update metadata in place if modified
        if (newlyAdded.length === 0 && !hasRemoved) {
          const hasMetaChanges = currentPhotos.some((p) => {
            const inc = incomingMap.get(p.id);
            return (
              inc &&
              (inc.caption !== p.caption ||
                inc.uploadedBy !== p.uploadedBy ||
                inc.previewUrl !== p.previewUrl)
            );
          });
          if (hasMetaChanges) {
            setPhotos(
              currentPhotos.map((p) => {
                const inc = incomingMap.get(p.id);
                return inc ? { ...p, ...inc } : p;
              }),
            );
          }
          return;
        }

        // Retain currently active photos in their existing relative playback order
        const retained = currentPhotos
          .filter((p) => incomingMap.has(p.id))
          .map((p) => {
            const inc = incomingMap.get(p.id);
            return inc ? { ...p, ...inc } : p;
          });

        // Append newly added photos to the end of the existing queue.
        // This ensures the current sequence finishes playing where it left off
        // before smoothly rotating into the new photos.
        const mergedPhotos = [...retained, ...newlyAdded];

        // Ensure the currently displaying photo remains active with zero jump
        if (currentPhotoId) {
          const preservedIdx = mergedPhotos.findIndex((p) => p.id === currentPhotoId);
          if (preservedIdx !== -1) {
            setIndex(preservedIdx);
          } else {
            setIndex(mergedPhotos.length ? currentIdx % mergedPhotos.length : 0);
          }
        } else {
          setIndex(0);
        }

        setPhotos(mergedPhotos);

        if (newlyAdded.length > 0) {
          if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
          setNewPhotoAlert(
            `+${newlyAdded.length} new ${newlyAdded.length === 1 ? "photo" : "photos"} queued`,
          );
          alertTimeoutRef.current = setTimeout(() => {
            setNewPhotoAlert(null);
          }, 6000);
        }
      } catch {
        // Network retry on next interval
      }
    }

    // Check every minute (60,000 ms), but only when tab is active
    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        void checkForNewPhotos();
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [enablePolling, eventId]);

  const count = photos.length;
  const currentIndex = count ? index % count : 0;
  const previewCount = Math.min(5, count);
  const center = Math.floor(previewCount / 2);
  const visiblePhotos = Array.from({ length: previewCount }, (_, offset) =>
    photos[(currentIndex + offset - center + count) % count],
  );
  // In full screen the wall is a display, so only an explicit pause should stop it.
  const isHeld = isPaused || (!isFullscreen && (isHovered || isFocused));

  useEffect(() => {
    if (count < 2 || isHeld || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => setIndex((current) => (current + 1) % count), 2400);
    return () => window.clearInterval(interval);
  }, [count, isHeld]);

  useEffect(() => {
    function syncFullscreen() {
      setIsNativeFullscreen(document.fullscreenElement === wallRef.current);
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (!isFallbackFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFallbackFullscreen]);

  async function toggleFullscreen() {
    if (isFallbackFullscreen) {
      setIsFallbackFullscreen(false);
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (wallRef.current?.requestFullscreen) await wallRef.current.requestFullscreen();
      else setIsFallbackFullscreen(true);
    } catch {
      setIsFallbackFullscreen(true);
    }
    wallRef.current?.focus();
  }

  function move(direction: -1 | 1) {
    const c = photosRef.current.length;
    if (c < 2) return;
    setIsPaused(true);
    setIndex((current) => (current + direction + c) % c);
  }

  // Keyboard shortcut listener for space (pause/resume), arrows, and F (fullscreen)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        setIsPaused((paused) => !paused);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        void toggleFullscreen();
      } else if (event.key === "Escape" && isFallbackFullscreen) {
        setIsFallbackFullscreen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFallbackFullscreen]);

  return (
    <section
      aria-label={`${eventName} photo carousel`}
      aria-roledescription="carousel"
      className={`raffle-stage admin-photo-wall${coverImageUrl ? " has-cover" : ""}${isFullscreen ? " is-fullscreen" : ""}${isFallbackFullscreen ? " is-fallback-fullscreen" : ""}`}
      ref={wallRef}
      style={coverImageUrl ? { "--photo-wall-cover": `url("${coverImageUrl}")` } as CSSProperties : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setIsFocused(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        } else if (event.key === "Escape" && isFallbackFullscreen) {
          setIsFallbackFullscreen(false);
        }
      }}
      tabIndex={0}
    >
      <div className="raffle-preview-toolbar">
        <div className="raffle-preview-summary">
          <div className="flex items-center gap-2">
            {isPublicView && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-secondary text-white text-[9px] font-mono font-bold uppercase tracking-widest shadow-brutal-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-lime animate-pulse" />
                Live
              </span>
            )}
            {newPhotoAlert && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-electric-lime text-charcoal-ink text-[9px] font-mono font-bold uppercase tracking-widest shadow-brutal-sm border border-charcoal-ink animate-pulse">
                ● {newPhotoAlert}
              </span>
            )}
            <span className="raffle-preview-eyebrow">
              {isFullscreen ? eventName.toUpperCase() : isPublicView ? `${eventName.toUpperCase()} // EXHIBITION` : "APPROVED PHOTOS"}
            </span>
          </div>
          <strong>{count}</strong>
          {count > 0 && <span aria-live={isHeld ? "polite" : "off"}>{currentIndex + 1} of {count}</span>}
        </div>
        <div className="raffle-preview-actions">
          {count > 1 && (
            <button
              aria-pressed={isPaused}
              className="raffle-preview-button"
              onClick={() => {
                setIsPaused(!isHeld);
                setIsHovered(false);
                setIsFocused(false);
              }}
              type="button"
            >
              {isHeld ? <Play size={15} /> : <Pause size={15} />}
              {isHeld ? "Resume slideshow" : "Pause slideshow"}
            </button>
          )}
          <button
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
            aria-pressed={isFullscreen}
            className="raffle-preview-button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit full screen (Esc)" : "Full screen"}
            type="button"
          >
            {isFullscreen ? <Shrink size={15} /> : <Expand size={15} />}
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>
      {count > 1 && (
        <>
          <button aria-label="Previous photo" className="raffle-preview-nav raffle-preview-previous" onClick={() => move(-1)} type="button">
            <ChevronLeft size={22} />
          </button>
          <button aria-label="Next photo" className="raffle-preview-nav raffle-preview-next" onClick={() => move(1)} type="button">
            <ChevronRight size={22} />
          </button>
        </>
      )}
      {count > 0 ? (
        <div className="raffle-carousel" role="list" aria-label="Event photos">
          {visiblePhotos.map((photo, position) => (
            <article
              aria-label={`Photo from ${photo.uploadedBy}`}
              aria-current={position === center ? "true" : undefined}
              className={`raffle-carousel-item${position === center ? " is-center" : ""}${previewCount === 5 && (position === 0 || position === 4) ? " is-edge" : ""}`}
              key={photo.id}
              role="listitem"
            >
              {photo.previewUrl && !failedPreviews.includes(photo.previewUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.previewUrl}
                  alt={photo.caption || `Photo uploaded by ${photo.uploadedBy}`}
                  onError={(event) => {
                    const url = event.currentTarget.getAttribute("src");
                    if (url) setFailedPreviews((current) => current.includes(url) ? current : [...current, url]);
                  }}
                />
              ) : <span className="admin-photo-wall-unavailable">Photo unavailable</span>}
              <small title={photo.caption || photo.uploadedBy}>{photo.uploadedBy}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="raffle-stage-overlay" role="status">No approved photos have been submitted for this event.</p>
      )}
    </section>
  );
}
