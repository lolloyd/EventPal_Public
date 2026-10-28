"use client";

import imageCompression from "browser-image-compression";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  Lock,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/app/theme";
import type { EventRecord } from "@/lib/event-models";
import {
  listQueuedUploads,
  removeQueuedUpload,
  saveQueuedUpload,
} from "@/lib/offline-upload-queue";

interface WallPhoto {
  id: string;
  imageUrl: string | null;
  uploadedAt: string;
  caption: string | null;
}

type UploadStatus = "ready" | "compressing" | "uploading" | "complete" | "failed";
const offlineUploadMessage = "Saved on this device. It will retry when your connection returns.";

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  status: UploadStatus;
  progress: number;
  error: string | null;
  retryOnReconnect: boolean;
}

function formatEventDate(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" });
  if (start.toDateString() === end.toDateString()) return date.format(start);
  return `${date.format(start)} – ${date.format(end)}`;
}

function formatUploadTime(uploadedAt: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(uploadedAt));
}

function patchUpload(items: UploadItem[], id: string, update: Partial<UploadItem>) {
  return items.map((item) => item.id === id ? { ...item, ...update } : item);
}

const uploadTimeoutMs = 3 * 60 * 1000;
const maxUploadBytes = 40 * 1024 * 1024;
const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Some Android camera/gallery apps report an empty or generic MIME type. Fall back to the extension. */
function resolvePhotoType(file: File): string | null {
  if (allowedPhotoTypes.has(file.type)) return file.type;
  if (file.type && file.type !== "application/octet-stream") return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return extensionTypes[extension] ?? null;
}

function messageForStatus(status: number, serverMessage: string | undefined) {
  if (serverMessage) return serverMessage;
  if (status === 401 || status === 403) return "Your session has expired. Refresh the page and sign in again.";
  if (status === 413) return "This photo is too large for the server. Try a smaller photo.";
  if (status === 429 || status === 503) return "The server is busy. Retry in a moment.";
  if (status >= 500) return "The server had a problem saving this photo. Try again.";
  return "The photo could not be uploaded. Try again.";
}

function uploadFormDataWithProgress(formData: FormData, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.timeout = uploadTimeoutMs;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let serverMessage: string | undefined;
      try {
        const res = JSON.parse(xhr.responseText) as { error?: string };
        if (typeof res.error === "string" && res.error) serverMessage = res.error;
      } catch {
        // Non-JSON response (e.g. hosting proxy error page) — use status-based message.
      }
      reject(new Error(messageForStatus(xhr.status, serverMessage)));
    };
    xhr.onerror = () => reject(new Error("Network connection interrupted. Try again."));
    xhr.ontimeout = () => reject(new Error("Upload timed out on a slow connection. Try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    try {
      xhr.send(formData);
    } catch {
      reject(new Error("Network connection interrupted. Try again."));
    }
  });
}

async function preparePhotoForUpload(file: File, fileType: string): Promise<Blob> {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType,
    });
    if (compressed && compressed.size > 0) return compressed;
  } catch (error) {
    // Compression can fail on low-memory phones or unusual encodings; fall back to the original.
    console.warn("[heypal] Image compression failed, uploading original", error);
  }
  return file;
}


export function AttendeeExperience({
  event,
  initialPhotos,
  coverImageUrl,
  demoMode,
  userName,
}: {
  event: EventRecord;
  initialPhotos: WallPhoto[];
  coverImageUrl: string | null;
  demoMode: boolean;
  userName: string;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [photos, setPhotos] = useState(initialPhotos);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const reconnectRetry = useRef<() => void>(() => { });
  const previewUrls = useRef(new Set<string>());
  const uploadingRef = useRef(false);

  // Release all object URLs when leaving the page to avoid memory leaks on phones.
  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function createPreviewUrl(file: Blob) {
    try {
      const url = URL.createObjectURL(file);
      previewUrls.current.add(url);
      return url;
    } catch {
      return "";
    }
  }

  function releasePreviewUrl(url: string) {
    if (!url) return;
    URL.revokeObjectURL(url);
    previewUrls.current.delete(url);
  }

  useEffect(() => {
    let active = true;
    void listQueuedUploads(event.id).then((queuedUploads) => {
      if (!active || queuedUploads.length === 0) return;
      const restoredItems: UploadItem[] = queuedUploads
        .filter((upload) => upload && upload.file instanceof Blob && typeof upload.id === "string")
        .map((upload) => ({
          ...upload,
          caption: upload.caption ?? "",
          previewUrl: createPreviewUrl(upload.file),
          status: navigator.onLine ? "ready" : "failed",
          progress: 0,
          error: navigator.onLine ? null : offlineUploadMessage,
          retryOnReconnect: true,
        }));
      setItems((current) => {
        const currentIds = new Set(current.map((item) => item.id));
        return [...current, ...restoredItems.filter((item) => !currentIds.has(item.id))];
      });
    }).catch(() => {
      if (active) setPageError("Saved offline uploads could not be restored from this device.");
    });
    return () => {
      active = false;
    };
  }, [event.id]);

  useEffect(() => {
    let active = true;
    async function refreshPhotos() {
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(event.id)}/photos`, { cache: "no-store" });
        if (!response.ok) throw new Error("Photos could not be refreshed.");
        const result = await response.json() as { photos?: WallPhoto[] };
        if (active && Array.isArray(result.photos)) setPhotos(result.photos);
      } catch {
        if (active) setPageError("Photos could not be refreshed. Check your connection and try again.");
      } finally {
        if (active) setIsRefreshing(false);
      }
    }

    void refreshPhotos();

    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        void refreshPhotos();
      }
    }, 60_000);

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden && active) {
        void refreshPhotos();
      }
    };
    window.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [event.id, refreshVersion]);

  function choosePhotos(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    const selected: UploadItem[] = [];
    const problems: string[] = [];
    for (const file of files.slice(0, 8)) {
      if (!resolvePhotoType(file)) {
        problems.push(`${file.name || "A file"} is not a JPEG, PNG, or WebP image.`);
        continue;
      }
      if (file.size === 0) {
        problems.push(`${file.name || "A file"} is empty.`);
        continue;
      }
      if (file.size > 30 * 1024 * 1024) {
        problems.push(`${file.name} is over the 30 MB selection limit.`);
        continue;
      }
      selected.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: createPreviewUrl(file),
        caption: "",
        status: "ready",
        progress: 0,
        error: null,
        retryOnReconnect: false,
      });
    }
    if (files.length > 8) problems.push("Select up to 8 photos per batch.");
    setPageError(problems.length ? problems.join(" ") : null);
    if (selected.length) {
      setItems((current) => [...current, ...selected]);
      for (const item of selected) {
        void saveQueuedUpload({
          id: item.id,
          eventId: event.id,
          file: item.file,
          caption: item.caption,
          queuedAt: new Date().toISOString(),
        }).catch(() => setPageError("This browser could not save the upload queue for offline use."));
      }
    }
    if (cameraInput.current) cameraInput.current.value = "";
    if (galleryInput.current) galleryInput.current.value = "";
  }

  function removeUpload(id: string) {
    void removeQueuedUpload(event.id, id).catch(() => setPageError("The saved offline photo could not be removed."));
    setItems((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) releasePreviewUrl(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function updateCaption(id: string, value: string) {
    let target: UploadItem | undefined;
    setItems((current) => {
      target = current.find((queued) => queued.id === id);
      return patchUpload(current, id, { caption: value });
    });
    const item = target ?? items.find((queued) => queued.id === id);
    if (item) {
      void saveQueuedUpload({
        id: item.id,
        eventId: event.id,
        file: item.file,
        caption: value,
        queuedAt: new Date().toISOString(),
      }).catch(() => setPageError("This browser could not save the photo caption."));
    }
  }

  async function uploadOne(item: UploadItem) {
    if (!navigator.onLine) {
      setItems((current) => patchUpload(current, item.id, {
        status: "failed",
        error: offlineUploadMessage,
        retryOnReconnect: true,
      }));
      return;
    }
    setItems((current) => patchUpload(current, item.id, { status: "compressing", progress: 0, error: null }));
    try {
      const fileType = resolvePhotoType(item.file);
      if (!fileType) throw new Error("Choose a JPEG, PNG, or WebP image.");

      const prepared = await preparePhotoForUpload(item.file, fileType);
      if (prepared.size > maxUploadBytes) {
        throw new Error("This photo is still too large after compression.");
      }

      const photoId = item.id;
      const formData = new FormData();
      formData.set("eventId", event.id);
      formData.set("photoId", photoId);
      formData.set("caption", item.caption ?? "");
      const uploadBlob = prepared.type ? prepared : new Blob([prepared], { type: fileType });
      formData.set("file", uploadBlob, item.file.name || `${photoId}.jpg`);

      setItems((current) => patchUpload(current, item.id, { status: "uploading", progress: 0 }));
      await uploadFormDataWithProgress(formData, (progress) => {
        setItems((current) => patchUpload(current, item.id, { progress }));
      });
    } catch (error) {
      const message = !navigator.onLine
        ? offlineUploadMessage
        : error instanceof Error
          ? error.message
          : "The photo could not be uploaded.";
      setItems((current) => patchUpload(current, item.id, {
        status: "failed",
        error: message,
        retryOnReconnect: !navigator.onLine || /network|connection|timed out|busy/i.test(message),
      }));
      return;
    }

    // Upload succeeded — local cleanup failures must not flip it back to "failed".
    setItems((current) => patchUpload(current, item.id, { status: "complete", progress: 100, error: null }));
    setRefreshVersion((version) => version + 1);
    try {
      await removeQueuedUpload(event.id, item.id);
    } catch {
      // Harmless: a later retry is acknowledged as a duplicate by the server.
    }
  }

  async function uploadPending(reconnectOnly = false) {
    const pending = items.filter((item) =>
      item.status === "ready" || (item.status === "failed" && (!reconnectOnly || item.retryOnReconnect)),
    );
    if (!pending.length || uploadingRef.current) return;
    setPageError(null);
    if (!navigator.onLine) {
      setItems((current) => current.map((item) => pending.some((queued) => queued.id === item.id)
        ? { ...item, status: "failed", error: offlineUploadMessage, retryOnReconnect: true }
        : item));
      return;
    }
    uploadingRef.current = true;
    setIsUploading(true);
    try {
      for (const item of pending) await uploadOne(item);
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
    }
  }

  useEffect(() => {
    reconnectRetry.current = () => { void uploadPending(true); };
  });

  useEffect(() => {
    let active = true;
    const handleOnline = () => {
      setIsOnline(true);
      reconnectRetry.current();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void Promise.resolve().then(() => {
      if (active) setIsOnline(navigator.onLine);
    });
    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const remainingCount = items.filter((item) => item.status !== "complete").length;

  return (
    <main className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Sticky Avant-Garde Header */}
      <header className="sticky top-0 z-40 bg-paper-bright/95 backdrop-blur-md border-b-2 border-charcoal-ink px-6 lg:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link className="flex items-center gap-2.5 font-sans text-xs font-black tracking-widest uppercase hover:text-primary transition-colors" href="/events" aria-label="heyPal! archive directory">
            <span className="w-7 h-7 bg-secondary text-white flex items-center justify-center border border-charcoal-ink shadow-brutal-sm">
              <Camera size={14} strokeWidth={2.5} />
            </span>
            <span>heyPal! <span className="text-primary font-serif italic text-sm">35mm</span></span>
          </Link>
          <div className="hidden sm:inline-flex items-center gap-2 border border-charcoal-ink bg-tertiary-fixed text-charcoal-ink px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-lime opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-electric-lime"></span>
            </span>
            EXHIBITION ACTIVE
          </div>
          {event.isPrivate && (
            <div className="inline-flex items-center gap-1.5 border border-charcoal-ink bg-charcoal-ink text-paper-bright px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-widest shadow-brutal-sm">
              <Lock size={10} />
              <span>PRIVATE GATHERING</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 border border-charcoal-ink bg-paper-bright text-charcoal-ink max-w-[200px] truncate">
            {demoMode ? "DEMO ATTENDEE" : userName}
          </span>
          <ThemeToggle />
          <Link
            href="/events"
            className="hidden md:inline-flex text-[11px] font-bold uppercase tracking-wider text-charcoal-ink hover:text-primary underline underline-offset-4"
          >
            ← Directory
          </Link>
        </div>
      </header>

      {/* Hero Plate */}
      <section className="relative border-b-2 border-charcoal-ink bg-surface-container-low px-6 lg:px-16 py-12 lg:py-16 overflow-hidden">
        {coverImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15 grayscale contrast-125 mix-blend-multiply pointer-events-none"
            style={{ backgroundImage: `url("${coverImageUrl}")` }}
          />
        )}
        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-secondary text-white px-2.5 py-1 border border-charcoal-ink">
              PLATE 01 // ARCHIVE EXPOSURE
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-tertiary-fixed text-charcoal-ink px-2.5 py-1 border border-charcoal-ink">
              [ ISO 400 ]
            </span>
            {event.isPrivate && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-charcoal-ink text-paper-bright px-2.5 py-1 border border-charcoal-ink inline-flex items-center gap-1 shadow-brutal-sm">
                <Lock size={10} /> PRIVATE ALBUM
              </span>
            )}
            <span className="text-[10px] font-serif italic text-primary font-bold">
              Don't be Epal; use heyPal!
            </span>
          </div>

          <h1 id="event-title" className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium italic text-on-surface leading-[1.08] mb-6">
            {event.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono font-bold uppercase tracking-wider text-charcoal-ink mb-4">
            <span className="bg-paper-bright px-3 py-1.5 border border-charcoal-ink shadow-brutal-sm">
              📅 {formatEventDate(event.startsAt, event.endsAt)}
            </span>
            <span className="bg-paper-bright px-3 py-1.5 border border-charcoal-ink shadow-brutal-sm">
              📍 {event.location}
            </span>
          </div>

          {event.description && (
            <p className="text-sm sm:text-base text-on-surface font-normal leading-relaxed max-w-2xl bg-paper-bright/90 p-3.5 border border-charcoal-ink shadow-brutal-sm">
              {event.description}
            </p>
          )}
        </div>

        <div className="absolute right-6 lg:right-12 bottom-6 font-mono text-[10px] font-bold uppercase tracking-widest text-charcoal-ink border border-charcoal-ink px-2.5 py-1 bg-paper-bright shadow-brutal-sm">
          REF // {event.id.slice(0, 8).toUpperCase()}
        </div>
      </section>

      {/* Main Content: Split Studio */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Column: Upload Console (Photographer Field Station) */}
        <section className="lg:col-span-5 flex flex-col gap-6" aria-labelledby="upload-title">
          <div className="border-b-2 border-charcoal-ink pb-4 flex items-baseline justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary mb-1">
                FIELD STATION // CAPTURE
              </p>
              <h2 id="upload-title" className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-ink">
                Submit Raw Negatives
              </h2>
            </div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-on-surface-variant uppercase border border-charcoal-ink px-2 py-0.5 bg-paper-bright">
              Up to 8 batch
            </span>
          </div>

          <input
            ref={cameraInput}
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            onChange={(change) => choosePhotos(change.currentTarget.files)}
            type="file"
          />
          <input
            ref={galleryInput}
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            multiple
            onChange={(change) => choosePhotos(change.currentTarget.files)}
            type="file"
          />

          {/* Action Trigger Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button
              className="min-h-[50px] bg-primary text-white border-2 border-charcoal-ink shadow-brutal font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg transition-all cursor-pointer"
              onClick={() => cameraInput.current?.click()}
              type="button"
            >
              <Camera size={18} strokeWidth={2.4} />
              <span>Capture Shot</span>
            </button>
            <button
              className="min-h-[50px] bg-paper-bright text-charcoal-ink border-2 border-charcoal-ink shadow-brutal font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg transition-all cursor-pointer"
              onClick={() => galleryInput.current?.click()}
              type="button"
            >
              <ImagePlus size={18} strokeWidth={2.4} />
              <span>Select Negatives</span>
            </button>
          </div>

          {!isOnline && (
            <p className="border-2 border-[#111816] bg-[#FFFDEA] p-3 text-xs font-mono font-bold text-[#111816] shadow-[3px_3px_0px_#111816]" role="status">
              ⚠️ Device offline. Selected photos are cached locally and will auto-upload when reconnected.
            </p>
          )}

          {/* Upload Queue / Contact Print Tray */}
          {items.length > 0 && (
            <div className="border-2 border-charcoal-ink bg-paper-bright shadow-brutal-lg">
              <div className="border-b-2 border-charcoal-ink bg-surface-container-low px-4 py-3 flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-charcoal-ink">
                <span>{items.length} {items.length === 1 ? "NEGATIVE" : "NEGATIVES"} QUEUED</span>
                <button
                  className="text-primary hover:underline underline-offset-4 cursor-pointer"
                  onClick={() => setItems((current) => {
                    const unfinished = current.filter((item) => item.status !== "complete");
                    for (const item of unfinished) {
                      URL.revokeObjectURL(item.previewUrl);
                      previewUrls.current.delete(item.previewUrl);
                      void removeQueuedUpload(event.id, item.id).catch(() => {
                        setPageError("Some saved offline photos could not be removed.");
                      });
                    }
                    return current.filter((item) => item.status === "complete");
                  })}
                  type="button"
                >
                  Clear Pending
                </button>
              </div>

              <div className="divide-y divide-charcoal-ink/15">
                {items.map((item, index) => (
                  <article className="p-3.5 flex gap-3.5 items-center" key={item.id}>
                    <div className="w-16 h-16 shrink-0 border border-charcoal-ink bg-surface-container-low overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.previewUrl} alt={`Selected: ${item.file.name}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 bg-charcoal-ink text-paper-bright font-mono text-[8px] px-1 font-bold">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-charcoal-ink truncate" title={item.file.name}>
                          {item.file.name}
                        </span>
                        {item.status === "complete" && (
                          <span className="text-[10px] font-mono font-bold uppercase text-secondary bg-electric-lime/30 px-1.5 py-0.5 border border-secondary flex items-center gap-1 shrink-0">
                            <Check size={12} strokeWidth={3} /> Imprinted
                          </span>
                        )}
                      </div>

                      <label className="block">
                        <span className="sr-only">Caption for {item.file.name}</span>
                        <input
                          disabled={item.status !== "ready" && item.status !== "failed"}
                          maxLength={300}
                          onChange={(change) => updateCaption(item.id, change.currentTarget.value)}
                          placeholder="Add field caption or note…"
                          type="text"
                          value={item.caption}
                          className="w-full text-xs px-2.5 py-1.5 bg-surface text-charcoal-ink border border-charcoal-ink rounded-none focus:outline-none focus:border-primary focus:shadow-brutal-coral"
                        />
                      </label>

                      {(item.status === "compressing" || item.status === "uploading") && (
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-charcoal-ink">
                          <span>{item.status === "compressing" ? "COMPRESSING" : `TRANSFERRING ${item.progress}%`}</span>
                          <progress className="flex-1 h-2 accent-secondary" max={100} value={item.status === "compressing" ? undefined : item.progress} />
                        </div>
                      )}

                      {item.status === "failed" && (
                        <span className="text-[10px] font-mono font-bold text-primary">{item.error}</span>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {item.status === "failed" && (
                        <button
                          className="w-8 h-8 border border-charcoal-ink bg-paper-bright text-charcoal-ink flex items-center justify-center hover:bg-tertiary-fixed cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={isUploading}
                          onClick={() => void uploadOne(item)}
                          type="button"
                          aria-label={`Retry ${item.file.name}`}
                          title="Retry upload"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      {(item.status === "ready" || item.status === "failed" || item.status === "complete") && (
                        <button
                          className="w-8 h-8 border border-charcoal-ink bg-paper-bright text-charcoal-ink flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"
                          onClick={() => removeUpload(item.id)}
                          type="button"
                          aria-label={`Remove ${item.file.name}`}
                          title="Remove photo"
                        >
                          <X size={14} />
                        </button>
                      )}
                      {(item.status === "compressing" || item.status === "uploading") && (
                        <LoaderCircle className="animate-spin text-secondary" size={16} />
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="border-t-2 border-charcoal-ink bg-surface-container-low p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant">
                  Resized on-device for archival fidelity.
                </span>
                <button
                  className="w-full sm:w-auto min-h-[42px] px-6 bg-secondary text-white border-2 border-charcoal-ink shadow-brutal-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                  disabled={remainingCount === 0 || isUploading}
                  onClick={() => void uploadPending()}
                  type="button"
                >
                  {isUploading ? <LoaderCircle className="animate-spin" size={15} /> : <Upload size={15} />}
                  <span>{isUploading ? "Transferring…" : `Upload ${remainingCount} ${remainingCount === 1 ? "Negative" : "Negatives"}`}</span>
                </button>
              </div>
            </div>
          )}

          {pageError && (
            <div className="border-2 border-primary bg-primary/10 p-3.5 text-xs font-mono font-bold text-primary" role="alert">
              {pageError}
            </div>
          )}

          {/* Privacy Protocol Callout */}
          <div className="border border-charcoal-ink bg-paper-bright p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-secondary"></span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-secondary">
                EVENT PROTOCOL
              </span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
              Only authenticated event participants can view and contribute photos. Submissions are reviewed by the organizer before inclusion in the final archive.
            </p>
          </div>
        </section>

        {/* Right Column: Photo Wall (The Exhibition / Contact Sheet) */}
        <section className="lg:col-span-7 flex flex-col gap-6 lg:border-l-2 lg:border-charcoal-ink lg:pl-10" aria-labelledby="photo-wall-title">
          <div className="border-b-2 border-charcoal-ink pb-4 flex items-baseline justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary mb-1">
                CONTACT SHEET // ARCHIVE WALL
              </p>
              <h2 id="photo-wall-title" className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-ink flex items-baseline gap-3">
                Shared Moments
                <span className="text-xs font-mono font-bold bg-tertiary-fixed text-charcoal-ink border border-charcoal-ink px-2 py-0.5">
                  {photos.length} IMPRINTS
                </span>
              </h2>
            </div>
            <button
              aria-label="Refresh event photos"
              className="w-10 h-10 border-2 border-charcoal-ink bg-paper-bright text-charcoal-ink shadow-brutal-sm flex items-center justify-center hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition-all cursor-pointer"
              disabled={isRefreshing}
              onClick={() => {
                setIsRefreshing(true);
                setRefreshVersion((version) => version + 1);
              }}
              title="Refresh exhibition"
              type="button"
            >
              <RefreshCw className={isRefreshing ? "animate-spin text-primary" : "text-charcoal-ink"} size={16} />
            </button>
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" aria-live="polite">
              {photos.map((photo, index) => (
                <article
                  className="group relative border-2 border-charcoal-ink bg-paper-bright shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg transition-all overflow-hidden flex flex-col"
                  key={photo.id}
                >
                  <div className="relative aspect-[4/5] bg-surface-container-low overflow-hidden border-b border-charcoal-ink">
                    {photo.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.imageUrl}
                        alt={photo.caption || `Photo shared at ${event.name}`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-charcoal-ink/40">
                        <Camera size={26} aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-charcoal-ink text-paper-bright font-mono text-[8px] font-bold px-1.5 py-0.5">
                      PLATE #{String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="p-3 bg-paper-bright flex-1 flex flex-col justify-between gap-1.5">
                    {photo.caption ? (
                      <p className="text-xs font-serif italic text-charcoal-ink line-clamp-2">
                        &ldquo;{photo.caption}&rdquo;
                      </p>
                    ) : (
                      <p className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">
                        Untitled Exposure
                      </p>
                    )}
                    <time className="font-mono text-[9px] font-bold uppercase tracking-wider text-on-surface-variant" dateTime={photo.uploadedAt}>
                      {formatUploadTime(photo.uploadedAt)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-charcoal-ink bg-surface-container-low p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 border-2 border-charcoal-ink bg-tertiary-fixed shadow-brutal-sm flex items-center justify-center text-charcoal-ink">
                <Camera size={28} strokeWidth={2.4} />
              </div>
              <div className="space-y-1">
                <p className="font-serif text-xl italic text-charcoal-ink">
                  Negative space awaiting exposure.
                </p>
                <p className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
                  Be the first to imprint a memory into this gathering.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant border-t border-charcoal-ink pt-3">
            <span>● POLLING EVERY 30S</span>
            <span>Don't be Epal; use heyPal!</span>
          </div>
        </section>
      </div>

      {/* Avant-Garde Broadside Footer */}
      <footer className="border-t-2 border-charcoal-ink bg-paper-bright px-6 lg:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs font-bold uppercase tracking-wider">
        <div className="flex items-center gap-3">
          <span className="text-secondary font-black">HEYPAL! // 35MM ARCHIVE</span>
          <span className="text-primary font-serif italic capitalize">Don't be Epal; use heyPal!</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-on-surface-variant">{userName}</span>
          <Link href="/api/auth/signout" className="text-primary underline underline-offset-4 hover:text-primary-dark">
            Sign Out
          </Link>
        </div>
      </footer>
    </main>
  );
}