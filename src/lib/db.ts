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

    CREATE INDEX IF NOT EXISTS idx_photos_event_status ON photos(eventId, status);
    CREATE INDEX IF NOT EXISTS idx_photos_event_uploaded ON photos(eventId, uploadedAt);
    CREATE INDEX IF NOT EXISTS idx_raffle_draws_event ON raffle_draws(eventId);
    CREATE INDEX IF NOT EXISTS idx_export_jobs_event ON export_jobs(eventId);
  `);
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
