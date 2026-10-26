"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import type { PhotoStatus } from "@/lib/event-models";

export interface ContributorPhoto {
  id: string;
  caption: string | null;
  previewUrl: string | null;
  status: PhotoStatus;
  uploadedAt: string;
}

export interface Contributor {
  number: number;
  email: string;
  photoCount: number;
  photos: ContributorPhoto[];
}

type SortKey = "number" | "email" | "photoCount";
type SortDirection = "asc" | "desc";

const columns: { key: SortKey; label: string; defaultDirection: SortDirection }[] = [
  { key: "number", label: "No.", defaultDirection: "asc" },
  { key: "email", label: "Email address", defaultDirection: "asc" },
  { key: "photoCount", label: "Number of photos submitted", defaultDirection: "desc" },
];

function compareEmail(left: Contributor, right: Contributor) {
  return left.email.localeCompare(right.email, undefined, { sensitivity: "base" });
}

function formatUploadedAt(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ContributorTable({ contributors }: { contributors: Contributor[] }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "email", direction: "asc" });
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const openContributor = contributors.find((contributor) => contributor.email === openEmail) ?? null;

  const sortedContributors = [...contributors].sort((left, right) => {
    const order = sort.direction === "asc" ? 1 : -1;
    if (sort.key === "email") return order * compareEmail(left, right);
    const difference = sort.key === "number" ? left.number - right.number : left.photoCount - right.photoCount;
    return order * difference || compareEmail(left, right);
  });

  function changeSort(key: SortKey, defaultDirection: SortDirection) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: defaultDirection });
  }

  function closeGallery() {
    setOpenEmail(null);
    triggerRef.current?.focus();
  }

  return (
    <section aria-labelledby="event-information-title" className="event-information">
      <h2 id="event-information-title">Event Information ({contributors.length})</h2>
      <table className="event-information-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const isActive = sort.key === column.key;
              const SortIcon = !isActive ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
              return (
                <th
                  aria-sort={isActive ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                  key={column.key}
                  scope="col"
                >
                  <button
                    className={`event-information-sort${isActive ? " is-active" : ""}`}
                    onClick={() => changeSort(column.key, column.defaultDirection)}
                    type="button"
                  >
                    {column.label}
                    <SortIcon aria-hidden="true" size={12} />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedContributors.map((contributor) => (
            <tr key={contributor.email.toLocaleLowerCase()}>
              <td>{contributor.number}</td>
              <td>{contributor.email}</td>
              <td>
                <button
                  aria-label={`View ${contributor.photoCount} ${contributor.photoCount === 1 ? "photo" : "photos"} from ${contributor.email}`}
                  className="event-information-count"
                  onClick={(event) => {
                    triggerRef.current = event.currentTarget;
                    setOpenEmail(contributor.email);
                  }}
                  type="button"
                >
                  {contributor.photoCount}
                </button>
              </td>
            </tr>
          ))}
          {!contributors.length && (
            <tr>
              <td colSpan={3}>No photos have been submitted.</td>
            </tr>
          )}
        </tbody>
      </table>
      {openContributor && createPortal(<ContributorGallery contributor={openContributor} onClose={closeGallery} />, document.body)}
    </section>
  );
}

function ContributorGallery({ contributor, onClose }: { contributor: Contributor; onClose: () => void }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [failedPreviews, setFailedPreviews] = useState<string[]>([]);
  const photos = contributor.photos;
  const selectedPhoto = selectedIndex === null ? null : photos[selectedIndex];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (selectedIndex !== null) setSelectedIndex(null);
        else onClose();
      } else if (selectedIndex !== null && photos.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        const step = event.key === "ArrowLeft" ? -1 : 1;
        setSelectedIndex((selectedIndex + step + photos.length) % photos.length);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, photos.length, selectedIndex]);

  function preview(photo: ContributorPhoto, alt: string) {
    if (!photo.previewUrl || failedPreviews.includes(photo.previewUrl)) {
      return <span className="contributor-gallery-unavailable"><Images aria-hidden="true" size={22} />Photo unavailable</span>;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        onError={(event) => {
          const url = event.currentTarget.getAttribute("src");
          if (url) setFailedPreviews((current) => current.includes(url) ? current : [...current, url]);
        }}
        src={photo.previewUrl}
      />
    );
  }

  return (
    <div className="contributor-gallery-backdrop" onClick={onClose}>
      <section
        aria-labelledby="contributor-gallery-title"
        aria-modal="true"
        className="contributor-gallery-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="contributor-gallery-header">
          <div>
            <p>CONTRIBUTOR #{contributor.number} · {contributor.photoCount} {contributor.photoCount === 1 ? "PHOTO" : "PHOTOS"}</p>
            <h2 id="contributor-gallery-title">{contributor.email}</h2>
          </div>
          <button aria-label="Close gallery" autoFocus className="contributor-gallery-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        {selectedPhoto && selectedIndex !== null ? (
          <div className="contributor-gallery-viewer">
            <div className="contributor-gallery-viewer-bar">
              <button className="contributor-gallery-back" onClick={() => setSelectedIndex(null)} type="button">
                <ChevronLeft size={16} /> All photos
              </button>
              <span>{selectedIndex + 1} of {photos.length}</span>
            </div>
            <figure>
              <div className="contributor-gallery-stage">
                {photos.length > 1 && (
                  <button
                    aria-label="Previous photo"
                    className="contributor-gallery-nav is-previous"
                    onClick={() => setSelectedIndex((selectedIndex - 1 + photos.length) % photos.length)}
                    type="button"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                {preview(selectedPhoto, selectedPhoto.caption || `Photo uploaded by ${contributor.email}`)}
                {photos.length > 1 && (
                  <button
                    aria-label="Next photo"
                    className="contributor-gallery-nav is-next"
                    onClick={() => setSelectedIndex((selectedIndex + 1) % photos.length)}
                    type="button"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
              <figcaption>
                {selectedPhoto.caption && <strong>{selectedPhoto.caption}</strong>}
                <span>
                  {formatUploadedAt(selectedPhoto.uploadedAt)}
                  {selectedPhoto.status === "flagged" && <em className="contributor-gallery-flag">Flagged</em>}
                </span>
              </figcaption>
            </figure>
          </div>
        ) : (
          <ul className="contributor-gallery-grid" aria-label={`Photos from ${contributor.email}`}>
            {photos.map((photo, index) => (
              <li key={photo.id}>
                <button
                  aria-label={`Open photo ${index + 1} of ${photos.length}${photo.caption ? `: ${photo.caption}` : ""}`}
                  className="contributor-gallery-thumb"
                  onClick={() => setSelectedIndex(index)}
                  type="button"
                >
                  {preview(photo, "")}
                  {photo.status === "flagged" && <em className="contributor-gallery-flag">Flagged</em>}
                </button>
                <p title={photo.caption ?? undefined}>{photo.caption || "No caption"}</p>
                <time dateTime={photo.uploadedAt}>{formatUploadedAt(photo.uploadedAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
