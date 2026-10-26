import { getDb } from "@/lib/db";
import { isLocalDemoMode } from "@/lib/event-auth";
import type { EventMetrics, EventRecord, PhotoRecord, RaffleDrawRecord } from "@/lib/event-models";

interface DemoStore {
  events: EventRecord[];
  photos: PhotoRecord[];
  raffleDraws: RaffleDrawRecord[];
}

declare global {
  var heypalDemoStore: DemoStore | undefined;
}

function createDemoStore(): DemoStore {
  const now = new Date();
  const day = (offset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return date;
  };
  const toInput = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  };
  const createdAt = now.toISOString();
  const updatedAt = createdAt;
  const events: EventRecord[] = [
    {
      id: "demo-company-gathering",
      name: "Company Gathering",
      description: "A day to reconnect, share ideas, and celebrate the work we do together.",
      startsAt: toInput(day(8)),
      endsAt: toInput(day(8)),
      location: "The Foundry, Seattle",
      status: "active",
      coverImageBlobName: null,
      createdBy: "lloyd.miguel@gmail.com",
      createdAt,
      updatedAt,
    },
    {
      id: "demo-design-week",
      name: "Design Week",
      description: "Workshops, prototypes, and a showcase of what is next.",
      startsAt: toInput(day(22)),
      endsAt: toInput(day(23)),
      location: "Studio North, Portland",
      status: "draft",
      coverImageBlobName: null,
      createdBy: "lloyd.miguel@gmail.com",
      createdAt,
      updatedAt,
    },
    {
      id: "demo-team-retreat",
      name: "Team Retreat",
      description: "Two days away to think clearly and spend time together.",
      startsAt: toInput(day(-18)),
      endsAt: toInput(day(-17)),
      location: "Cedar Lodge, Bend",
      status: "archived",
      coverImageBlobName: null,
      createdBy: "lloyd.miguel@gmail.com",
      createdAt,
      updatedAt,
    },
  ];
  const photos: PhotoRecord[] = [
    { id: "demo-photo-1", eventId: events[0].id, blobUrl: "", uploadedBy: "alex@heypal.local", uploadedAt: createdAt, caption: null, status: "approved" },
    { id: "demo-photo-2", eventId: events[0].id, blobUrl: "", uploadedBy: "sam@heypal.local", uploadedAt: createdAt, caption: null, status: "approved" },
    { id: "demo-photo-3", eventId: events[0].id, blobUrl: "", uploadedBy: "alex@heypal.local", uploadedAt: createdAt, caption: null, status: "approved" },
    { id: "demo-photo-4", eventId: events[1].id, blobUrl: "", uploadedBy: "sam@heypal.local", uploadedAt: createdAt, caption: null, status: "flagged" },
  ];
  return { events, photos, raffleDraws: [] };
}

function getDemoStore() {
  globalThis.heypalDemoStore ??= createDemoStore();
  globalThis.heypalDemoStore.raffleDraws ??= [];
  return globalThis.heypalDemoStore;
}

function sortEvents(events: EventRecord[]) {
  const statusOrder = { active: 0, draft: 1, archived: 2 };
  return events.sort((left, right) => {
    const statusDifference = statusOrder[left.status] - statusOrder[right.status];
    return statusDifference || Date.parse(left.startsAt) - Date.parse(right.startsAt);
  });
}

function mapEventRow(row: Record<string, unknown>): EventRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    startsAt: String(row.startsAt),
    endsAt: String(row.endsAt),
    location: String(row.location),
    status: row.status as EventRecord["status"],
    coverImageBlobName: row.coverImageBlobName ? String(row.coverImageBlobName) : null,
    createdBy: String(row.createdBy),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapPhotoRow(row: Record<string, unknown>): PhotoRecord {
  return {
    id: String(row.id),
    eventId: String(row.eventId),
    blobUrl: String(row.blobUrl),
    uploadedBy: String(row.uploadedBy),
    uploadedById: row.uploadedById ? String(row.uploadedById) : undefined,
    uploadedByIsAdmin: Boolean(row.uploadedByIsAdmin),
    uploadedAt: String(row.uploadedAt),
    caption: row.caption ? String(row.caption) : null,
    status: row.status as PhotoRecord["status"],
  };
}

function mapRaffleRow(row: Record<string, unknown>): RaffleDrawRecord {
  return {
    id: String(row.id),
    eventId: String(row.eventId),
    participantId: String(row.participantId),
    displayName: String(row.displayName),
    upn: String(row.upn),
    photoId: String(row.photoId),
    uploadedAt: String(row.uploadedAt),
    drawnAt: String(row.drawnAt),
    disposition: row.disposition as RaffleDrawRecord["disposition"],
  };
}

export async function listEvents(): Promise<EventRecord[]> {
  if (isLocalDemoMode()) {
    return sortEvents([...getDemoStore().events]);
  }
  const db = getDb();
  const rows = db.prepare("SELECT * FROM events").all();
  const events = rows.map(mapEventRow);
  return sortEvents(events);
}

export async function getEvent(id: string): Promise<EventRecord | null> {
  if (isLocalDemoMode()) {
    return getDemoStore().events.find((event) => event.id === id) ?? null;
  }
  const db = getDb();
  const row = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
  return row ? mapEventRow(row) : null;
}

export async function saveEvent(event: EventRecord): Promise<EventRecord> {
  if (isLocalDemoMode()) {
    const store = getDemoStore();
    const index = store.events.findIndex((existing) => existing.id === event.id);
    if (index === -1) {
      store.events.push(event);
    } else {
      store.events[index] = event;
    }
    return event;
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO events (
      id, name, description, startsAt, endsAt, location, status,
      coverImageBlobName, createdBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      startsAt = excluded.startsAt,
      endsAt = excluded.endsAt,
      location = excluded.location,
      status = excluded.status,
      coverImageBlobName = excluded.coverImageBlobName,
      createdBy = excluded.createdBy,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt
  `);

  stmt.run(
    event.id,
    event.name,
    event.description,
    event.startsAt,
    event.endsAt,
    event.location,
    event.status,
    event.coverImageBlobName,
    event.createdBy,
    event.createdAt,
    event.updatedAt,
  );

  return event;
}

export async function getEventMetrics(): Promise<Record<string, EventMetrics>> {
  if (isLocalDemoMode()) {
    const photos = getDemoStore().photos;
    const metrics = new Map<string, EventMetrics>();
    const participants = new Map<string, Set<string>>();
    for (const photo of photos) {
      const eventMetrics = metrics.get(photo.eventId) ?? { uploads: 0, participants: 0 };
      eventMetrics.uploads += 1;
      metrics.set(photo.eventId, eventMetrics);
      const eventParticipants = participants.get(photo.eventId) ?? new Set<string>();
      eventParticipants.add(photo.uploadedBy);
      participants.set(photo.eventId, eventParticipants);
    }
    for (const [eventId, eventParticipants] of participants) {
      metrics.get(eventId)!.participants = eventParticipants.size;
    }
    return Object.fromEntries(metrics);
  }

  const db = getDb();
  const rows = db.prepare(`
    SELECT eventId, COUNT(*) as uploads, COUNT(DISTINCT uploadedBy) as participants
    FROM photos
    GROUP BY eventId
  `).all();

  const metrics: Record<string, EventMetrics> = {};
  for (const row of rows) {
    const eventId = String(row.eventId);
    metrics[eventId] = {
      uploads: Number(row.uploads),
      participants: Number(row.participants),
    };
  }
  return metrics;
}

export async function listEventPhotos(eventId: string): Promise<PhotoRecord[]> {
  if (isLocalDemoMode()) {
    return getDemoStore().photos.filter((photo) => photo.eventId === eventId);
  }
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM photos
    WHERE eventId = ?
    ORDER BY uploadedAt DESC
  `).all(eventId);
  return rows.map(mapPhotoRow);
}

export async function listApprovedEventPhotos(eventId: string): Promise<PhotoRecord[]> {
  if (isLocalDemoMode()) {
    const photos = await listEventPhotos(eventId);
    return photos
      .filter((photo) => photo.status === "approved")
      .sort((left, right) => Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt));
  }
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM photos
    WHERE eventId = ? AND status = 'approved'
    ORDER BY uploadedAt DESC
  `).all(eventId);
  return rows.map(mapPhotoRow);
}

export async function savePhoto(photo: PhotoRecord): Promise<PhotoRecord> {
  if (isLocalDemoMode()) {
    const store = getDemoStore();
    const index = store.photos.findIndex((existing) => existing.id === photo.id);
    if (index === -1) store.photos.push(photo);
    else store.photos[index] = photo;
    return photo;
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO photos (
      id, eventId, blobUrl, uploadedBy, uploadedById,
      uploadedByIsAdmin, uploadedAt, caption, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      eventId = excluded.eventId,
      blobUrl = excluded.blobUrl,
      uploadedBy = excluded.uploadedBy,
      uploadedById = excluded.uploadedById,
      uploadedByIsAdmin = excluded.uploadedByIsAdmin,
      uploadedAt = excluded.uploadedAt,
      caption = excluded.caption,
      status = excluded.status
  `);

  stmt.run(
    photo.id,
    photo.eventId,
    photo.blobUrl,
    photo.uploadedBy,
    photo.uploadedById ?? null,
    photo.uploadedByIsAdmin ? 1 : 0,
    photo.uploadedAt,
    photo.caption ?? null,
    photo.status,
  );

  return photo;
}

export async function setPhotoStatus(eventId: string, photoId: string, status: PhotoRecord["status"]): Promise<boolean> {
  if (isLocalDemoMode()) {
    const photo = getDemoStore().photos.find((item) => item.id === photoId && item.eventId === eventId);
    if (!photo) return false;
    photo.status = status;
    return true;
  }

  const db = getDb();
  const stmt = db.prepare(`
    UPDATE photos
    SET status = ?
    WHERE id = ? AND eventId = ?
  `);
  const result = stmt.run(status, photoId, eventId);
  return Number(result.changes) > 0;
}

export async function deleteEventPhoto(eventId: string, photoId: string): Promise<boolean> {
  if (isLocalDemoMode()) {
    const store = getDemoStore();
    const index = store.photos.findIndex((photo) => photo.id === photoId && photo.eventId === eventId);
    if (index === -1) return false;
    store.photos.splice(index, 1);
    return true;
  }

  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM photos
    WHERE id = ? AND eventId = ?
  `);
  const result = stmt.run(photoId, eventId);
  return Number(result.changes) > 0;
}

export async function listRaffleDraws(eventId: string): Promise<RaffleDrawRecord[]> {
  if (isLocalDemoMode()) {
    return getDemoStore().raffleDraws
      .filter((draw) => draw.eventId === eventId)
      .sort((left, right) => right.drawnAt.localeCompare(left.drawnAt));
  }
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM raffle_draws
    WHERE eventId = ?
    ORDER BY drawnAt DESC
  `).all(eventId);
  return rows.map(mapRaffleRow);
}

export async function saveRaffleDraw(draw: RaffleDrawRecord): Promise<RaffleDrawRecord> {
  if (isLocalDemoMode()) {
    getDemoStore().raffleDraws.push(draw);
    return draw;
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO raffle_draws (
      id, eventId, participantId, displayName, upn, photoId, uploadedAt, drawnAt, disposition
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      disposition = excluded.disposition
  `);

  stmt.run(
    draw.id,
    draw.eventId,
    draw.participantId,
    draw.displayName,
    draw.upn,
    draw.photoId,
    draw.uploadedAt,
    draw.drawnAt,
    draw.disposition,
  );

  return draw;
}

export async function updateRaffleDraw(
  eventId: string,
  drawId: string,
  disposition: RaffleDrawRecord["disposition"],
): Promise<RaffleDrawRecord | null> {
  if (isLocalDemoMode()) {
    const draw = getDemoStore().raffleDraws.find((item) => item.id === drawId && item.eventId === eventId);
    if (!draw) return null;
    draw.disposition = disposition;
    return draw;
  }

  const db = getDb();
  const stmt = db.prepare(`
    UPDATE raffle_draws
    SET disposition = ?
    WHERE id = ? AND eventId = ?
  `);
  const result = stmt.run(disposition, drawId, eventId);
  if (Number(result.changes) === 0) return null;

  const row = db.prepare("SELECT * FROM raffle_draws WHERE id = ?").get(drawId);
  return row ? mapRaffleRow(row) : null;
}