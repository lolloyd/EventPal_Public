"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, Check, FileSpreadsheet, LoaderCircle } from "lucide-react";
import type { PhotoExportFilter } from "@/lib/event-models";

interface ExportSummary {
  photoCount: number;
  archiveSizeBytes: number;
  contributorCount: number;
  mode: "stream" | "queued";
}

interface ExportJobStatus {
  status: "queued" | "running" | "completed" | "failed";
  progressPercent: number;
  photoCount: number;
  archiveSizeBytes: number | null;
  downloadUrl: string | null;
  error: string | null;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 bytes";
  const units = ["bytes", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function ExportDashboard({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [filter, setFilter] = useState<PhotoExportFilter>("all");
  const [summaryVersion, setSummaryVersion] = useState(0);
  const [includeManifest, setIncludeManifest] = useState(true);
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [bytesDownloaded, setBytesDownloaded] = useState(0);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      let response: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/export?filter=${filter}`, { cache: "no-store" });
        if (response.status !== 403 || attempt === 2) break;
        await new Promise((resolve) => window.setTimeout(resolve, 200 * (attempt + 1)));
      }
      if (!response) throw new Error("Export summary could not be loaded.");

      const result = await response.json() as ExportSummary & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Export summary could not be loaded.");
      return result;
    }

    loadSummary()
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Export summary could not be loaded.");
      })
      .finally(() => {
        if (active) setIsLoadingSummary(false);
      });
    return () => {
      active = false;
    };
  }, [eventId, filter, summaryVersion]);

  async function pollQueuedJob(jobId: string) {
    setStage("Queued for packaging");
    for (let attempt = 0; attempt < 300; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
      const response = await fetch(
        `/api/admin/events/${encodeURIComponent(eventId)}/export/jobs/${encodeURIComponent(jobId)}`,
        { cache: "no-store" },
      );
      const job = await response.json() as ExportJobStatus & { error?: string };
      if (!response.ok) throw new Error(job.error ?? "Export status could not be read.");
      setProgress(job.progressPercent);
      setStage(job.status === "queued" ? "Waiting for a worker" : "Packaging archive");
      if (job.status === "failed") throw new Error(job.error ?? "The archive could not be created.");
      if (job.status === "completed" && job.downloadUrl) {
        const link = document.createElement("a");
        link.href = job.downloadUrl;
        link.download = `${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-photos.zip`;
        link.click();
        setProgress(100);
        setStage("Archive ready");
        setNotice(`Archive created (${formatBytes(job.archiveSizeBytes ?? 0)}). Download started.`);
        return;
      }
    }
    throw new Error("The archive is taking longer than expected. Check back shortly.");
  }

  async function exportPhotos() {
    if (isExporting) return;
    setIsExporting(true);
    setError(null);
    setNotice(null);
    setProgress(null);
    setBytesDownloaded(0);
    setStage("Preparing export");
    try {
      const response = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter, includeManifest }),
      });

      if (response.status === 202) {
        const job = await response.json() as { jobId: string; error?: string };
        if (!job.jobId) throw new Error(job.error ?? "The export job could not be queued.");
        await pollQueuedJob(job.jobId);
        return;
      }

      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "The export could not be created.");
      }

      setStage("Streaming archive");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("The browser could not read the archive stream.");
      const totalBytes = Number(response.headers.get("content-length")) || 0;
      const chunks: ArrayBuffer[] = [];
      let loadedBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new ArrayBuffer(value.byteLength);
        new Uint8Array(chunk).set(value);
        chunks.push(chunk);
        loadedBytes += value.byteLength;
        setBytesDownloaded(loadedBytes);
        if (totalBytes > 0) setProgress(Math.min(99, Math.round((loadedBytes / totalBytes) * 100)));
      }

      const blob = new Blob(chunks, { type: "application/zip" });
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1]
        ?? `${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-photos.zip`;
      saveBlob(blob, filename);
      setProgress(100);
      setStage("Export complete");
      setNotice(`Downloaded ${formatBytes(loadedBytes)} of archive data.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The export could not be completed.");
      setStage(null);
    } finally {
      setIsExporting(false);
      setIsLoadingSummary(true);
      setSummaryVersion((version) => version + 1);
      fetch(`/api/admin/events/${encodeURIComponent(eventId)}/export?filter=${filter}`, { cache: "no-store" })
        .then((response) => response.json())
        .then((result: ExportSummary) => setSummary(result))
        .catch(() => {})
        .finally(() => setIsLoadingSummary(false));
    }
  }

  return (
    <section className="export-dashboard" aria-label="Event photo export">
      <div className="export-controls">
        <div className="export-filter-block">
          <span className="export-label">INCLUDE PHOTOS</span>
          <div className="event-filters" role="group" aria-label="Choose export photo status">
            {([
              ["all", "All photos"],
              ["approved", "Approved only"],
            ] as const).map(([value, label]) => (
              <button
                aria-pressed={filter === value}
                className={`filter-button${filter === value ? " is-selected" : ""}`}
                key={value}
                onClick={() => {
                  setIsLoadingSummary(true);
                  setSummary(null);
                  setError(null);
                  setFilter(value);
                  setSummaryVersion((version) => version + 1);
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="export-manifest-option">
          <input checked={includeManifest} onChange={(change) => setIncludeManifest(change.currentTarget.checked)} type="checkbox" />
          <FileSpreadsheet size={17} aria-hidden="true" />
          <span>Include manifest CSV</span>
        </label>
      </div>

      <div className="export-metrics" aria-live="polite">
        <div><span className="export-label">PHOTOS</span><strong>{isLoadingSummary ? "…" : summary?.photoCount ?? "—"}</strong></div>
        <div><span className="export-label">UNCOMPRESSED SIZE</span><strong>{isLoadingSummary ? "…" : formatBytes(summary?.archiveSizeBytes ?? 0)}</strong></div>
        <div><span className="export-label">CONTRIBUTORS</span><strong>{isLoadingSummary ? "…" : summary?.contributorCount ?? "—"}</strong></div>
      </div>

      <div className="export-action-row">
        <div className="export-action-copy">
          <span>{summary?.mode === "queued" ? "Large archive • packaged in the background" : "Secure archive • generated for this export"}</span>
          <span>Only organizers can create or download this archive.</span>
        </div>
        <button className="primary-button" disabled={isExporting || isLoadingSummary || !summary?.photoCount} onClick={exportPhotos} type="button">
          {isExporting ? <LoaderCircle className="spin-icon" size={16} /> : <ArrowDownToLine size={16} />}
          {isExporting ? stage ?? "Preparing" : "Download ZIP"}
        </button>
      </div>

      {isExporting && (
        <div className="export-progress" role="status">
          <div className="export-progress-label"><span>{stage}</span>{progress !== null && <span>{progress}%</span>}</div>
          <progress max={100} value={progress ?? undefined} />
          {bytesDownloaded > 0 && <span className="export-progress-detail">{formatBytes(bytesDownloaded)} streamed</span>}
        </div>
      )}
      {error && <p className="form-error export-message" role="alert">{error}</p>}
      {notice && <p className="export-notice" role="status"><Check size={15} />{notice}</p>}
    </section>
  );
}