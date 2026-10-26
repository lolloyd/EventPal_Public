import fs from "node:fs";
import path from "node:path";
import { ZipArchive } from "archiver";
import { getDb } from "@/lib/db";
import { isLocalDemoMode } from "@/lib/event-auth";
import { getStorageRoot, openPhotoForExport, safeResolveStoragePath } from "@/lib/local-storage";
import { listApprovedEventPhotos, listEventPhotos } from "@/lib/event-repository";
import type { EventExportJob, PhotoRecord } from "@/lib/event-models";

export interface ExportQueueMessage {
  jobId: string;
  eventId: string;
  filter: EventExportJob["filter"];
  includeManifest: boolean;
}

declare global {
  var heypalDemoExportJobs: Map<string, EventExportJob> | undefined;
}

function getDemoJobs() {
  globalThis.heypalDemoExportJobs ??= new Map();
  return globalThis.heypalDemoExportJobs;
}

function mapJobRow(row: Record<string, unknown>): EventExportJob {
  return {
    id: String(row.id),
    eventId: String(row.eventId),
    filter: row.filter as EventExportJob["filter"],
    includeManifest: Boolean(row.includeManifest),
    requestedBy: String(row.requestedBy),
    status: row.status as EventExportJob["status"],
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    progressPercent: Number(row.progressPercent),
    archiveBlobName: row.archiveBlobName ? String(row.archiveBlobName) : null,
    archiveSizeBytes: row.archiveSizeBytes !== null ? Number(row.archiveSizeBytes) : null,
    photoCount: Number(row.photoCount),
    error: row.error ? String(row.error) : null,
  };
}

export async function createExportJob(job: EventExportJob): Promise<EventExportJob> {
  if (isLocalDemoMode()) {
    getDemoJobs().set(job.id, job);
    return job;
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO export_jobs (
      id, eventId, filter, includeManifest, requestedBy, status,
      createdAt, updatedAt, progressPercent, archiveBlobName,
      archiveSizeBytes, photoCount, error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    job.id,
    job.eventId,
    job.filter,
    job.includeManifest ? 1 : 0,
    job.requestedBy,
    job.status,
    job.createdAt,
    job.updatedAt,
    job.progressPercent,
    job.archiveBlobName,
    job.archiveSizeBytes,
    job.photoCount,
    job.error,
  );

  return job;
}

export async function getExportJob(eventId: string, jobId: string): Promise<EventExportJob | null> {
  if (isLocalDemoMode()) {
    const job = getDemoJobs().get(jobId);
    return job?.eventId === eventId ? job : null;
  }

  const db = getDb();
  const row = db.prepare("SELECT * FROM export_jobs WHERE id = ? AND eventId = ?").get(jobId, eventId);
  return row ? mapJobRow(row) : null;
}

export async function updateExportJob(
  eventId: string,
  jobId: string,
  changes: Partial<EventExportJob>,
): Promise<EventExportJob> {
  const existing = await getExportJob(eventId, jobId);
  if (!existing) throw new Error("The export job could not be found.");
  const updated: EventExportJob = { ...existing, ...changes, updatedAt: new Date().toISOString() };

  if (isLocalDemoMode()) {
    getDemoJobs().set(jobId, updated);
    return updated;
  }

  const db = getDb();
  const stmt = db.prepare(`
    UPDATE export_jobs SET
      status = ?,
      progressPercent = ?,
      archiveBlobName = ?,
      archiveSizeBytes = ?,
      photoCount = ?,
      error = ?,
      updatedAt = ?
    WHERE id = ? AND eventId = ?
  `);

  stmt.run(
    updated.status,
    updated.progressPercent,
    updated.archiveBlobName,
    updated.archiveSizeBytes,
    updated.photoCount,
    updated.error,
    updated.updatedAt,
    jobId,
    eventId,
  );

  return updated;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function createManifest(photos: PhotoRecord[]) {
  const rows = ["photoId,uploader,uploadedAt,caption,status"];
  for (const photo of photos) {
    rows.push([
      photo.id,
      photo.uploadedBy,
      photo.uploadedAt,
      photo.caption ?? "",
      photo.status,
    ].map(csvCell).join(","));
  }
  return `${rows.join("\r\n")}\r\n`;
}

function archivePhotoFilename(index: number, photo: PhotoRecord, sourceFilename: string) {
  const position = String(index + 1).padStart(4, "0");
  const sanitized = sourceFilename.replace(/[\\/]/g, "_");
  return `photos/${position}-${photo.id}-${sanitized}`;
}

async function processExportInBackground(message: ExportQueueMessage): Promise<void> {
  const { jobId, eventId, filter, includeManifest } = message;

  await updateExportJob(eventId, jobId, {
    status: "running",
    error: null,
    progressPercent: 5,
  });

  try {
    const photos = filter === "approved"
      ? await listApprovedEventPhotos(eventId)
      : await listEventPhotos(eventId);

    const root = getStorageRoot();
    const eventExportsDir = path.join(root, "exports", eventId);
    await fs.promises.mkdir(eventExportsDir, { recursive: true });

    const archiveBlobName = `exports/${eventId}/${jobId}.zip`;
    const archiveFilePath = safeResolveStoragePath(archiveBlobName);

    const outputStream = fs.createWriteStream(/*turbopackIgnore: true*/ archiveFilePath);
    const archive = new ZipArchive({ zlib: { level: 6 } });

    const archivePromise = new Promise<void>((resolve, reject) => {
      outputStream.on("finish", resolve);
      outputStream.on("error", reject);
      archive.on("error", reject);
    });

    archive.pipe(outputStream);

    for (const [index, photo] of photos.entries()) {
      if (!photo.blobUrl) continue;
      const source = await openPhotoForExport(photo.blobUrl);
      if (!source) continue;

      archive.append(source.stream, {
        name: archivePhotoFilename(index, photo, source.filename),
      });

      if ((index + 1) % 10 === 0 || index === photos.length - 1) {
        const percent = Math.min(90, Math.round(((index + 1) / Math.max(photos.length, 1)) * 90));
        await updateExportJob(eventId, jobId, {
          progressPercent: percent,
        });
      }
    }

    if (includeManifest) {
      archive.append(createManifest(photos), { name: "manifest.csv" });
    }

    await updateExportJob(eventId, jobId, { progressPercent: 95 });
    await archive.finalize();
    await archivePromise;

    const stat = await fs.promises.stat(/*turbopackIgnore: true*/ archiveFilePath);

    await updateExportJob(eventId, jobId, {
      status: "completed",
      progressPercent: 100,
      archiveBlobName,
      archiveSizeBytes: stat.size,
      photoCount: photos.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Archive creation failed.";
    await updateExportJob(eventId, jobId, {
      status: "failed",
      error: errorMessage,
    });
  }
}

export async function enqueueExportJob(message: ExportQueueMessage): Promise<void> {
  // Execute non-blocking in-process export job
  void processExportInBackground(message);
}