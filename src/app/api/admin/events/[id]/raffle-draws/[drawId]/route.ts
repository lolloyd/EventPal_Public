import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventAccess } from "@/lib/event-auth";
import { getEvent, updateRaffleDraw } from "@/lib/event-repository";

const dispositionSchema = z.object({
  disposition: z.enum(["kept", "removed", "respun"]),
});

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/events/[id]/raffle-draws/[drawId]">,
) {
  const { id, drawId } = await params;
  try {
    await requireEventAccess(id);
  } catch {
    return NextResponse.json({ error: "Coordinator or organizer access is required." }, { status: 403 });
  }
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const parsed = dispositionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The winner action is invalid." }, { status: 400 });

  const draw = await updateRaffleDraw(id, drawId, parsed.data.disposition);
  if (!draw) return NextResponse.json({ error: "The raffle draw was not found." }, { status: 404 });
  return NextResponse.json({ draw });
}