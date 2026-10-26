import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "node:stream";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/event-auth";
import { getPhotoExportInfo, openPhotoForExport } from "@/lib/local-storage";
import { createExportJob, enqueueExportJob, updateExportJob } from "@/lib/export-jobs";
import { getEvent, listEventPhotos } from "@/lib/event-repository";
import type { EventExportJob, PhotoExportFilter, PhotoRecord } from "@/lib/event-models";

const syncPhotoLimit = 200;
const syncArchiveSizeLimit = 256 * 1024 * 1024;
const exportRequestSchema = z.object({
  filter: z.enum(["all", "approved"]).default("all"),
  includeManifest: z.boolean().default(true),
});

function selectPhotos(photos: PhotoRecord[], filter: PhotoExportFilter) {
  return filter === "approved" ? photos.filter((photo) => photo.status === "approved") : photos;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
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

function safeArchiveName(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "event";
}

async function getExportSize(photos: PhotoRecord[]) {
  let nextIndex = 0;
  let total = 0;
  const workers = Array.from({ length: Math.min(12, photos.length) }, async () => {
    while (nextIndex < photos.length) {
      const index = nextIndex++;
      const info = await getPhotoExportInfo(photos[index].blobUrl);
      total += info?.size ?? 0;
    }
  });
  await Promise.all(workers);
  return total;
}

async function streamEventArchive(eventName: string, photos: PhotoRecord[], includeManifest: boolean) {
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const output = new PassThrough();
  archive.on("error", (error) => output.destroy(error));
  archive.pipe(output);

  void (async () => {
    for (const [index, photo] of photos.entries()) {
      const source = await openPhotoForExport(photo.blobUrl);
      if (!source) continue;
      const position = String(index + 1).padStart(4, "0");
      const filename = source.filename.replace(/[\\/]/g, "_");
      archive.append(source.stream, { name: `photos/${position}-${filename}` });
    }
    if (includeManifest) {
      archive.append(createManifest(photos), { name: "manifest.csv" });
    }
    await archive.finalize();
  })().catch((error: unknown) => {
    output.destroy(error instanceof Error ? error : new Error("Archive creation failed."));
  });

  const body = Readable.toWeb(output) as ReadableStream;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeArchiveName(eventName)}-photos.zip"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/admin/events/[id]/export">,
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Organizer access is required." }, { status: 403 });
  }

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const query = new URL(request.url).searchParams;
  const filterResult = z.enum(["all", "approved"]).safeParse(query.get("filter") ?? "all");
  if (!filterResult.success) return NextResponse.json({ error: "Choose all or approved photos." }, { status: 400 });

  const photos = selectPhotos(await listEventPhotos(id), filterResult.data);
  const archiveSizeBytes = await getExportSize(photos);
  const contributors = new Set(photos.map((photo) => photo.uploadedBy));
  return NextResponse.json({
    photoCount: photos.length,
    archiveSizeBytes,
    contributorCount: contributors.size,
    filter: filterResult.data,
    mode: photos.length < syncPhotoLimit && archiveSizeBytes <= syncArchiveSizeLimit ? "stream" : "queued",
  });
}

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/events/[id]/export">,
) {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Organizer access is required." }, { status: 403 });
  }

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  let input: z.infer<typeof exportRequestSchema>;
  try {
    input = exportRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "The export options are invalid." }, { status: 400 });
  }

  const photos = selectPhotos(await listEventPhotos(id), input.filter);
  const archiveSizeBytes = await getExportSize(photos);
  if (photos.length < syncPhotoLimit && archiveSizeBytes <= syncArchiveSizeLimit) {
    return streamEventArchive(event.name, photos, input.includeManifest);
  }

  const now = new Date().toISOString();
  const job: EventExportJob = {
    id: crypto.randomUUID(),
    eventId: id,
    filter: input.filter,
    includeManifest: input.includeManifest,
    requestedBy: user.id,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    progressPercent: 0,
    archiveBlobName: null,
    archiveSizeBytes,
    photoCount: photos.length,
    error: null,
  };

  await createExportJob(job);
  try {
    await enqueueExportJob({
      jobId: job.id,
      eventId: id,
      filter: input.filter,
      includeManifest: input.includeManifest,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Large exports are unavailable.";
    await updateExportJob(id, job.id, { status: "failed", error: message });
    return NextResponse.json({ error: message }, { status: 503 });
  }

  return NextResponse.json({ jobId: job.id, status: job.status, photoCount: photos.length, progressPercent: 0 }, { status: 202 });
}