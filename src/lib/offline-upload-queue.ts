"use client";

import { createStore, del, entries, set } from "idb-keyval";

export interface StoredPhotoUpload {
  id: string;
  eventId: string;
  file: File;
  caption: string;
  queuedAt: string;
}

const uploadStore = createStore("heypal", "offline-uploads");

function keyFor(eventId: string, id: string) {
  return `${eventId}:${id}`;
}

export async function saveQueuedUpload(upload: StoredPhotoUpload) {
  await set(keyFor(upload.eventId, upload.id), upload, uploadStore);
}

export async function removeQueuedUpload(eventId: string, id: string) {
  await del(keyFor(eventId, id), uploadStore);
}

export async function listQueuedUploads(eventId: string) {
  const prefix = `${eventId}:`;
  const storedEntries = await entries<string, StoredPhotoUpload>(uploadStore);
  return storedEntries
    .filter(([key]) => key.startsWith(prefix))
    .map(([, upload]) => upload)
    .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}