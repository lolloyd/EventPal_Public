import { NextResponse } from "next/server";
import { requireEventAccess } from "@/lib/event-auth";
import { getArchiveDownloadUrl } from "@/lib/local-storage";
import { getExportJob } from "@/lib/export-jobs";
import { getEvent } from "@/lib/event-repository";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/admin/events/[id]/export/jobs/[jobId]">,
) {
  const { id, jobId } = await params;
  try {
    await requireEventAccess(id);
  } catch {
    return NextResponse.json({ error: "Coordinator or organizer access is required." }, { status: 403 });
  }
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const job = await getExportJob(id, jobId);
  if (!job) return NextResponse.json({ error: "Export job not found." }, { status: 404 });

  return NextResponse.json({
    id: job.id,
    status: job.status,
    progressPercent: job.progressPercent,
    photoCount: job.photoCount,
    archiveSizeBytes: job.archiveSizeBytes,
    error: job.error,
    downloadUrl: job.status === "completed" && job.archiveBlobName
      ? getArchiveDownloadUrl(job.archiveBlobName)
      : null,
  });
}