/**
 * Shared event-page logic: dates, durations, venue/directions, ticket
 * provider resolution and the countdown clock.
 *
 * These used to live inline in `pages/public/EventDetail.tsx`. The v4
 * layout splits that page into full-width section components which all
 * need the same helpers, so they moved here rather than being imported
 * back out of the page (which would be a cycle).
 */

import { useEffect, useState } from "react";

import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";
import { asDate } from "./EventCard";

/** Loose row type — the getBySlug payload is wide and changes often. */
export type EventRow = any;

/** Site container — identical to the events hub and the site header. */
export const CONTAINER = "w-full max-w-[1400px] mx-auto px-6 lg:px-8";

// ----------------------------------------------------------------
// Money
// ----------------------------------------------------------------

export function formatCurrency(cents: number, currency = "USD"): string {
  if (cents === 0) return "Free";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

// ----------------------------------------------------------------
// Clock
// ----------------------------------------------------------------

/** Re-render on an interval so the countdown ticks. */
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdownParts(target: Date, from: number): CountdownParts {
  const ms = Math.max(0, target.getTime() - from);
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1000),
  };
}

/** "Starts in 3d 4h" — the compact label on the mobile CTA bar. */
export function compactCountdown(target: Date | null, from: number): string {
  if (!target) return "";
  const ms = target.getTime() - from;
  if (ms <= 0) return "Happening now";
  const { days, hours, minutes } = countdownParts(target, from);
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m`;
}

/** "Starts in 2 days" / "Starts in 45 minutes" — the UP NEXT card. */
export function relativeStart(target: Date | null, from: number): string | null {
  if (!target) return null;
  const ms = target.getTime() - from;
  if (ms <= 0) return null;
  const { days, hours, minutes } = countdownParts(target, from);
  if (days > 0) return `Starts in ${days} day${days === 1 ? "" : "s"}`;
  if (hours > 0) return `Starts in ${hours} hour${hours === 1 ? "" : "s"}`;
  if (minutes > 0) return `Starts in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  return "Starting now";
}

/** Local midnight, so a 09:00→18:00 two-day event counts as 2 days. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Number of calendar days an event spans — null without a start date. */
export function eventDayCount(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): number | null {
  const s = asDate(start);
  if (!s) return null;
  const e = asDate(end);
  if (!e) return 1;
  const days = Math.round((startOfDay(e) - startOfDay(s)) / 86_400_000) + 1;
  return days <= 1 ? 1 : days;
}

/** "4-day event" / "1-day event" — null when there's no usable date. */
export function durationLabel(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): string | null {
  const days = eventDayCount(start, end);
  if (days == null) return null;
  return `${days}-day event`;
}

// ----------------------------------------------------------------
// Schema helpers
// ----------------------------------------------------------------

export function attendanceModeFor(
  format: string | null,
):
  | "OfflineEventAttendanceMode"
  | "OnlineEventAttendanceMode"
  | "MixedEventAttendanceMode" {
  if (!format) return "OfflineEventAttendanceMode";
  const f = format.toLowerCase();
  if (f.includes("virtual") || f.includes("online")) {
    return "OnlineEventAttendanceMode";
  }
  if (f.includes("hybrid")) return "MixedEventAttendanceMode";
  return "OfflineEventAttendanceMode";
}

// ----------------------------------------------------------------
// Tickets
// ----------------------------------------------------------------

/** Provider classification used by the CTA + "Powered by" label. */
export type ExternalProvider = "eventbrite" | "luma" | "external";

export function isExternalProvider(
  p: string | null | undefined,
): p is ExternalProvider {
  return p === "eventbrite" || p === "luma" || p === "external";
}

export function externalTicketUrlOf(event: EventRow): string {
  return event.externalTicketUrl || event.ticketUrl || event.registrationUrl || "";
}

export function resolveTicketUrl(event: EventRow): string | null {
  const provider = event.ticketProvider || "none";
  if (provider === "none") {
    // Legacy fallback — old events store the URL directly on
    // ticketUrl/registrationUrl without using the new enum.
    return event.ticketUrl || event.registrationUrl || null;
  }
  if (provider === "internal") {
    // Internal Stripe checkout — the Tickets tab holds the tier picker.
    return `#tickets`;
  }
  return event.externalTicketUrl || event.ticketUrl || event.registrationUrl || null;
}

/**
 * Build a handler that:
 *   1. Fires a fire-and-forget analytics ping (`events.trackExternalClick`)
 *   2. Adds UTM params to the outbound URL
 *   3. Opens it in a new tab with noopener/noreferrer
 *
 * Designed for the Eventbrite/Luma/external affiliate flow only — the
 * internal Stripe checkout uses its own dialog handler.
 *
 * NOTE: the mutation is intentionally NOT awaited. Analytics MUST NOT
 * block the user's click — if the network call hangs, the navigation
 * still happens.
 */
export function useExternalTicketClick(
  eventId: number,
  provider: ExternalProvider,
  externalUrl: string,
  eventSlug: string,
) {
  const trackMut = trpc.events.trackExternalClick.useMutation();
  return () => {
    // Fire-and-forget — never block navigation. Swallow client-side
    // errors so a failing analytics call still lets the user reach
    // the ticket page.
    try {
      trackMut.mutate({ eventId, provider });
    } catch {
      /* noop */
    }

    // Build the UTM-tagged URL. Wrap in try/catch in case the admin
    // entered a malformed URL — fall back to opening the raw string.
    let target = externalUrl;
    try {
      const u = new URL(externalUrl);
      u.searchParams.set("utm_source", publication.name.toLowerCase());
      u.searchParams.set("utm_medium", "event");
      u.searchParams.set("utm_campaign", eventSlug);
      target = u.toString();
    } catch {
      // Malformed URL — open the original string anyway so admins
      // notice quickly. Better than silently no-op'ing the CTA.
    }
    window.open(target, "_blank", "noopener,noreferrer");
  };
}

/** Small under-CTA attribution badge so the user knows where they go. */
export function ProviderBadge({
  provider,
  align = "center",
}: {
  provider: ExternalProvider;
  align?: "center" | "left";
}) {
  const label =
    provider === "eventbrite"
      ? "Powered by Eventbrite"
      : provider === "luma"
        ? "Powered by Luma"
        : "Opens on external site";
  const icon = provider === "eventbrite" ? "🎟️" : provider === "luma" ? "📅" : "🔗";
  return (
    <div
      className={`mt-1.5 flex items-center gap-1 text-xs text-muted-foreground ${
        align === "center" ? "justify-center" : ""
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// ----------------------------------------------------------------
// Venue / directions
// ----------------------------------------------------------------

/** Everything we know about where the event physically happens. */
export function venueParts(event: EventRow): string[] {
  return [
    event.venueName || event.venue,
    event.venueAddress || event.address || event.addressLine,
    event.city,
    event.country,
  ]
    .map((p: any) => (p == null ? "" : String(p).trim()))
    .filter(Boolean);
}

/**
 * Directions target, in the order the brief specifies:
 *   1. the admin-entered `venueMapUrl`
 *   2. a Google Maps directions link built from name/address/city/country
 *   3. nothing — the caller must not render the button
 */
export function buildDirectionsUrl(event: EventRow): string | null {
  const map = String(event.venueMapUrl || "").trim();
  if (map) return map;
  const parts = venueParts(event);
  if (parts.length === 0) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    parts.join(", "),
  )}`;
}

/** Only URLs that are already iframe embeds go into an <iframe>. */
export function isEmbeddableMapUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = String(url).toLowerCase();
  if (!u.startsWith("http")) return false;
  return (
    u.includes("/maps/embed") ||
    u.includes("output=embed") ||
    u.includes("maps.google.com/maps?") ||
    u.includes("openstreetmap.org/export/embed")
  );
}

// ----------------------------------------------------------------
// Editorial copy
// ----------------------------------------------------------------

/**
 * Split a headline so its FINAL clause can be coloured, as the design
 * shows. Prefers a real clause boundary (comma / dash / colon); falls
 * back to the last few words. Returns `[head, tail]` where `head` may be
 * empty — never invents or reorders words.
 */
export function splitFinalClause(text: string): [string, string] {
  const clean = String(text || "").trim();
  if (!clean) return ["", ""];

  const m = /^(.*[,;:—–-])\s*([^,;:—–-]+)$/.exec(clean);
  if (m && m[2].trim().split(/\s+/).length >= 2) {
    return [m[1].replace(/\s+$/, ""), m[2].trim()];
  }

  const words = clean.split(/\s+/);
  if (words.length <= 3) return ["", clean];
  const tailLength = words.length >= 8 ? 3 : 2;
  return [
    words.slice(0, words.length - tailLength).join(" "),
    words.slice(words.length - tailLength).join(" "),
  ];
}
