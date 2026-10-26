"use client";

import imageCompression from "browser-image-compression";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
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

function uploadFormDataWithProgress(formData: FormData, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let errorMsg = "The photo could not be uploaded. Try again.";
        try {
          const res = JSON.parse(xhr.responseText) as { error?: string };
          if (res.error) errorMsg = res.error;
        } catch {
          // ignore JSON parse error
        }
        reject(new Error(errorMsg));
      }
    };
    xhr.onerror = () => reject(new Error("Network connection interrupted. Try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(formData);
  });
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
  const reconnectRetry = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    void listQueuedUploads(event.id).then((queuedUploads) => {
      if (!active || queuedUploads.length === 0) return;
      const restoredItems: UploadItem[] = queuedUploads.map((upload) => ({
        ...upload,
        previewUrl: URL.createObjectURL(upload.file),
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
        const result = await response.json() as { photos: WallPhoto[] };
        if (active) setPhotos(result.photos);
      } catch {
        if (active) setPageError("Photos could not be refreshed. Check your connection and try again.");
      } finally {
        if (active) setIsRefreshing(false);
      }
    }

    void refreshPhotos();
    const interval = window.setInterval(() => void refreshPhotos(), 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [event.id, refreshVersion]);

  function choosePhotos(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const selected: UploadItem[] = [];
    for (const file of files.slice(0, 8)) {
      if (!allowedTypes.has(file.type)) {
        setPageError("Choose JPEG, PNG, or WebP images.");
        continue;
      }
      if (file.size > 30 * 1024 * 1024) {
        setPageError(`${file.name} is over the 30 MB selection limit.`);
        continue;
      }
      selected.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
        status: "ready",
        progress: 0,
        error: null,
        retryOnReconnect: false,
      });
    }
    if (files.length > 8) setPageError("Select up to 8 photos per batch.");
    if (selected.length) {
      setPageError(null);
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
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function updateCaption(id: string, value: string) {
    setItems((current) => patchUpload(current, id, { caption: value }));
    const item = items.find((queued) => queued.id === id);
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
      const compressed = await imageCompression(item.file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: item.file.type,
      });
      if (compressed.size > 40 * 1024 * 1024) {
        throw new Error("This photo is still too large after compression.");
      }

      const photoId = item.id;
      const formData = new FormData();
      formData.set("eventId", event.id);
      formData.set("photoId", photoId);
      formData.set("caption", item.caption);
      formData.set("file", compressed, item.file.name);

      setItems((current) => patchUpload(current, item.id, { status: "uploading", progress: 0 }));
      await uploadFormDataWithProgress(formData, (progress) => {
        setItems((current) => patchUpload(current, item.id, { progress }));
      });

      await removeQueuedUpload(event.id, item.id);
      setItems((current) => patchUpload(current, item.id, { status: "complete", progress: 100 }));
      setRefreshVersion((version) => version + 1);

    } catch (error) {
      const message = !navigator.onLine
        ? offlineUploadMessage
        : error instanceof Error
          ? error.message
          : "The photo could not be uploaded.";
      setItems((current) => patchUpload(current, item.id, {
        status: "failed",
        error: message,
        retryOnReconnect: !navigator.onLine || /network|connection|fetch/i.test(message),
      }));
    }
  }

  async function uploadPending(reconnectOnly = false) {
    const pending = items.filter((item) =>
      item.status === "ready" || (item.status === "failed" && (!reconnectOnly || item.retryOnReconnect)),
    );
    if (!pending.length || isUploading) return;
    setPageError(null);
    if (!navigator.onLine) {
      setItems((current) => current.map((item) => pending.some((queued) => queued.id === item.id)
        ? { ...item, status: "failed", error: offlineUploadMessage, retryOnReconnect: true }
        : item));
      return;
    }
    setIsUploading(true);
    for (const item of pending) await uploadOne(item);
    setIsUploading(false);
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
    <main className="min-h-screen bg-[#FAF9F3] text-[#111816] font-['Hanken_Grotesk',sans-serif]">
      {/* Sticky Avant-Garde Header */}
      <header className="sticky top-0 z-40 bg-[#FAF9F3]/95 backdrop-blur-md border-b-2 border-[#111816] px-6 lg:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link className="flex items-center gap-2.5 font-['Hanken_Grotesk'] text-xs font-black tracking-widest uppercase hover:text-[#C85038] transition-colors" href="/events" aria-label="heyPal! archive directory">
            <span className="w-7 h-7 bg-[#18372F] text-[#FAF9F3] flex items-center justify-center border border-[#111816] shadow-[2px_2px_0px_#111816]">
              <Camera size={14} strokeWidth={2.5} />
            </span>
            <span>heyPal! <span className="text-[#C85038] font-serif italic text-sm">35mm</span></span>
          </Link>
          <div className="hidden sm:inline-flex items-center gap-2 border border-[#111816] bg-[#FFDEA4] px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-widest text-[#111816]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3E635] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3E635]"></span>
            </span>
            EXHIBITION ACTIVE
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 border border-[#111816] bg-[#FAF9F3] text-[#111816] max-w-[200px] truncate">
            {demoMode ? "DEMO ATTENDEE" : userName}
          </span>
          <ThemeToggle />
          <Link
            href="/events"
            className="hidden md:inline-flex text-[11px] font-bold uppercase tracking-wider text-[#111816] hover:text-[#C85038] underline underline-offset-4"
          >
            ← Directory
          </Link>
        </div>
      </header>

      {/* Hero Plate */}
      <section className="relative border-b-2 border-[#111816] bg-gradient-to-br from-[#FAF9F3] via-[#F3EDE0] to-[#E8DFCE] px-6 lg:px-16 py-12 lg:py-16 overflow-hidden">
        {coverImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15 grayscale contrast-125 mix-blend-multiply pointer-events-none"
            style={{ backgroundImage: `url("${coverImageUrl}")` }}
          />
        )}
        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-[#18372F] text-[#FAF9F3] px-2.5 py-1 border border-[#111816]">
              PLATE 01 // ARCHIVE EXPOSURE
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-[#FFDEA4] text-[#111816] px-2.5 py-1 border border-[#111816]">
              [ ISO 400 ]
            </span>
            <span className="text-[10px] font-serif italic text-[#C85038] font-bold">
              Bawal Epal; use heyPal!
            </span>
          </div>

          <h1 id="event-title" className="font-['Bodoni_Moda',serif] text-4xl sm:text-5xl lg:text-6xl font-medium italic text-[#111816] leading-[1.08] mb-6">
            {event.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono font-bold uppercase tracking-wider text-[#111816] mb-4">
            <span className="bg-[#FAF9F3] px-3 py-1.5 border border-[#111816] shadow-[2px_2px_0px_#111816]">
              📅 {formatEventDate(event.startsAt, event.endsAt)}
            </span>
            <span className="bg-[#FAF9F3] px-3 py-1.5 border border-[#111816] shadow-[2px_2px_0px_#111816]">
              📍 {event.location}
            </span>
          </div>

          {event.description && (
            <p className="text-sm sm:text-base text-[#111816]/85 font-normal leading-relaxed max-w-2xl bg-[#FAF9F3]/75 p-3.5 border border-[#111816] shadow-[2px_2px_0px_#111816]">
              {event.description}
            </p>
          )}
        </div>

        <div className="absolute right-6 lg:right-12 bottom-6 font-mono text-[10px] font-bold uppercase tracking-widest text-[#111816] border border-[#111816] px-2.5 py-1 bg-[#FAF9F3] shadow-[2px_2px_0px_#111816]">
          REF // {event.id.slice(0, 8).toUpperCase()}
        </div>
      </section>

      {/* Main Content: Split Studio */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Column: Upload Console (Photographer Field Station) */}
        <section className="lg:col-span-5 flex flex-col gap-6" aria-labelledby="upload-title">
          <div className="border-b-2 border-[#111816] pb-4 flex items-baseline justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C85038] mb-1">
                FIELD STATION // CAPTURE
              </p>
              <h2 id="upload-title" className="font-['Bodoni_Moda',serif] text-2xl sm:text-3xl font-medium text-[#111816]">
                Submit Raw Negatives
              </h2>
            </div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#111816]/70 uppercase border border-[#111816] px-2 py-0.5 bg-[#FAF9F3]">
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
              className="min-h-[50px] bg-[#C85038] text-[#FAF9F3] border-2 border-[#111816] shadow-[3px_3px_0px_#111816] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#111816] transition-all cursor-pointer"
              onClick={() => cameraInput.current?.click()}
              type="button"
            >
              <Camera size={18} strokeWidth={2.4} />
              <span>Capture Shot</span>
            </button>
            <button
              className="min-h-[50px] bg-[#FAF9F3] text-[#111816] border-2 border-[#111816] shadow-[3px_3px_0px_#111816] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#111816] transition-all cursor-pointer"
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
            <div className="border-2 border-[#111816] bg-[#FFFFFF] shadow-[4px_4px_0px_#111816]">
              <div className="border-b-2 border-[#111816] bg-[#FAF9F3] px-4 py-3 flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider">
                <span>{items.length} {items.length === 1 ? "NEGATIVE" : "NEGATIVES"} QUEUED</span>
                <button
                  className="text-[#C85038] hover:underline underline-offset-4 cursor-pointer"
                  onClick={() => setItems((current) => {
                    const unfinished = current.filter((item) => item.status !== "complete");
                    for (const item of unfinished) {
                      URL.revokeObjectURL(item.previewUrl);
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

              <div className="divide-y divide-[#111816]">
                {items.map((item, index) => (
                  <article className="p-3.5 flex gap-3.5 items-center" key={item.id}>
                    <div className="w-16 h-16 shrink-0 border border-[#111816] bg-[#FAF9F3] overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.previewUrl} alt={`Selected: ${item.file.name}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 bg-[#111816] text-[#FAF9F3] font-mono text-[8px] px-1 font-bold">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[#111816] truncate" title={item.file.name}>
                          {item.file.name}
                        </span>
                        {item.status === "complete" && (
                          <span className="text-[10px] font-mono font-bold uppercase text-[#18372F] bg-[#A3E635]/30 px-1.5 py-0.5 border border-[#18372F] flex items-center gap-1 shrink-0">
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
                          className="w-full text-xs px-2.5 py-1.5 bg-[#FAF9F3] border border-[#111816] rounded-none focus:outline-none focus:border-[#C85038] focus:shadow-[2px_2px_0px_#C85038]"
                        />
                      </label>

                      {(item.status === "compressing" || item.status === "uploading") && (
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-[#111816]">
                          <span>{item.status === "compressing" ? "COMPRESSING" : `TRANSFERRING ${item.progress}%`}</span>
                          <progress className="flex-1 h-2 accent-[#18372F]" max={100} value={item.status === "compressing" ? undefined : item.progress} />
                        </div>
                      )}

                      {item.status === "failed" && (
                        <span className="text-[10px] font-mono font-bold text-[#C85038]">{item.error}</span>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {item.status === "failed" && (
                        <button
                          className="w-8 h-8 border border-[#111816] bg-[#FAF9F3] flex items-center justify-center hover:bg-[#FFDEA4] cursor-pointer"
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
                          className="w-8 h-8 border border-[#111816] bg-[#FAF9F3] flex items-center justify-center hover:bg-[#C85038] hover:text-[#FAF9F3] transition-colors cursor-pointer"
                          onClick={() => removeUpload(item.id)}
                          type="button"
                          aria-label={`Remove ${item.file.name}`}
                          title="Remove photo"
                        >
                          <X size={14} />
                        </button>
                      )}
                      {(item.status === "compressing" || item.status === "uploading") && (
                        <LoaderCircle className="animate-spin text-[#18372F]" size={16} />
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="border-t-2 border-[#111816] bg-[#FAF9F3] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#111816]/70">
                  Resized on-device for archival fidelity.
                </span>
                <button
                  className="w-full sm:w-auto min-h-[42px] px-6 bg-[#18372F] text-[#FAF9F3] border-2 border-[#111816] shadow-[3px_3px_0px_#111816] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#111816] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
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
            <div className="border-2 border-[#C85038] bg-[#C85038]/10 p-3.5 text-xs font-mono font-bold text-[#C85038]" role="alert">
              {pageError}
            </div>
          )}

          {/* Privacy Protocol Callout */}
          <div className="border border-[#111816] bg-[#FAF9F3] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#18372F]"></span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#18372F]">
                EVENT PROTOCOL
              </span>
            </div>
            <p className="text-xs text-[#111816]/80 leading-relaxed font-sans">
              Only authenticated event participants can view and contribute photos. Submissions are reviewed by the organizer before inclusion in the final archive.
            </p>
          </div>
        </section>

        {/* Right Column: Photo Wall (The Exhibition / Contact Sheet) */}
        <section className="lg:col-span-7 flex flex-col gap-6 lg:border-l-2 lg:border-[#111816] lg:pl-10" aria-labelledby="photo-wall-title">
          <div className="border-b-2 border-[#111816] pb-4 flex items-baseline justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C85038] mb-1">
                CONTACT SHEET // ARCHIVE WALL
              </p>
              <h2 id="photo-wall-title" className="font-['Bodoni_Moda',serif] text-2xl sm:text-3xl font-medium text-[#111816] flex items-baseline gap-3">
                Shared Moments
                <span className="text-xs font-mono font-bold bg-[#FFDEA4] text-[#111816] border border-[#111816] px-2 py-0.5">
                  {photos.length} IMPRINTS
                </span>
              </h2>
            </div>
            <button
              aria-label="Refresh event photos"
              className="w-10 h-10 border-2 border-[#111816] bg-[#FAF9F3] shadow-[2px_2px_0px_#111816] flex items-center justify-center hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#111816] transition-all cursor-pointer"
              disabled={isRefreshing}
              onClick={() => {
                setIsRefreshing(true);
                setRefreshVersion((version) => version + 1);
              }}
              title="Refresh exhibition"
              type="button"
            >
              <RefreshCw className={isRefreshing ? "animate-spin text-[#C85038]" : "text-[#111816]"} size={16} />
            </button>
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" aria-live="polite">
              {photos.map((photo, index) => (
                <article
                  className="group relative border-2 border-[#111816] bg-[#FFFFFF] shadow-[3px_3px_0px_#111816] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[5px_5px_0px_#111816] transition-all overflow-hidden flex flex-col"
                  key={photo.id}
                >
                  <div className="relative aspect-[4/5] bg-[#FAF9F3] overflow-hidden border-b border-[#111816]">
                    {photo.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.imageUrl}
                        alt={photo.caption || `Photo shared at ${event.name}`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#111816]/40">
                        <Camera size={26} aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-[#111816] text-[#FAF9F3] font-mono text-[8px] font-bold px-1.5 py-0.5">
                      PLATE #{String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="p-3 bg-[#FAF9F3] flex-1 flex flex-col justify-between gap-1.5">
                    {photo.caption ? (
                      <p className="text-xs font-serif italic text-[#111816] line-clamp-2">
                        &ldquo;{photo.caption}&rdquo;
                      </p>
                    ) : (
                      <p className="text-[11px] font-mono text-[#111816]/40 uppercase tracking-wider">
                        Untitled Exposure
                      </p>
                    )}
                    <time className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#111816]/60" dateTime={photo.uploadedAt}>
                      {formatUploadTime(photo.uploadedAt)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#111816] bg-[#FAF9F3] p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 border-2 border-[#111816] bg-[#FFDEA4] shadow-[3px_3px_0px_#111816] flex items-center justify-center text-[#111816]">
                <Camera size={28} strokeWidth={2.4} />
              </div>
              <div className="space-y-1">
                <p className="font-['Bodoni_Moda',serif] text-xl italic text-[#111816]">
                  Negative space awaiting exposure.
                </p>
                <p className="text-xs font-mono uppercase tracking-wider text-[#111816]/70">
                  Be the first to imprint a memory into this gathering.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-[#111816]/60 border-t border-[#111816] pt-3">
            <span>● POLLING EVERY 30S</span>
            <span>BAWAL EPAL; USE HEYPAL!.</span>
          </div>
        </section>
      </div>

      {/* Avant-Garde Broadside Footer */}
      <footer className="border-t-2 border-[#111816] bg-[#FAF9F3] px-6 lg:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs font-bold uppercase tracking-wider">
        <div className="flex items-center gap-3">
          <span className="text-[#18372F] font-black">HEYPAL! // 35MM ARCHIVE</span>
          <span className="text-[#C85038] font-serif italic capitalize">Bawal Epal; use heyPal!</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#111816]/70">{userName}</span>
          <Link href="/api/auth/signout" className="text-[#C85038] underline underline-offset-4 hover:text-[#B6432D]">
            Sign Out
          </Link>
        </div>
      </footer>
    </main>
  );
}