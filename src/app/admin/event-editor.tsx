"use client";

import { useActionState, useRef, useState } from "react";
import { CloudUpload, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { saveEventAction } from "@/app/admin/event-actions";
import { type Contributor, ContributorTable } from "@/app/admin/contributor-table";
import type { EventRecord } from "@/lib/event-models";

function toInputValue(value: string) {
  return value.slice(0, 16);
}

export function EventEditor({
  event,
  coverImageUrl,
  contributors = [],
}: {
  event: EventRecord | null;
  coverImageUrl: string | null;
  contributors?: Contributor[];
}) {
  const [state, formAction, isPending] = useActionState(saveEventAction, { error: null });
  const [coverBlobName, setCoverBlobName] = useState(event?.coverImageBlobName ?? "");
  const [coverPreview, setCoverPreview] = useState(coverImageUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function uploadCover() {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.set("cover", selectedFile);
      const response = await fetch("/api/admin/events/cover", { method: "POST", body });
      const result = (await response.json()) as { blobName?: string; error?: string };
      if (!response.ok || !result.blobName) {
        throw new Error(result.error ?? "The image could not be uploaded.");
      }
      setCoverBlobName(result.blobName);
      setSelectedFile(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The image could not be uploaded.");
    } finally {
      setIsUploading(false);
    }
  }

  function selectCover(file: File | undefined) {
    if (!file) return;
    setSelectedFile(file);
    setCoverBlobName("");
    setCoverPreview(URL.createObjectURL(file));
    setUploadError(null);
  }

  function removeCover() {
    setSelectedFile(null);
    setCoverBlobName("");
    setCoverPreview(null);
    setUploadError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const dateRangeInvalid =
    event && Date.parse(event.endsAt) < Date.parse(event.startsAt);
  const startsAt = event ? toInputValue(event.startsAt) : "";
  const endsAt = event ? toInputValue(event.endsAt) : "";
  const submitButton = (
    <button className="primary-button" disabled={isPending || isUploading || Boolean(selectedFile)} type="submit">
      {isPending ? "Saving…" : event ? "Save changes" : "Create event"}
    </button>
  );

  return (
    <form action={formAction} className="event-form">
      <input type="hidden" name="id" value={event?.id ?? ""} />
      <input type="hidden" name="coverImageBlobName" value={coverBlobName} />

      <div className="event-form-grid">
        <div className="event-fields">
          <label className="form-field">
            <span>Event name <b aria-hidden="true">*</b></span>
            <input
              autoComplete="off"
              defaultValue={event?.name ?? ""}
              maxLength={120}
              name="name"
              placeholder="e.g. Annual team gathering"
              required
            />
          </label>

          <div className="form-field-row">
            <label className="form-field">
              <span>Starts <b aria-hidden="true">*</b></span>
              <input defaultValue={startsAt} name="startsAt" required type="datetime-local" />
            </label>
            <label className="form-field">
              <span>Ends <b aria-hidden="true">*</b></span>
              <input defaultValue={endsAt} name="endsAt" required type="datetime-local" />
            </label>
          </div>

          <label className="form-field">
            <span>Location <b aria-hidden="true">*</b></span>
            <input
              autoComplete="street-address"
              defaultValue={event?.location ?? ""}
              maxLength={160}
              name="location"
              placeholder="Venue or city"
              required
            />
          </label>

          <label className="form-field">
            <span>Description</span>
            <textarea
              defaultValue={event?.description ?? ""}
              maxLength={1000}
              name="description"
              placeholder="What should attendees know about this event?"
              rows={5}
            />
            <span className="field-hint">Optional · up to 1,000 characters</span>
          </label>

          <label className="form-field form-status-field">
            <span>Status</span>
            <select defaultValue={event?.status ?? "draft"} name="status">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          {event && <div className="event-save-actions">{submitButton}</div>}

          {event && <ContributorTable contributors={contributors} />}
        </div>

        <aside className="cover-panel">
          <div className="cover-panel-heading">
            <span>Event cover</span>
            <span>Optional</span>
          </div>
          <div className={`cover-preview${coverPreview ? " has-cover" : ""}`}>
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="Event cover preview" />
            ) : (
              <div className="cover-placeholder">
                <ImagePlus size={24} aria-hidden="true" />
                <span>A cover image sets the tone</span>
              </div>
            )}
          </div>
          <input
            ref={fileInput}
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(change) => selectCover(change.currentTarget.files?.[0])}
            type="file"
          />
          <div className="cover-controls">
            <button className="secondary-button" onClick={() => fileInput.current?.click()} type="button">
              <ImagePlus size={16} />
              Choose image
            </button>
            {selectedFile && (
              <button className="primary-button" disabled={isUploading} onClick={uploadCover} type="button">
                {isUploading ? <LoaderCircle className="spin-icon" size={16} /> : <CloudUpload size={16} />}
                {isUploading ? "Uploading" : "Upload cover"}
              </button>
            )}
            {(coverPreview || coverBlobName) && !selectedFile && (
              <button className="icon-button danger-icon" onClick={removeCover} type="button" aria-label="Remove cover image">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <p className="field-hint">JPEG, PNG, or WebP · max 5 MB</p>
          {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
        </aside>
      </div>

      {dateRangeInvalid && <p className="form-error" role="alert">The saved end time is before the start time. Update the dates to continue.</p>}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}

      <div className="form-footer">
        <p>Fields marked <b aria-hidden="true">*</b> are required.</p>
        {!event && submitButton}
      </div>
    </form>
  );
}