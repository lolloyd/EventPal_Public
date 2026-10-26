import { NextResponse } from "next/server";
import { isLocalDemoMode, requireAuthenticated } from "@/lib/event-auth";
import { getDemoPhotoFile } from "@/lib/demo-photo-storage";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/upload/demo/photos/[photoId]">,
) {
  if (!isLocalDemoMode()) return new Response("Not found", { status: 404 });
  try {
    await requireAuthenticated();
  } catch {
    return NextResponse.json({ error: "Sign in to view this photo." }, { status: 401 });
  }

  const { photoId } = await params;
  const photo = getDemoPhotoFile(photoId);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}