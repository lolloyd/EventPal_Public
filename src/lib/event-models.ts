export type PhotoStatus = "approved" | "flagged";
export type EventStatus = "active" | "draft" | "archived";

export interface EventRecord {
  id: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  status: EventStatus;
  coverImageBlobName: string | null;
  isPhotoWallPublic?: boolean;
  isPrivate?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoRecord {
  id: string;
  eventId: string;
  blobUrl: string;
  uploadedBy: string;
  uploadedById?: string;
  uploadedByIsAdmin?: boolean;
  uploadedAt: string;
  caption: string | null;
  status: PhotoStatus;
}

export interface EventMetrics {
  uploads: number;
  participants: number;
}

export type PhotoExportFilter = "all" | "approved";
export type ExportJobStatus = "queued" | "running" | "completed" | "failed";

export interface EventExportJob {
  id: string;
  eventId: string;
  filter: PhotoExportFilter;
  includeManifest: boolean;
  requestedBy: string;
  status: ExportJobStatus;
  createdAt: string;
  updatedAt: string;
  progressPercent: number;
  archiveBlobName: string | null;
  archiveSizeBytes: number | null;
  photoCount: number;
  error: string | null;
}

export type RaffleDrawDisposition = "pending" | "kept" | "removed" | "respun";

export interface RaffleDrawRecord {
  id: string;
  eventId: string;
  participantId: string;
  displayName: string;
  upn: string;
  photoId: string;
  uploadedAt: string;
  drawnAt: string;
  disposition: RaffleDrawDisposition;
}

export interface EventCoordinatorRecord {
  eventId: string;
  email: string;
  assignedAt: string;
  assignedBy: string;
}

export interface EventCreatorRecord {
  email: string;
  name: string | null;
  eventId: string | null;
  eventName?: string | null;
  createdAt: string;
}