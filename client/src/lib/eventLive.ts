/**
 * Client-side live-window helpers for event live coverage.
 *
 * Mirrors the server's `resolveEventMode` (server/services/eventMode.service.ts)
 * so the SPA can decide pre / live / post without a round-trip:
 *
 *   - `liveModeForce` ('pre' | 'live' | 'post') always wins.
 *   - Otherwise the event is live while `now` sits inside
 *     [liveModeStartOverride ?? startDate - 2h, liveModeEndOverride ?? endDate + 6h].
 *   - Before that window → 'pre', after → 'post'.
 */

export type EventLiveStatus = "pre" | "live" | "post";

/** The subset of the event row the live-window math needs. */
export interface LiveWindowEvent {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  liveModeForce?: string | null;
  liveModeStartOverride?: string | Date | null;
  liveModeEndOverride?: string | Date | null;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function toMillis(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const ms = (typeof d === "string" ? new Date(d) : d).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Resolve the display phase for an event at `now` (defaults to Date.now()). */
export function getEventLiveStatus(
  event: LiveWindowEvent,
  now: Date = new Date(),
): EventLiveStatus {
  const force = event.liveModeForce;
  if (force === "pre" || force === "live" || force === "post") return force;

  const nowMs = now.getTime();
  const startMs = toMillis(event.startDate);
  // No start date → nothing to reason about; safest is "upcoming".
  if (startMs === null) return "pre";
  const endMs = toMillis(event.endDate) ?? startMs;

  const windowStart =
    toMillis(event.liveModeStartOverride) ?? startMs - TWO_HOURS_MS;
  const windowEnd = toMillis(event.liveModeEndOverride) ?? endMs + SIX_HOURS_MS;

  if (nowMs >= windowStart && nowMs <= windowEnd) return "live";
  return nowMs < startMs ? "pre" : "post";
}

/** Convenience boolean wrapper around getEventLiveStatus. */
export function isEventLive(event: LiveWindowEvent, now?: Date): boolean {
  return getEventLiveStatus(event, now) === "live";
}

/**
 * Compact relative timestamp for live-feed cards.
 *   "just now" (< 1 min) → "2m ago" → "1h ago" → falls back to an
 *   absolute time ("3:41 PM", with the date when it's not today's).
 */
export function timeAgo(iso: string | Date | null | undefined): string {
  const ms = toMillis(iso ?? null);
  if (ms === null) return "";
  const date = new Date(ms);
  const diff = Date.now() - ms;

  if (diff >= 0) {
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 24 * 3_600_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  }

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (date.toDateString() === new Date().toDateString()) return time;
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${day}, ${time}`;
}
