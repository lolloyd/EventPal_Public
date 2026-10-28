"use client";

import { useEffect, useState } from "react";
import { Check, Expand, Image as ImageIcon, ShieldAlert, Trash2, X } from "lucide-react";
import { removePhotoAction, setPhotoStatusAction } from "@/app/admin/event-actions";
import type { PhotoRecord } from "@/lib/event-models";

type ReviewFilter = "all" | "flagged" | "approved";
type ReviewSort = "newest" | "oldest" | "uploader";
type UploaderFilter = "all" | string;

function formatUploadedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PhotoReview({
  eventId,
  photos,
}: {
  eventId: string;
  photos: (PhotoRecord & { previewUrl: string | null })[];
}) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [uploaderFilter, setUploaderFilter] = useState<UploaderFilter>("all");
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; uploadedBy: string } | null>(null);
  const uploaders = Array.from(new Map(photos.map((photo) => [
    photo.uploadedBy.toLocaleLowerCase(), photo.uploadedBy,
  ])).values()).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
  const visiblePhotos = photos
    .filter((photo) => (filter === "all" || photo.status === filter) &&
      (uploaderFilter === "all" || photo.uploadedBy.toLocaleLowerCase() === uploaderFilter))
    .sort((left, right) => {
      if (sort === "uploader") {
        return left.uploadedBy.localeCompare(right.uploadedBy, undefined, { sensitivity: "base" }) ||
          Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt);
      }
      const difference = Date.parse(left.uploadedAt) - Date.parse(right.uploadedAt);
      return sort === "newest" ? -difference : difference;
    });
  const flaggedCount = photos.filter((photo) => photo.status === "flagged").length;

  useEffect(() => {
    if (!selectedPhoto) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPhoto]);

  return (
    <section className="photo-review-section" aria-label="Submitted event photos">
      <div className="photo-review-toolbar">
        <div className="event-filters" role="group" aria-label="Filter photos by moderation status">
          {([
            ["all", "All photos"],
            ["flagged", "Flagged"],
            ["approved", "Approved"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              className={`filter-button${filter === value ? " is-selected" : ""}`}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
              <span>{value === "all" ? photos.length : photos.filter((photo) => photo.status === value).length}</span>
            </button>
          ))}
        </div>
        <label className="photo-review-sort">
          <span>Uploader</span>
          <select
            aria-label="Filter photos by uploader"
            onChange={(change) => setUploaderFilter(change.currentTarget.value)}
            value={uploaderFilter}
          >
            <option value="all">All</option>
            {uploaders.map((uploader) => (
              <option key={uploader.toLocaleLowerCase()} value={uploader.toLocaleLowerCase()}>{uploader}</option>
            ))}
          </select>
        </label>
        <label className="photo-review-sort">
          <span>Sort by</span>
          <select aria-label="Sort photos" onChange={(change) => setSort(change.currentTarget.value as ReviewSort)} value={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="uploader">Uploader A–Z</option>
          </select>
        </label>
        <span className="review-summary">
          {flaggedCount ? `${flaggedCount} need review` : "All submissions reviewed"}
        </span>
      </div>

      {visiblePhotos.length ? (
        <div className="photo-review-grid">
          {visiblePhotos.map((photo) => (
            <article className="photo-review-item" key={photo.id}>
              <div className="photo-review-image">
                {photo.previewUrl ? (
                  <button
                    aria-label={`View full photo uploaded by ${photo.uploadedBy}`}
                    className="photo-review-open"
                    onClick={() => setSelectedPhoto({ url: photo.previewUrl!, uploadedBy: photo.uploadedBy })}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.previewUrl} alt="" loading="lazy" decoding="async" />
                    <span className="photo-review-expand" aria-hidden="true"><Expand size={18} /></span>
                  </button>
                ) : (
                  <div className="photo-no-preview">
                    <ImageIcon size={26} aria-hidden="true" />
                    <span>Preview unavailable</span>
                  </div>
                )}
                <span className={`status-badge status-${photo.status}`}>
                  {photo.status === "approved" ? "Approved" : "Flagged"}
                </span>
              </div>
              <div className="photo-review-details">
                <span className="photo-uploader">{photo.uploadedBy}</span>
                <span className="photo-time">{formatUploadedAt(photo.uploadedAt)}</span>
                {photo.caption && <p className="photo-caption">{photo.caption}</p>}
                <div className="photo-review-actions">
                  <form action={setPhotoStatusAction}>
                    <input name="eventId" type="hidden" value={eventId} />
                    <input name="photoId" type="hidden" value={photo.id} />
                    <input name="status" type="hidden" value={photo.status === "approved" ? "flagged" : "approved"} />
                    <button className="secondary-button" type="submit">
                      {photo.status === "approved" ? <ShieldAlert size={15} /> : <Check size={15} />}
                      {photo.status === "approved" ? "Flag" : "Approve"}
                    </button>
                  </form>
                  <form action={removePhotoAction}>
                    <input name="eventId" type="hidden" value={eventId} />
                    <input name="photoId" type="hidden" value={photo.id} />
                    <button
                      aria-label={`Remove photo uploaded by ${photo.uploadedBy}`}
                      className="icon-button danger-icon"
                      onClick={(click) => {
                        if (!window.confirm("Permanently remove this photo from the event?")) {
                          click.preventDefault();
                        }
                      }}
                      type="submit"
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-events photo-empty">
          <ImageIcon size={24} aria-hidden="true" />
          <p>{photos.length === 0 ? "No photo submissions yet." : "No photos in this review filter."}</p>
        </div>
      )}
      {selectedPhoto && (
        <div className="photo-review-lightbox" onClick={() => setSelectedPhoto(null)}>
          <section
            aria-label={`Full photo uploaded by ${selectedPhoto.uploadedBy}`}
            aria-modal="true"
            className="photo-review-lightbox-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close full photo"
              autoFocus
              className="photo-review-lightbox-close"
              onClick={() => setSelectedPhoto(null)}
              type="button"
            >
              <X size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPhoto.url} alt={`Full event photo uploaded by ${selectedPhoto.uploadedBy}`} />
            <p>{selectedPhoto.uploadedBy}</p>
          </section>
        </div>
      )}
    </section>
  );
}