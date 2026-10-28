import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getStorageRoot } from "@/lib/local-storage";

declare global {
  var heypalDatabase: DatabaseSync | undefined;
}

export function getDbPath(): string {
  if (process.env.HEYPAL_DB_PATH) {
    return path.resolve(process.env.HEYPAL_DB_PATH);
  }
  return path.join(getStorageRoot(), "database", "heypal.db");
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      startsAt TEXT NOT NULL,
      endsAt TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL,
      coverImageBlobName TEXT,
      isPhotoWallPublic INTEGER NOT NULL DEFAULT 0,
      isPrivate INTEGER NOT NULL DEFAULT 0,
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      blobUrl TEXT NOT NULL,
      uploadedBy TEXT NOT NULL,
      uploadedById TEXT,
      uploadedByIsAdmin INTEGER NOT NULL DEFAULT 0,
      uploadedAt TEXT NOT NULL,
      caption TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS raffle_draws (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      participantId TEXT NOT NULL,
      displayName TEXT NOT NULL,
      upn TEXT NOT NULL,
      photoId TEXT NOT NULL,
      uploadedAt TEXT NOT NULL,
      drawnAt TEXT NOT NULL,
      disposition TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS export_jobs (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      filter TEXT NOT NULL,
      includeManifest INTEGER NOT NULL DEFAULT 1,
      requestedBy TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      progressPercent INTEGER NOT NULL DEFAULT 0,
      archiveBlobName TEXT,
      archiveSizeBytes INTEGER,
      photoCount INTEGER NOT NULL DEFAULT 0,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS event_coordinators (
      eventId TEXT NOT NULL,
      email TEXT NOT NULL,
      assignedAt TEXT NOT NULL,
      assignedBy TEXT NOT NULL,
      PRIMARY KEY (eventId, email),
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS event_creators (
      email TEXT PRIMARY KEY,
      name TEXT,
      eventId TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_photos_event_status ON photos(eventId, status);
    CREATE INDEX IF NOT EXISTS idx_photos_event_uploaded ON photos(eventId, uploadedAt);
    CREATE INDEX IF NOT EXISTS idx_raffle_draws_event ON raffle_draws(eventId);
    CREATE INDEX IF NOT EXISTS idx_export_jobs_event ON export_jobs(eventId);
    CREATE INDEX IF NOT EXISTS idx_coordinators_email ON event_coordinators(email);
    CREATE INDEX IF NOT EXISTS idx_coordinators_event ON event_coordinators(eventId);
    CREATE INDEX IF NOT EXISTS idx_event_creators_email ON event_creators(email);
  `);

  try {
    db.exec("ALTER TABLE events ADD COLUMN isPhotoWallPublic INTEGER NOT NULL DEFAULT 0;");
  } catch {}
  try {
    db.exec("ALTER TABLE events ADD COLUMN isPrivate INTEGER NOT NULL DEFAULT 0;");
  } catch {}
}

export function getDb(): DatabaseSync {
  if (globalThis.heypalDatabase) {
    return globalThis.heypalDatabase;
  }

  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  initSchema(db);

  globalThis.heypalDatabase = db;
  return db;
}
