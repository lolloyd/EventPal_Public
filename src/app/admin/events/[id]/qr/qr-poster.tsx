"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ArrowDownToLine, Check, Copy, Printer } from "lucide-react";
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
}: {
  event: EventRecord;
  attendeeUrl: string;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
    if (!posterRef.current) return;
    setError(null);
    setIsExporting(true);
    try {
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
    }
  }

  return (
    <section className="qr-workspace font-['Hanken_Grotesk',sans-serif]">
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
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            className="px-4 py-2.5 border-2 border-[#111816] bg-[#FAF9F3] shadow-[2px_2px_0px_#111816] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#111816] cursor-pointer transition-all"
            onClick={() => window.print()}
            type="button"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
          <button
            className="px-5 py-2.5 border-2 border-[#111816] bg-[#18372F] text-[#FAF9F3] shadow-[3px_3px_0px_#111816] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#111816] disabled:opacity-50 cursor-pointer transition-all"
            disabled={isExporting}
            onClick={downloadPoster}
            type="button"
          >
            <ArrowDownToLine size={15} />
            <span>{isExporting ? "Exporting…" : "Download 300DPI PNG"}</span>
          </button>
        </div>
      </div>
      {error && <p className="border-2 border-[#C85038] bg-[#C85038]/10 p-3 text-xs font-mono font-bold text-[#C85038] mb-6" role="alert">{error}</p>}

      {/* Poster Stage */}
      <div className="poster-stage flex items-center justify-center p-6 lg:p-12 border-2 border-dashed border-[#111816] bg-[#F3EDE0]">
        <div
          className="qr-poster w-full max-w-[480px] min-h-[680px] bg-[#FAF9F3] border-4 border-[#111816] shadow-[8px_8px_0px_#111816] p-8 flex flex-col justify-between"
          ref={posterRef}
        >
          {/* Topline */}
          <div className="border-b-2 border-[#111816] pb-3.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-[#111816]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#18372F] text-[#FAF9F3] flex items-center justify-center font-black text-[9px] border border-[#111816]">
                HP
              </span>
              <span>HEYPAL! // 35MM ARCHIVE</span>
            </div>
            <span className="bg-[#FFDEA4] px-2 py-0.5 border border-[#111816]">YOU WERE THERE</span>
          </div>

          {/* Body */}
          <div className="my-6 text-center space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C85038]">
                OFFICIAL EVENT ALBUM
              </span>
              <h2 className="font-['Bodoni_Moda',serif] text-3xl sm:text-4xl font-medium italic text-[#111816] leading-tight">
                {event.name}
              </h2>
            </div>

            <div className="flex flex-col items-center gap-1 font-mono text-xs text-[#111816]">
              <span className="font-bold uppercase tracking-wider">{formatEventDate(event.startsAt, event.endsAt)}</span>
              <span className="text-[11px] text-[#111816]/70 uppercase">{event.location}</span>
            </div>

            {/* QR Frame with Camera Reticle accents */}
            <div className="relative inline-block my-2">
              <div className="relative p-4 bg-[#FFFFFF] border-2 border-[#111816] shadow-[4px_4px_0px_#111816]">
                {/* 4 Reticle Corners */}
                <span className="absolute top-1 left-1 font-mono text-[9px] text-[#111816] select-none font-bold">+</span>
                <span className="absolute top-1 right-1 font-mono text-[9px] text-[#111816] select-none font-bold">+</span>
                <span className="absolute bottom-1 left-1 font-mono text-[9px] text-[#111816] select-none font-bold">+</span>
                <span className="absolute bottom-1 right-1 font-mono text-[9px] text-[#111816] select-none font-bold">+</span>
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
              <p className="font-mono text-xs font-black uppercase tracking-widest text-[#18372F]">
                SCAN TO CONTRIBUTE PHOTOS
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#111816]/70">
                Instant Google Sign-In · No App Download Required
              </p>
            </div>
          </div>

          {/* Bottomline */}
          <div className="border-t-2 border-[#111816] pt-3.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-[#111816]">
            <span className="font-serif italic font-normal text-xs text-[#C85038]">Bawal Epal; use heyPal!</span>
            <span>HP—{event.id.slice(0, 6).toUpperCase()}</span>
          </div>
        </div>
      </div>
    </section>
  );
}