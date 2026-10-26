import { randomInt } from "node:crypto";
import { getPhotoReadUrl } from "@/lib/local-storage";
import { listApprovedEventPhotos } from "@/lib/event-repository";
import type { PhotoRecord } from "@/lib/event-models";

export type RaffleSelection = "first" | "latest" | "random";

export interface RaffleEntry {
  participantId: string;
  displayName: string;
  upn: string;
  photoId: string;
  photoUrl: string | null;
  caption: string | null;
  uploadedAt: string;
}

function participantId(photo: PhotoRecord) {
  return photo.uploadedById?.trim() || photo.uploadedBy.trim().toLocaleLowerCase();
}

function displayName(upn: string) {
  const name = upn.split("@")[0].replace(/[._-]+/g, " ").trim();
  return name.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase()) || upn;
}

export async function getRaffleEntries(
  eventId: string,
  selection: RaffleSelection,
  excludeOrganizers: boolean,
  excludedParticipantIds: string[] = [],
) {
  const photos = await listApprovedEventPhotos(eventId);
  const candidates = photos.filter((photo) => !excludeOrganizers || !photo.uploadedByIsAdmin);
  const grouped = new Map<string, PhotoRecord[]>();
  for (const photo of candidates) {
    const id = participantId(photo);
    const submissions = grouped.get(id) ?? [];
    submissions.push(photo);
    grouped.set(id, submissions);
  }

  const excluded = new Set(excludedParticipantIds);
  const entries: RaffleEntry[] = [];
  for (const [id, submissions] of grouped) {
    if (excluded.has(id)) continue;
    submissions.sort((left, right) => Date.parse(left.uploadedAt) - Date.parse(right.uploadedAt));
    const chosen = selection === "first"
      ? submissions[0]
      : selection === "latest"
        ? submissions[submissions.length - 1]
        : submissions[randomInt(submissions.length)];
    entries.push({
      participantId: id,
      displayName: displayName(chosen.uploadedBy),
      upn: chosen.uploadedBy,
      photoId: chosen.id,
      photoUrl: getPhotoReadUrl(chosen.blobUrl),
      caption: chosen.caption,
      uploadedAt: chosen.uploadedAt,
    });
  }

  return entries.sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function drawRaffleWinner(entries: RaffleEntry[]) {
  if (entries.length === 0) return null;
  return entries[randomInt(entries.length)];
}