import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/event-auth";
import { getPhotoReadUrl } from "@/lib/local-storage";
import { getEvent, listEventPhotos, listRaffleDraws, saveRaffleDraw } from "@/lib/event-repository";
import { drawRaffleWinner, getRaffleEntries } from "@/lib/raffle-engine";
import type { RaffleDrawRecord } from "@/lib/event-models";

const selectionSchema = z.enum(["first", "latest", "random"]);
const drawSchema = z.object({
  selection: selectionSchema.default("first"),
  excludeOrganizers: z.boolean().default(true),
});

function parseExcludeOrganizers(value: string | null) {
  return value === null || value === "true";
}

// Exclusions come from the persisted draw history so the browser cannot alter the pool.
function removedParticipantIds(draws: RaffleDrawRecord[]) {
  return draws.filter((draw) => draw.disposition === "removed").map((draw) => draw.participantId);
}

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/admin/events/[id]/raffle-entries">,
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
  const selection = selectionSchema.safeParse(query.get("selection") ?? "first");
  if (!selection.success) {
    return NextResponse.json({ error: "Choose first, latest, or random selection." }, { status: 400 });
  }

  const draws = await listRaffleDraws(id);
  const entries = await getRaffleEntries(
    id,
    selection.data,
    parseExcludeOrganizers(query.get("excludeOrganizers")),
    removedParticipantIds(draws),
  );
  const photos = draws.length ? await listEventPhotos(id) : [];
  const photoUrls = new Map(photos.map((photo) => [
    photo.id,
    photo.blobUrl ? getPhotoReadUrl(photo.blobUrl) : null,
  ]));
  const drawsWithPhotos = draws.map((draw) => ({ ...draw, photoUrl: photoUrls.get(draw.photoId) ?? null }));
  return NextResponse.json({ entries, draws: drawsWithPhotos, eligibleCount: entries.length });
}

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/events/[id]/raffle-entries">,
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Organizer access is required." }, { status: 403 });
  }

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  let input: z.infer<typeof drawSchema>;
  try {
    input = drawSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "The raffle options are invalid." }, { status: 400 });
  }

  const entries = await getRaffleEntries(
    id,
    input.selection,
    input.excludeOrganizers,
    removedParticipantIds(await listRaffleDraws(id)),
  );
  const winner = drawRaffleWinner(entries);
  if (!winner) return NextResponse.json({ error: "No eligible participants remain in the pool." }, { status: 409 });
  const draw = {
    id: crypto.randomUUID(),
    eventId: id,
    participantId: winner.participantId,
    displayName: winner.displayName,
    upn: winner.upn,
    photoId: winner.photoId,
    uploadedAt: winner.uploadedAt,
    drawnAt: new Date().toISOString(),
    disposition: "pending" as const,
  };
  await saveRaffleDraw(draw);
  return NextResponse.json({ winner, entries, drawId: draw.id, eligibleCount: entries.length, drawnAt: draw.drawnAt });
}