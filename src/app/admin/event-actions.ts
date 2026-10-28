"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireAuthenticated, requireEventAccess } from "@/lib/event-auth";
import { deletePhotoFile } from "@/lib/local-storage";
import {
  deleteEventPhoto,
  getEvent,
  listEventPhotos,
  saveEvent,
  setPhotoStatus,
  setPhotoWallPublic,
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
  isPhotoWallPublic: z.preprocess((val) => val === "true" || val === "1" || val === "on" || val === true, z.boolean()).optional(),
  isPrivate: z.preprocess((val) => val === "true" || val === "1" || val === "on" || val === true, z.boolean()).optional(),
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
  const rawId = String(formData.get("id") ?? "");
  const isNewEvent = !rawId;
  const auth = rawId
    ? await requireEventAccess(rawId)
    : { user: await requireAuthenticated(), isDefaultAdmin: false, isCoordinator: true };

  const parsed = eventInputSchema.safeParse({
    id: rawId,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    location: String(formData.get("location") ?? ""),
    status: String(formData.get("status") ?? "draft"),
    coverImageBlobName: String(formData.get("coverImageBlobName") ?? ""),
    isPhotoWallPublic: formData.get("isPhotoWallPublic") === "true" || formData.get("isPhotoWallPublic") === "on",
    isPrivate: formData.get("isPrivate") === "true" || formData.get("isPrivate") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the event details and try again." };
  }

  const input = parsed.data;
  const existing = input.id ? await getEvent(input.id) : null;
  if (input.id && !existing) {
    return { error: "This event no longer exists. Refresh the page and try again." };
  }

  if (isNewEvent) {
    const { canUserCreateEvent } = await import("@/lib/event-auth");
    const check = await canUserCreateEvent(auth.user);
    if (!check.allowed) {
      return { error: check.reason ?? "You are not permitted to create a new event at this time." };
    }
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
    isPhotoWallPublic: input.isPhotoWallPublic ?? existing?.isPhotoWallPublic ?? false,
    isPrivate: input.isPrivate ?? existing?.isPrivate ?? false,
    createdBy: existing?.createdBy ?? auth.user.email ?? auth.user.name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  // Automatically assign the logged-in creator as Event Coordinator & record on creator registry
  if (isNewEvent && auth.user.email) {
    const { assignEventCoordinator, recordEventCreator } = await import("@/lib/event-repository");
    await assignEventCoordinator(id, auth.user.email, "System (Event Creator)");
    if (!auth.isDefaultAdmin) {
      await recordEventCreator(auth.user.email, auth.user.name, id);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/creators");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath(`/wall/${id}`);
  revalidatePath("/events");
  redirect(`/admin/events/${id}`);
}

export async function removeCreatorFromListAction(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Missing email address." };

  const { removeUserFromCreatorList } = await import("@/lib/event-repository");
  await removeUserFromCreatorList(email);
  revalidatePath("/admin/creators");
  revalidatePath("/admin");
  revalidatePath("/admin/events/new");
  return { success: true };
}

export async function togglePhotoWallPublicAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return;
  await requireEventAccess(eventId);
  const isPublic = formData.get("isPublic") === "true";

  await setPhotoWallPublic(eventId, isPublic);
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/photo-wall`);
  revalidatePath(`/wall/${eventId}`);
  revalidatePath(`/events/${eventId}/photo-wall`);
}

export async function toggleEventPrivacyAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return;
  await requireEventAccess(eventId);
  const isPrivate = formData.get("isPrivate") === "true";

  const { setEventPrivacy } = await import("@/lib/event-repository");
  await setEventPrivacy(eventId, isPrivate);
  revalidatePath("/admin");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
}

export async function setPhotoStatusAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const photoId = String(formData.get("photoId") ?? "");
  const status = z.enum(["approved", "flagged"]).safeParse(formData.get("status"));
  if (!eventId || !photoId || !status.success) return;
  await requireEventAccess(eventId);

  const event = await getEvent(eventId);
  if (!event) return;
  await setPhotoStatus(eventId, photoId, status.data);
  revalidatePath(`/admin/events/${eventId}/photos`);
  revalidatePath("/admin");
}

export async function removePhotoAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const photoId = String(formData.get("photoId") ?? "");
  if (!eventId || !photoId) return;
  await requireEventAccess(eventId);

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

export async function assignCoordinatorAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!eventId || !email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const auth = await requireEventAccess(eventId);

  const { assignEventCoordinator } = await import("@/lib/event-repository");
  await assignEventCoordinator(eventId, email, auth.user.email || auth.user.name);
  revalidatePath(`/admin/events/${eventId}`);
  return { success: true };
}

export async function removeCoordinatorAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!eventId || !email) return { error: "Missing event or coordinator details." };

  const auth = await requireEventAccess(eventId);

  // Constraint: Users cannot remove themselves from the Event Coordinator list
  const currentEmail = auth.user.email?.trim().toLowerCase();
  if (currentEmail && currentEmail === email) {
    return { error: "You cannot remove yourself from the Event Coordinator list." };
  }

  const { removeEventCoordinator } = await import("@/lib/event-repository");
  await removeEventCoordinator(eventId, email);
  revalidatePath(`/admin/events/${eventId}`);
  return { success: true };
}