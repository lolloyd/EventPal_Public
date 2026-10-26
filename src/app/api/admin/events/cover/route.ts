import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/event-auth";
import { uploadEventCover } from "@/lib/local-storage";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const configuredPublicOrigin = process.env.HEYPAL_PUBLIC_ORIGIN;
  const allowedOrigin = configuredPublicOrigin
    ? new URL(configuredPublicOrigin).origin
    : new URL(request.url).origin;
  if (request.headers.get("origin") !== allowedOrigin) {
    return NextResponse.json({ error: "This upload request is not allowed." }, { status: 403 });
  }

  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Organizer access is required." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }

  const file = formData.get("cover");
  if (!(file instanceof File) || !allowedTypes.has(file.type)) {
    return NextResponse.json(
      { error: "Choose a JPEG, PNG, or WebP image." },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "The image must be smaller than 5 MB." }, { status: 400 });
  }

  try {
    const blobName = await uploadEventCover(file);
    return NextResponse.json({ blobName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The image could not be uploaded.";
    const status = message.startsWith("Choose a valid")
      ? 400
      : message.startsWith("Set HEYPAL_")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}