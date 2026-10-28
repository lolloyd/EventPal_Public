"use client";

import { useActionState, useRef, useState } from "react";
import { CloudUpload, ImagePlus, LoaderCircle, Lock, Trash2, Tv } from "lucide-react";
import { saveEventAction } from "@/app/admin/event-actions";
import { type Contributor, ContributorTable } from "@/app/admin/contributor-table";
import { DateTimePicker } from "@/app/admin/date-time-picker";
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

  const [startsAt, setStartsAt] = useState(event ? toInputValue(event.startsAt) : "");
  const [endsAt, setEndsAt] = useState(event ? toInputValue(event.endsAt) : "");
  const dateRangeInvalid =
    Boolean(startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt));
  const submitButton = (
    <button className="primary-button" disabled={isPending || isUploading || Boolean(selectedFile) || Boolean(dateRangeInvalid)} type="submit">
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
            <div className="form-field">
              <span>Starts <b aria-hidden="true">*</b></span>
              <DateTimePicker
                name="startsAt"
                value={startsAt}
                onChange={setStartsAt}
                required
                placeholder="Select start date & time"
              />
            </div>
            <div className="form-field">
              <span>Ends <b aria-hidden="true">*</b></span>
              <DateTimePicker
                name="endsAt"
                value={endsAt}
                onChange={setEndsAt}
                required
                placeholder="Select end date & time"
                align="right"
              />
            </div>
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

          <label className="form-field">
            <span>Status</span>
            <select defaultValue={event?.status ?? "draft"} name="status">
              <option value="draft">Draft — Preparation stage (only coordinators can view and upload)</option>
              <option value="active">Active — Live event (guests can scan QR code and upload photos)</option>
              <option value="archived">Archived — Event concluded (read-only album preserved)</option>
            </select>
          </label>

          <div className="space-y-2">
            <span className="font-semibold text-xs text-ink">Visibility & Access Options</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {/* Private Event Card */}
              <label className="relative flex items-start gap-3.5 p-3.5 bg-paper-bright border-2 border-charcoal-ink shadow-brutal-sm hover:border-[#c85038] hover:shadow-brutal-coral transition-all cursor-pointer select-none h-full">
                <input
                  type="checkbox"
                  name="isPrivate"
                  defaultChecked={event?.isPrivate ?? false}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-none border-2 border-charcoal-ink accent-[#c85038] cursor-pointer"
                  style={{ width: "16px", height: "16px", minHeight: "16px", padding: 0 }}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs uppercase tracking-wider text-charcoal-ink flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-charcoal-ink" />
                      Private Event
                    </span>
                    <span className="px-1.5 py-0.5 bg-charcoal-ink text-paper-bright text-[9px] font-mono font-bold tracking-wider">
                      UNLISTED
                    </span>
                  </div>
                  <p className="text-[12px] text-on-surface-variant font-normal leading-relaxed">
                    Hidden from &ldquo;Find your album&rdquo;. Accessible only via direct link or QR code.
                  </p>
                </div>
              </label>

              {/* Public Picture Wall Card */}
              <label className="relative flex items-start gap-3.5 p-3.5 bg-paper-bright border-2 border-charcoal-ink shadow-brutal-sm hover:border-[#c85038] hover:shadow-brutal-coral transition-all cursor-pointer select-none h-full">
                <input
                  type="checkbox"
                  name="isPhotoWallPublic"
                  defaultChecked={event?.isPhotoWallPublic ?? false}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-none border-2 border-charcoal-ink accent-[#c85038] cursor-pointer"
                  style={{ width: "16px", height: "16px", minHeight: "16px", padding: 0 }}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs uppercase tracking-wider text-charcoal-ink flex items-center gap-1">
                      <Tv className="w-3.5 h-3.5 text-[#0f3a33]" />
                      Public Picture Wall
                    </span>
                    <span className="px-1.5 py-0.5 bg-[#0f3a33] text-white text-[9px] font-mono font-bold tracking-wider">
                      PROJECTOR
                    </span>
                  </div>
                  <p className="text-[12px] text-on-surface-variant font-normal leading-relaxed">
                    Live projector / smart TV link accessible without signing in.
                  </p>
                </div>
              </label>
            </div>
          </div>

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