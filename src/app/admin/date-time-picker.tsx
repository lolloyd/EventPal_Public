"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";

interface DateTimeParts {
  year: number;
  month: number; // 0-11
  day: number;
  hour12: number; // 1-12
  minute: number; // 0-59
  ampm: "AM" | "PM";
}

function parseToParts(val: string): DateTimeParts | null {
  if (!val) return null;
  const match = val.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const h24 = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    const ampm = h24 >= 12 ? "PM" : "AM";
    const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { year, month, day, hour12, minute, ampm };
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const h24 = d.getHours();
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hour12: h24 % 12 === 0 ? 12 : h24 % 12,
    minute: d.getMinutes(),
    ampm: h24 >= 12 ? "PM" : "AM",
  };
}

function formatToInputValue(parts: DateTimeParts): string {
  const y = String(parts.year).padStart(4, "0");
  const m = String(parts.month + 1).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  let h24 = parts.hour12 % 12;
  if (parts.ampm === "PM") h24 += 12;
  const h = String(h24).padStart(2, "0");
  const min = String(parts.minute).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

function formatDisplay(parts: DateTimeParts | null): string {
  if (!parts) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mName = months[parts.month] ?? "Jan";
  const hStr = String(parts.hour12).padStart(2, "0");
  const minStr = String(parts.minute).padStart(2, "0");
  return `${mName} ${parts.day}, ${parts.year} · ${hStr}:${minStr} ${parts.ampm}`;
}

function getNowParts(): DateTimeParts {
  const now = new Date();
  const h24 = now.getHours();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
    hour12: h24 % 12 === 0 ? 12 : h24 % 12,
    minute: now.getMinutes(),
    ampm: h24 >= 12 ? "PM" : "AM",
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface DateTimePickerProps {
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (val: string) => void;
  required?: boolean;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  align?: "left" | "right";
}

export function DateTimePicker({
  name,
  defaultValue = "",
  value: controlledValue,
  onChange,
  required = false,
  id,
  placeholder = "Select date & time",
  disabled = false,
  align = "left",
}: DateTimePickerProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = isControlled ? controlledValue : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Staged parts while the picker modal is open
  const [stagedParts, setStagedParts] = useState<DateTimeParts>(() => {
    return parseToParts(currentValue) ?? getNowParts();
  });

  // Calendar view month & year
  const [viewYear, setViewYear] = useState<number>(() => stagedParts.year);
  const [viewMonth, setViewMonth] = useState<number>(() => stagedParts.month);

  // Sync internal state if defaultValue changes
  useEffect(() => {
    if (!isControlled && defaultValue) {
      setInternalValue(defaultValue);
    }
  }, [defaultValue, isControlled]);

  // When opening picker, initialize staged parts with current value or now
  function handleOpen() {
    if (disabled) return;
    const initial = parseToParts(currentValue) ?? getNowParts();
    setStagedParts(initial);
    setViewYear(initial.year);
    setViewMonth(initial.month);
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  function handleConfirm() {
    const formatted = formatToInputValue(stagedParts);
    if (!isControlled) {
      setInternalValue(formatted);
    }
    onChange?.(formatted);
    setIsOpen(false);
  }

  function handleClear() {
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("");
    setIsOpen(false);
  }

  function handleSetNow() {
    const now = getNowParts();
    setStagedParts(now);
    setViewYear(now.year);
    setViewMonth(now.month);
  }

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  }

  function handleSelectDay(day: number) {
    setStagedParts((prev) => ({
      ...prev,
      year: viewYear,
      month: viewMonth,
      day,
    }));
  }

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "Enter" && !e.shiftKey) {
        // Prevent form submit if enter is pressed inside picker, confirm selection instead
        e.preventDefault();
        handleConfirm();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, stagedParts]);

  // Calendar math
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonthDays = Array.from(
    { length: firstDayOfWeek },
    (_, i) => daysInPrevMonth - firstDayOfWeek + i + 1
  );
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const remainingCells = 42 - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays = Array.from({ length: remainingCells > 7 ? remainingCells - 7 : remainingCells }, (_, i) => i + 1);

  const parsedCurrent = parseToParts(currentValue);
  const displayLabel = formatDisplay(parsedCurrent);

  const today = new Date();
  const isTodayYearMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const todayDate = today.getDate();

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      {/* Hidden input ensuring standard form action FormData serialization */}
      <input
        type="hidden"
        name={name}
        value={currentValue}
        required={required}
        id={id}
      />

      {/* Trigger Button styled like .form-field input */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        className={`w-full flex items-center justify-between text-left min-h-[44px] px-3.5 py-2.5 bg-paper-bright border-2 border-charcoal-ink text-on-surface text-[13px] font-medium transition-colors hover:border-[#c85038] focus:outline-none focus:border-[#c85038] focus:shadow-[2px_2px_0px_#c85038] ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={displayLabel ? "font-semibold text-on-surface" : "text-on-surface-variant opacity-60"}>
          {displayLabel || placeholder}
        </span>
        <div className="flex items-center gap-1.5 ml-2 text-on-surface-variant shrink-0">
          <CalendarIcon className="w-4 h-4" />
          <Clock className="w-4 h-4" />
        </div>
      </button>

      {/* Custom Picker Dialog Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Choose date and time"
          className={`absolute ${
            align === "right" ? "right-0 left-auto" : "left-0 right-auto"
          } top-[calc(100%+6px)] z-50 w-[330px] max-w-[calc(100vw-32px)] bg-paper-bright border-2 border-charcoal-ink shadow-[4px_4px_0px_var(--charcoal-ink)] p-4 text-on-surface text-xs select-none animate-in fade-in zoom-in-95 duration-100`}
          style={{
            backgroundColor: "var(--surface-bright, #ffffff)",
            color: "var(--on-surface, #111827)",
          }}
        >
          {/* Header: Month & Year navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-charcoal-ink/20">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-surface-dim border border-charcoal-ink/30 transition-colors"
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-bold text-sm tracking-wide">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-surface-dim border border-charcoal-ink/30 transition-colors"
              title="Next month"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-on-surface-variant pt-2.5 pb-1">
            {WEEKDAY_NAMES.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center font-medium">
            {/* Previous month padding days */}
            {prevMonthDays.map((d) => (
              <div key={`prev-${d}`} className="py-1.5 text-on-surface-variant/30 text-[11px]">
                {d}
              </div>
            ))}

            {/* Current month days */}
            {currentMonthDays.map((d) => {
              const isSelected =
                stagedParts.year === viewYear &&
                stagedParts.month === viewMonth &&
                stagedParts.day === d;
              const isToday = isTodayYearMonth && todayDate === d;

              return (
                <button
                  key={`cur-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`py-1.5 text-[12px] font-semibold transition-all relative ${
                    isSelected
                      ? "bg-[#c85038] text-white shadow-[1px_1px_0px_#111827]"
                      : isToday
                      ? "border border-[#c85038] text-on-surface font-bold hover:bg-surface-dim"
                      : "hover:bg-surface-dim text-on-surface"
                  }`}
                >
                  {d}
                </button>
              );
            })}

            {/* Next month padding days */}
            {nextMonthDays.map((d) => (
              <div key={`next-${d}`} className="py-1.5 text-on-surface-variant/30 text-[11px]">
                {d}
              </div>
            ))}
          </div>

          {/* Time Picker Section */}
          <div className="mt-3 pt-3 border-t border-charcoal-ink/20">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Time
              </span>

              <div className="flex items-center gap-1.5">
                {/* Hour Selector */}
                <select
                  value={stagedParts.hour12}
                  onChange={(e) =>
                    setStagedParts((prev) => ({ ...prev, hour12: parseInt(e.target.value, 10) }))
                  }
                  className="px-2 py-1 bg-paper-bright border border-charcoal-ink font-semibold text-xs text-on-surface cursor-pointer focus:outline-none focus:border-[#c85038]"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}
                    </option>
                  ))}
                </select>

                <span className="font-bold">:</span>

                {/* Minute Selector */}
                <select
                  value={stagedParts.minute}
                  onChange={(e) =>
                    setStagedParts((prev) => ({ ...prev, minute: parseInt(e.target.value, 10) }))
                  }
                  className="px-2 py-1 bg-paper-bright border border-charcoal-ink font-semibold text-xs text-on-surface cursor-pointer focus:outline-none focus:border-[#c85038]"
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>

                {/* AM / PM Toggle */}
                <div className="flex border border-charcoal-ink ml-1 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setStagedParts((prev) => ({ ...prev, ampm: "AM" }))}
                    className={`px-2 py-1 text-xs font-bold transition-colors ${
                      stagedParts.ampm === "AM"
                        ? "bg-charcoal-ink text-white"
                        : "bg-paper-bright text-on-surface hover:bg-surface-dim"
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setStagedParts((prev) => ({ ...prev, ampm: "PM" }))}
                    className={`px-2 py-1 text-xs font-bold transition-colors ${
                      stagedParts.ampm === "PM"
                        ? "bg-charcoal-ink text-white"
                        : "bg-paper-bright text-on-surface hover:bg-surface-dim"
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="flex items-center justify-between mt-3 pt-2 text-[11px] text-on-surface-variant">
            <button
              type="button"
              onClick={handleSetNow}
              className="font-medium hover:text-[#c85038] hover:underline cursor-pointer"
            >
              Current time (Now)
            </button>
            {!required && (
              <button
                type="button"
                onClick={handleClear}
                className="font-medium hover:text-danger-text hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Footer Action Bar with the requested OK Button */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-charcoal-ink/20">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 text-xs font-semibold border border-charcoal-ink/40 bg-surface-dim hover:bg-surface-dim/80 text-on-surface transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-1.5 text-xs font-bold bg-[#c85038] hover:bg-[#a73823] text-white border-2 border-charcoal-ink shadow-[2px_2px_0px_var(--charcoal-ink)] flex items-center gap-1.5 transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
