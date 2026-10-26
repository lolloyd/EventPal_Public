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
  photos,
}: {
  coverImageUrl: string | null;
  eventName: string;
  photos: WallPhoto[];
}) {
  const wallRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isFallbackFullscreen, setIsFallbackFullscreen] = useState(false);
  const [failedPreviews, setFailedPreviews] = useState<string[]>([]);
  const isFullscreen = isNativeFullscreen || isFallbackFullscreen;
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
    if (count < 2) return;
    setIsPaused(true);
    setIndex((current) => (current + direction + count) % count);
  }

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
          <span className="raffle-preview-eyebrow">{isFullscreen ? eventName.toUpperCase() : "APPROVED PHOTOS"}</span>
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
