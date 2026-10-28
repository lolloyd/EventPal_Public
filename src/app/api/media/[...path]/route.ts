import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { safeResolveStoragePath } from "@/lib/local-storage";
import { requireAuthenticated } from "@/lib/event-auth";

const contentTypeMap: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  if (!pathSegments || pathSegments.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const decodedSegments = pathSegments.map((segment) => decodeURIComponent(segment));
  const subPath = decodedSegments.join("/");

  // Event covers are public assets (visible on attendee pages, public photo walls, and QR codes)
  let isPublicAsset = subPath.startsWith("covers/");
  if (!isPublicAsset && subPath.startsWith("photos/")) {
    const parts = subPath.split("/");
    if (parts.length >= 3) {
      const eventId = parts[1];
      try {
        const { getEvent } = await import("@/lib/event-repository");
        const event = await getEvent(eventId);
        if (event && Boolean(event.isPhotoWallPublic)) {
          isPublicAsset = true;
        }
      } catch (err) {
        console.warn("[heypal] Failed to verify public status for photo media", err);
      }
    }
  }

  if (!isPublicAsset) {
    try {
      await requireAuthenticated();
    } catch {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  let resolvedFilePath: string;
  try {
    resolvedFilePath = safeResolveStoragePath(subPath);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(/*turbopackIgnore: true*/ resolvedFilePath);
    if (!stat.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }

  const ext = path.extname(resolvedFilePath).toLowerCase();
  const contentType = contentTypeMap[ext] || "application/octet-stream";
  const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;

  const cacheHeader = isPublicAsset
    ? "public, max-age=31536000, immutable"
    : "private, max-age=86400, stale-while-revalidate=604800";

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": cacheHeader,
      },
    });
  }

  const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ resolvedFilePath);
  const webStream = Readable.toWeb(fileStream) as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": cacheHeader,
      ETag: etag,
      "Last-Modified": new Date(stat.mtimeMs).toUTCString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
