"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/event-auth";
import { deletePhotoFile } from "@/lib/local-storage";
import {
  deleteEventPhoto,
  getEvent,
  listEventPhotos,
  saveEvent,
  setPhotoStatus,
} from "@/lib/event-repository";
import type { EventStatus } from "@/lib/event-models";

const eventInputSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2, "Enter an event name.").max(120, "Use 120 characters or fewer."),
  description: z.string().trim().max(1000, "Use 1,000 characters or fewer."),
  startsAt: z.string().min(1, "Choose a start date and time."),
  endsAt: z.string().min(1, "Choose an end date and time."),
  location: z.string().trim().min(2, "Enter a location.").max(160, "Use 160 characters or fewer."),
  status: z.enum(["active", "draft", "archived"]),
  coverImageBlobName: z.string().max(500).transform((value) => value || null),
}).superRefine((event, context) => {
  if (!Number.isFinite(Date.parse(event.startsAt))) {
    context.addIssue({ code: "custom", path: ["startsAt"], message: "Enter a valid start date and time." });
  }
  if (!Number.isFinite(Date.parse(event.endsAt))) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "Enter a valid end date and time." });
  }
  if (Date.parse(event.endsAt) < Date.parse(event.startsAt)) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." });
  }
});

export interface SaveEventState {
  error: string | null;
}

export async function saveEventAction(
  _previousState: SaveEventState,
  formData: FormData,
): Promise<SaveEventState> {
  const user = await requireAdmin();
  const parsed = eventInputSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    location: String(formData.get("location") ?? ""),
    status: String(formData.get("status") ?? "draft"),
    coverImageBlobName: String(formData.get("coverImageBlobName") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the event details and try again." };
  }

  const input = parsed.data;
  const existing = input.id ? await getEvent(input.id) : null;
  if (input.id && !existing) {
    return { error: "This event no longer exists. Refresh the page and try again." };
  }

  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID().replaceAll("-", "");
  await saveEvent({
    id,
    name: input.name,
    description: input.description,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    location: input.location,
    status: input.status as EventStatus,
    coverImageBlobName: input.coverImageBlobName,
    createdBy: existing?.createdBy ?? user.name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  revalidatePath("/admin");
  redirect(`/admin/events/${id}`);
}

export async function setPhotoStatusAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const photoId = String(formData.get("photoId") ?? "");
  const status = z.enum(["approved", "flagged"]).safeParse(formData.get("status"));
  if (!eventId || !photoId || !status.success) return;

  const event = await getEvent(eventId);
  if (!event) return;
  await setPhotoStatus(eventId, photoId, status.data);
  revalidatePath(`/admin/events/${eventId}/photos`);
  revalidatePath("/admin");
}

export async function removePhotoAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const photoId = String(formData.get("photoId") ?? "");
  if (!eventId || !photoId) return;

  const event = await getEvent(eventId);
  if (!event) return;
  const photos = await listEventPhotos(eventId);
  const photo = photos.find((item) => item.id === photoId);
  if (!photo) return;

  await deleteEventPhoto(eventId, photoId);
  if (photo.blobUrl) await deletePhotoFile(photo.blobUrl);
  revalidatePath(`/admin/events/${eventId}/photos`);
  revalidatePath("/admin");
}