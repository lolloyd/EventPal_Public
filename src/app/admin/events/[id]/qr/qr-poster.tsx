"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ArrowDownToLine, Check, Copy, Printer, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { EventRecord } from "@/lib/event-models";

function formatEventDate(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" });
  if (start.toDateString() === end.toDateString()) return date.format(start);
  return `${date.format(start)} – ${date.format(end)}`;
}

export function QrPoster({
  event,
  attendeeUrl,
  coverImageUrl,
}: {
  event: EventRecord;
  attendeeUrl: string;
  coverImageUrl?: string | null;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  const qrBadgeRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"poster" | "badge">("poster");

  // Pre-load cover image as a base64 Data URL so html-to-image renders it instantaneously
  // into the PNG canvas without network delay or cross-origin restrictions.
  useEffect(() => {
    if (!coverImageUrl) {
      setCoverDataUrl(null);
      return;
    }
    let isMounted = true;
    fetch(coverImageUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load cover");
        return res.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted && typeof reader.result === "string") {
            setCoverDataUrl(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        // Fall back to direct URL
      });
    return () => {
      isMounted = false;
    };
  }, [coverImageUrl]);

  const effectiveCover = coverDataUrl || coverImageUrl;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(attendeeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Your browser could not copy the link. Select and copy the address instead.");
    }
  }

  async function downloadPoster() {
    setError(null);
    setIsExporting(true);
    const wasBadgeTab = previewTab === "badge";
    if (wasBadgeTab) {
      setPreviewTab("poster");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    try {
      if (!posterRef.current) return;
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#FAF9F3",
      });
      const link = document.createElement("a");
      link.download = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heypal-qr.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("The poster could not be exported. Try printing it from your browser instead.");
    } finally {
      setIsExporting(false);
      if (wasBadgeTab) {
        setPreviewTab("badge");
      }
    }
  }

  async function downloadQrBadge() {
    setError(null);
    setIsExporting(true);
    const wasPosterTab = previewTab === "poster";
    if (wasPosterTab) {
      setPreviewTab("badge");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    try {
      if (!qrBadgeRef.current) return;
      const dataUrl = await toPng(qrBadgeRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#FAF9F3",
      });
      const link = document.createElement("a");
      link.download = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr-badge.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("The QR badge could not be exported.");
    } finally {
      setIsExporting(false);
      if (wasPosterTab) {
        setPreviewTab("poster");
      }
    }
  }

  return (
    <section className="qr-workspace font-['Hanken_Grotesk',sans-serif]">
      {/* ── TOOLBAR ── */}
      <div className="qr-tools border-2 border-[#111816] bg-[#FAF9F3] p-4 lg:p-6 mb-8 shadow-[4px_4px_0px_#111816] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="qr-url-block flex-1 min-w-0">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C85038] block mb-1.5">
            ATTENDEE ACCESS LINK
          </span>
          <div className="flex gap-2">
            <input
              aria-label="Attendee event URL"
              readOnly
              value={attendeeUrl}
              className="flex-1 min-w-0 font-mono text-xs px-3 py-2 bg-[#FFFFFF] border-2 border-[#111816] rounded-none focus:outline-none"
            />
            <button
              className="px-4 py-2 border-2 border-[#111816] bg-[#FAF9F3] shadow-[2px_2px_0px_#111816] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#111816] cursor-pointer transition-all"
              onClick={copyUrl}
              type="button"
            >
              {copied ? <Check size={14} className="text-[#18372F]" /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            className="px-4 py-2.5 border-2 border-[#111816] bg-[#FAF9F3] text-[#111816] shadow-[2px_2px_0px_#111816] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#111816] cursor-pointer transition-all"
            onClick={() => window.print()}
            type="button"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
          <button
            className="qr-badge-btn px-4 py-2.5 border-2 border-[#111816] shadow-[3px_3px_0px_#111816] font-mono text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#111816] disabled:opacity-50 cursor-pointer transition-all"
            disabled={isExporting}
            onClick={downloadQrBadge}
            title="Download standalone square QR badge PNG"
            type="button"
            style={{ backgroundColor: "#dfb155", color: "#000000" }}
          >
            <QrCode size={16} className="shrink-0" style={{ color: "#000000", stroke: "#000000" }} />
            <span style={{ color: "#000000", fontWeight: 800 }}>QR Badge PNG</span>
          </button>
          <button
            className="px-5 py-2.5 border-2 border-[#111816] bg-[#18372F] text-[#FAF9F3] shadow-[3px_3px_0px_#111816] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#111816] hover:bg-[#112822] disabled:opacity-50 cursor-pointer transition-all"
            disabled={isExporting}
            onClick={downloadPoster}
            type="button"
            style={{ color: "#FAF9F3" }}
          >
            <ArrowDownToLine size={15} />
            <span>{isExporting ? "Exporting…" : "Download Full Poster (PNG)"}</span>
          </button>
        </div>
      </div>
      {error && <p className="border-2 border-[#C85038] bg-[#C85038]/10 p-3 text-xs font-mono font-bold text-[#C85038] mb-6" role="alert">{error}</p>}

      {/* ── PREVIEW TAB SWITCHER ── */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setPreviewTab("poster")}
          className={`px-4 py-2 font-mono text-xs font-bold uppercase border-2 border-[#111816] transition-all cursor-pointer ${
            previewTab === "poster"
              ? "bg-[#18372F] text-[#FAF9F3] shadow-[2px_2px_0px_#111816]"
              : "bg-[#FAF9F3] text-[#111816] hover:bg-white"
          }`}
        >
          Full Poster View
        </button>
        <button
          type="button"
          onClick={() => setPreviewTab("badge")}
          className={`px-4 py-2 font-mono text-xs font-extrabold uppercase border-2 border-[#111816] transition-all cursor-pointer ${
            previewTab === "badge"
              ? "bg-[#dfb155] text-black shadow-[2px_2px_0px_#111816]"
              : "bg-[#FAF9F3] text-[#111816] hover:bg-white"
          }`}
          style={previewTab === "badge" ? { backgroundColor: "#dfb155", color: "#000000" } : undefined}
        >
          Square QR Badge View
        </button>
      </div>

      {/* ── STAGE ── */}
      <div className="poster-stage flex items-center justify-center p-6 lg:p-12 border-2 border-dashed border-[#111816] bg-[#F3EDE0] overflow-x-auto">
        {/* Full Poster View */}
        <div
          ref={posterRef}
          className={`qr-poster relative overflow-hidden w-full max-w-[480px] min-h-[680px] bg-[#FAF9F3] border-4 border-[#111816] shadow-[8px_8px_0px_#111816] p-8 flex flex-col justify-between ${
            previewTab === "poster" ? "block" : "hidden"
          }`}
        >
          {/* Cover Photo Background Layer (40% Opacity) */}
          {effectiveCover && (
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                crossOrigin="anonymous"
                className="w-full h-full object-cover select-none"
                src={effectiveCover}
                style={{ opacity: 0.4 }}
              />
              <div className="absolute inset-0 bg-[#FAF9F3]/20 pointer-events-none" />
            </div>
          )}

          {/* Topline */}
          <div className="relative z-10 border-b-2 border-[#111816] pb-3.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-[#111816] bg-[#FAF9F3]/85 backdrop-blur-[2px] px-3 py-1.5 -mx-3 border-2 border-[#111816] shadow-[2px_2px_0px_#111816]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#18372F] text-[#FAF9F3] flex items-center justify-center font-black text-[9px] border border-[#111816]">
                HP
              </span>
              <span>HEYPAL! // 35MM ARCHIVE</span>
            </div>
            <span className="bg-[#FFDEA4] px-2 py-0.5 border border-[#111816]">
              {event.isPrivate ? "PRIVATE INVITATION" : "YOU WERE THERE"}
            </span>
          </div>

          {/* Body */}
          <div className="relative z-10 my-6 text-center space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C85038] bg-[#FAF9F3]/90 px-2.5 py-0.5 inline-block border border-[#111816]/20 shadow-sm">
                {event.isPrivate ? "PRIVATE EVENT ALBUM" : "OFFICIAL EVENT ALBUM"}
              </span>
              <h2 className="font-['Bodoni_Moda',serif] text-3xl sm:text-4xl font-medium italic text-[#111816] leading-tight drop-shadow-sm">
                {event.name}
              </h2>
            </div>

            <div className="flex flex-col items-center gap-1 font-mono text-xs text-[#111816]">
              <span className="font-bold uppercase tracking-wider bg-[#FAF9F3]/90 px-2.5 py-0.5 border border-[#111816]/20 shadow-sm">
                {formatEventDate(event.startsAt, event.endsAt)}
              </span>
              <span className="text-[11px] text-[#111816] font-semibold uppercase bg-[#FAF9F3]/90 px-2.5 py-0.5 border border-[#111816]/20 shadow-sm">
                {event.location}
              </span>
            </div>

            {/* QR Frame with Camera Reticle accents */}
            <div className="relative inline-block my-2 z-10">
              <div className="relative p-5 bg-[#FFFFFF] border-4 border-[#111816] shadow-[5px_5px_0px_#111816]">
                <span className="absolute top-1 left-1.5 font-mono text-[10px] text-[#111816] select-none font-bold">+</span>
                <span className="absolute top-1 right-1.5 font-mono text-[10px] text-[#111816] select-none font-bold">+</span>
                <span className="absolute bottom-1 left-1.5 font-mono text-[10px] text-[#111816] select-none font-bold">+</span>
                <span className="absolute bottom-1 right-1.5 font-mono text-[10px] text-[#111816] select-none font-bold">+</span>
                <QRCodeSVG
                  aria-label={`QR code to ${event.name} event album`}
                  bgColor="#FFFFFF"
                  fgColor="#18372F"
                  level="H"
                  marginSize={1}
                  size={218}
                  value={attendeeUrl}
                />
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <p className="font-mono text-xs font-black uppercase tracking-widest text-[#18372F] bg-[#FAF9F3]/90 px-2.5 py-0.5 inline-block border border-[#111816]/20 shadow-sm">
                SCAN TO CONTRIBUTE PHOTOS
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#111816] font-medium bg-[#FAF9F3]/80 px-2 py-0.5 inline-block border border-[#111816]/10">
                Instant Google Sign-In · No App Download Required
              </p>
            </div>
          </div>

          {/* Bottomline */}
          <div className="relative z-10 border-t-2 border-[#111816] pt-3 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-[#111816] bg-[#FAF9F3]/85 backdrop-blur-[2px] px-3 py-1.5 -mx-3 border-2 border-[#111816] shadow-[2px_2px_0px_#111816]">
            <span className="font-serif italic font-bold text-xs text-[#C85038]">Don't be Epal; use heyPal!</span>
            <span>HP—{event.id.slice(0, 6).toUpperCase()}</span>
          </div>
        </div>

        {/* Square Badge View (Active when previewTab === "badge") */}
        <div className={previewTab === "badge" ? "block" : "hidden"}>
          <div
            ref={qrBadgeRef}
            className="qr-poster bg-[#FAF9F3] border-4 border-[#111816] p-7 flex flex-col items-center justify-between relative overflow-hidden shadow-[8px_8px_0px_#111816]"
            style={{
              width: "520px",
              height: "520px",
              maxWidth: "100%",
              backgroundColor: "#FAF9F3",
              colorScheme: "light",
            }}
          >
            {effectiveCover && (
              <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover select-none"
                  src={effectiveCover}
                  style={{ opacity: 0.35 }}
                />
                <div className="absolute inset-0 bg-[#FAF9F3]/30 pointer-events-none" />
              </div>
            )}
            <div className="relative z-10 w-full flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-widest text-[#111816] bg-[#FAF9F3]/95 px-3 py-1.5 border-2 border-[#111816] shadow-[2px_2px_0px_#111816]">
              <span className="truncate max-w-[320px]">{event.name}</span>
              <span className="text-[#C85038] font-bold">heyPal! 35mm</span>
            </div>
            <div className="relative z-10 my-auto p-4 bg-[#FFFFFF] border-4 border-[#111816] shadow-[6px_6px_0px_#111816]">
              <QRCodeSVG
                aria-label={`QR code to ${event.name} event album`}
                bgColor="#FFFFFF"
                fgColor="#18372F"
                level="H"
                marginSize={1}
                size={260}
                value={attendeeUrl}
              />
            </div>
            <div className="relative z-10 w-full text-center bg-[#FAF9F3]/95 py-2 border-2 border-[#111816] shadow-[2px_2px_0px_#111816]">
              <p className="font-mono text-xs font-black uppercase tracking-wider text-[#18372F]">
                SCAN TO CONTRIBUTE PHOTOS
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}