/**
 * Shared formatting + rich-text helpers for the public event surface.
 *
 * These used to live inline in `pages/public/EventDetail.tsx`. They moved
 * here so the v3 event components (agenda, sponsors, coverage, side
 * events, speaking engagements) can share exactly the same date/time
 * rendering and sanitised rich-text treatment as the page they sit on —
 * without importing from the page and creating a circular dependency.
 */

import { sanitizeHtml, looksLikeHtml } from "@/lib/sanitizeHtml";

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "TBD";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): string {
  if (!start) return "TBD";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "TBD";
  const e = end ? new Date(end) : null;
  const startStr = s.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!e || Number.isNaN(e.getTime()) || s.toDateString() === e.toDateString()) {
    return startStr;
  }
  // Same year/month → "March 4–7, 2026"
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })}–${e.getDate()}, ${s.getFullYear()}`;
  }
  const endStr = e.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}

export function formatTime(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "9:00 AM – 10:30 AM", or just the start when there's no end. */
export function formatTimeRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (!s) return e;
  return e ? `${s} – ${e}` : s;
}

/**
 * Agenda days are stored as a 1-based `dayNumber`, not a real date, so
 * the calendar date is derived from the event's start date. Returns
 * `null` when the event has no usable start date — callers fall back to
 * the bare "Day N" label.
 */
export function dateForDayNumber(
  eventStartDate: string | Date | null | undefined,
  dayNumber: number,
): Date | null {
  if (!eventStartDate) return null;
  const start = new Date(eventStartDate);
  if (Number.isNaN(start.getTime())) return null;
  const d = new Date(start);
  d.setDate(start.getDate() + Math.max(0, (dayNumber || 1) - 1));
  return d;
}

/** "Wed, Mar 4" — the compact day-tab label. */
export function formatDayLabel(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "Sara Al Amiri" → "SA" — for the no-photo avatar fallback. */
export function initialsOf(name: string | null | undefined): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] || "" : "";
  return (first + last).toUpperCase();
}

/**
 * CMS rich-text renderer. Event copy is stored as HTML from the admin
 * editor — rendering it as text showed literal "<p>" tags on the live
 * site. HTML strings go through sanitizeHtml (strips <script>, on*
 * handlers, javascript: URLs) into dangerouslySetInnerHTML; legacy
 * plain-text strings keep their newline formatting.
 */
export function RichText({
  html,
  className = "",
}: {
  html: string | null | undefined;
  className?: string;
}) {
  if (!html) return null;
  if (looksLikeHtml(html)) {
    return (
      <div
        className={`prose prose-neutral dark:prose-invert max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
    );
  }
  return <p className={`whitespace-pre-wrap ${className}`}>{html}</p>;
}
