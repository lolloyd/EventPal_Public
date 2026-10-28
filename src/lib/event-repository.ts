import { getDb } from "@/lib/db";
import { isLocalDemoMode } from "@/lib/event-auth";
import type { EventCoordinatorRecord, EventCreatorRecord, EventMetrics, EventRecord, PhotoRecord, RaffleDrawRecord } from "@/lib/event-models";

interface DemoStore {
  events: EventRecord[];
  photos: PhotoRecord[];
  raffleDraws: RaffleDrawRecord[];
  coordinators: EventCoordinatorRecord[];
  eventCreators: EventCreatorRecord[];
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
      isPhotoWallPublic: true,
      isPrivate: false,
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
      isPrivate: false,
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
      isPrivate: false,
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
  return { events, photos, raffleDraws: [], coordinators: [], eventCreators: [] };
}

function getDemoStore() {
  globalThis.heypalDemoStore ??= createDemoStore();
  globalThis.heypalDemoStore.raffleDraws ??= [];
  globalThis.heypalDemoStore.coordinators ??= [];
  globalThis.heypalDemoStore.eventCreators ??= [];
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
    isPhotoWallPublic: Boolean(row.isPhotoWallPublic),
    isPrivate: Boolean(row.isPrivate),
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
      coverImageBlobName, isPhotoWallPublic, isPrivate, createdBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      startsAt = excluded.startsAt,
      endsAt = excluded.endsAt,
      location = excluded.location,
      status = excluded.status,
      coverImageBlobName = excluded.coverImageBlobName,
      isPhotoWallPublic = excluded.isPhotoWallPublic,
      isPrivate = excluded.isPrivate,
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
    event.isPhotoWallPublic ? 1 : 0,
    event.isPrivate ? 1 : 0,
    event.createdBy,
    event.createdAt,
    event.updatedAt,
  );

  return event;
}

export async function setPhotoWallPublic(id: string, isPublic: boolean): Promise<boolean> {
  if (isLocalDemoMode()) {
    const store = getDemoStore();
    const event = store.events.find((e) => e.id === id);
    if (!event) return false;
    event.isPhotoWallPublic = isPublic;
    event.updatedAt = new Date().toISOString();
    return true;
  }

  const db = getDb();
  const stmt = db.prepare("UPDATE events SET isPhotoWallPublic = ?, updatedAt = ? WHERE id = ?");
  const result = stmt.run(isPublic ? 1 : 0, new Date().toISOString(), id);
  return result.changes > 0;
}

export async function setEventPrivacy(id: string, isPrivate: boolean): Promise<boolean> {
  if (isLocalDemoMode()) {
    const store = getDemoStore();
    const event = store.events.find((e) => e.id === id);
    if (!event) return false;
    event.isPrivate = isPrivate;
    event.updatedAt = new Date().toISOString();
    return true;
  }

  const db = getDb();
  const stmt = db.prepare("UPDATE events SET isPrivate = ?, updatedAt = ? WHERE id = ?");
  const result = stmt.run(isPrivate ? 1 : 0, new Date().toISOString(), id);
  return result.changes > 0;
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

export async function getPhoto(photoId: string): Promise<PhotoRecord | null> {
  if (isLocalDemoMode()) {
    return getDemoStore().photos.find((photo) => photo.id === photoId) ?? null;
  }
  const db = getDb();
  const row = db.prepare("SELECT * FROM photos WHERE id = ?").get(photoId);
  return row ? mapPhotoRow(row) : null;
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

function mapCoordinatorRow(row: Record<string, unknown>): EventCoordinatorRecord {
  return {
    eventId: String(row.eventId),
    email: String(row.email),
    assignedAt: String(row.assignedAt),
    assignedBy: String(row.assignedBy),
  };
}

export async function listEventCoordinators(eventId: string): Promise<EventCoordinatorRecord[]> {
  if (isLocalDemoMode()) {
    return getDemoStore().coordinators
      .filter((item) => item.eventId === eventId)
      .sort((a, b) => a.email.localeCompare(b.email));
  }
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM event_coordinators
    WHERE eventId = ?
    ORDER BY email ASC
  `).all(eventId);
  return rows.map(mapCoordinatorRow);
}

export async function listEventsForCoordinator(email: string): Promise<EventRecord[]> {
  const normalizedEmail = email.trim().toLowerCase();
  if (isLocalDemoMode()) {
    const assignedEventIds = new Set(
      getDemoStore().coordinators
        .filter((item) => item.email.toLowerCase() === normalizedEmail)
        .map((item) => item.eventId)
    );
    const events = getDemoStore().events.filter((item) => assignedEventIds.has(item.id));
    return sortEvents(events);
  }
  const db = getDb();
  const rows = db.prepare(`
    SELECT e.* FROM events e
    INNER JOIN event_coordinators ec ON e.id = ec.eventId
    WHERE LOWER(ec.email) = ?
    ORDER BY e.status ASC, e.startsAt ASC
  `).all(normalizedEmail);
  return sortEvents(rows.map(mapEventRow));
}

export async function isUserCoordinatorForEvent(eventId: string, email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (isLocalDemoMode()) {
    return getDemoStore().coordinators.some(
      (item) => item.eventId === eventId && item.email.toLowerCase() === normalizedEmail
    );
  }
  const db = getDb();
  const row = db.prepare(`
    SELECT 1 FROM event_coordinators
    WHERE eventId = ? AND LOWER(email) = ?
    LIMIT 1
  `).get(eventId, normalizedEmail);
  return Boolean(row);
}

export async function isUserCoordinatorAny(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (isLocalDemoMode()) {
    return getDemoStore().coordinators.some(
      (item) => item.email.toLowerCase() === normalizedEmail
    );
  }
  const db = getDb();
  const row = db.prepare(`
    SELECT 1 FROM event_coordinators
    WHERE LOWER(email) = ?
    LIMIT 1
  `).get(normalizedEmail);
  return Boolean(row);
}

export async function assignEventCoordinator(
  eventId: string,
  email: string,
  assignedBy: string,
): Promise<EventCoordinatorRecord> {
  const normalizedEmail = email.trim().toLowerCase();
  const assignedAt = new Date().toISOString();
  const record: EventCoordinatorRecord = {
    eventId,
    email: normalizedEmail,
    assignedAt,
    assignedBy,
  };

  if (isLocalDemoMode()) {
    const store = getDemoStore();
    const existingIndex = store.coordinators.findIndex(
      (item) => item.eventId === eventId && item.email.toLowerCase() === normalizedEmail
    );
    if (existingIndex >= 0) {
      store.coordinators[existingIndex] = record;
    } else {
      store.coordinators.push(record);
    }
    return record;
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO event_coordinators (eventId, email, assignedAt, assignedBy)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(eventId, email) DO UPDATE SET
      assignedAt = excluded.assignedAt,
      assignedBy = excluded.assignedBy
  `);
  stmt.run(eventId, normalizedEmail, assignedAt, assignedBy);
  return record;
}

export async function removeEventCoordinator(eventId: string, email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (isLocalDemoMode()) {
    const store = getDemoStore();
    const beforeCount = store.coordinators.length;
    store.coordinators = store.coordinators.filter(
      (item) => !(item.eventId === eventId && item.email.toLowerCase() === normalizedEmail)
    );
    return store.coordinators.length < beforeCount;
  }

  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM event_coordinators
    WHERE eventId = ? AND LOWER(email) = ?
  `);
  const result = stmt.run(eventId, normalizedEmail);
  return Number(result.changes) > 0;
}

export async function listEventCreators(): Promise<EventCreatorRecord[]> {
  if (isLocalDemoMode()) {
    const store = getDemoStore();
    return store.eventCreators.map((creator) => {
      const event = store.events.find((e) => e.id === creator.eventId);
      return {
        ...creator,
        eventName: event?.name ?? null,
      };
    });
  }

  const db = getDb();
  const rows = db.prepare(`
    SELECT ec.email, ec.name, ec.eventId, ec.createdAt, e.name as eventName
    FROM event_creators ec
    LEFT JOIN events e ON ec.eventId = e.id
    ORDER BY ec.createdAt DESC
  `).all() as Record<string, unknown>[];

  return rows.map((row) => ({
    email: String(row.email),
    name: row.name ? String(row.name) : null,
    eventId: row.eventId ? String(row.eventId) : null,
    eventName: row.eventName ? String(row.eventName) : null,
    createdAt: String(row.createdAt),
  }));
}

export async function isUserOnCreatorList(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (isLocalDemoMode()) {
    return getDemoStore().eventCreators.some(
      (c) => c.email.toLowerCase() === normalizedEmail
    );
  }

  const db = getDb();
  const row = db.prepare(`
    SELECT 1 FROM event_creators
    WHERE LOWER(email) = ?
    LIMIT 1
  `).get(normalizedEmail);

  return Boolean(row);
}

export async function recordEventCreator(
  email: string,
  name: string | null,
  eventId: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const createdAt = new Date().toISOString();

  if (isLocalDemoMode()) {
    const store = getDemoStore();
    const existingIndex = store.eventCreators.findIndex(
      (c) => c.email.toLowerCase() === normalizedEmail
    );
    const record: EventCreatorRecord = {
      email: normalizedEmail,
      name,
      eventId,
      createdAt,
    };
    if (existingIndex >= 0) {
      store.eventCreators[existingIndex] = record;
    } else {
      store.eventCreators.push(record);
    }
    return;
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO event_creators (email, name, eventId, createdAt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      eventId = excluded.eventId,
      createdAt = excluded.createdAt
  `);
  stmt.run(normalizedEmail, name, eventId, createdAt);
}

export async function removeUserFromCreatorList(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (isLocalDemoMode()) {
    const store = getDemoStore();
    const beforeCount = store.eventCreators.length;
    store.eventCreators = store.eventCreators.filter(
      (c) => c.email.toLowerCase() !== normalizedEmail
    );
    return store.eventCreators.length < beforeCount;
  }

  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM event_creators
    WHERE LOWER(email) = ?
  `);
  const result = stmt.run(normalizedEmail);
  return Number(result.changes) > 0;
}