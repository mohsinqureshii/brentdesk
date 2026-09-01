/**
 * Event Mode Service
 *
 * Resolves an event's *display mode* (pre / live / post) for the public
 * Event Detail page. The mode is computed server-side so the client
 * doesn't have to re-do the date math (and so the same logic can be
 * reused by the JSON-LD generator, the indexer, the recap pipeline,
 * etc).
 *
 * Mode resolution rules (in order):
 *   1. If `liveModeForce` is set on the event row, honour it. This is
 *      the editorial override — used to switch to post-event mode early
 *      when the recap is ready, or to keep live mode on after the
 *      auto-window ended because coverage is still being posted.
 *   2. Otherwise, compute the live window:
 *        start = max(startDate - 2h, liveModeStartOverride)
 *        end   = min(endDate   + 6h, liveModeEndOverride)
 *      If now ∈ [start, end] → live.
 *   3. Else, before startDate → pre. After endDate → post.
 *
 * The 2-hour pre-roll and 6-hour post-roll give correspondents a buffer
 * to post final wrap-ups and morning teasers without an admin flipping
 * a switch.
 */

export type EventMode = 'pre' | 'live' | 'post';

/**
 * Minimal shape of the event row we need to resolve the mode. Kept
 * structural so this is callable with either the raw drizzle row or an
 * already-serialised response payload — anything with these date-ish
 * fields works.
 */
export interface EventModeInput {
  startDate: Date | string | null | undefined;
  endDate?: Date | string | null | undefined;
  liveModeStartOverride?: Date | string | null | undefined;
  liveModeEndOverride?: Date | string | null | undefined;
  liveModeForce?: EventMode | null | undefined;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function toMillis(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function resolveEventMode(event: EventModeInput, now: Date = new Date()): EventMode {
  // 1. Forced mode wins. Editor's explicit choice.
  if (event.liveModeForce === 'pre' || event.liveModeForce === 'live' || event.liveModeForce === 'post') {
    return event.liveModeForce;
  }

  const nowMs = now.getTime();
  const startMs = toMillis(event.startDate);
  const endMs = toMillis(event.endDate) ?? startMs;

  // Without a start date we can't reason about phase — default to pre
  // (safest: shows the standard pre-event marketing page).
  if (startMs === null) return 'pre';

  // 2. Live window: widen the [start, end] interval by the buffers,
  // then clamp/extend with the editor's override timestamps.
  const startOverrideMs = toMillis(event.liveModeStartOverride);
  const endOverrideMs = toMillis(event.liveModeEndOverride);

  const autoStart = startMs - TWO_HOURS_MS;
  const autoEnd = (endMs ?? startMs) + SIX_HOURS_MS;

  // Override extends OR contracts the window — caller chose it
  // explicitly, so we honour whichever value they set. If unset we
  // fall back to the auto window.
  const windowStart = startOverrideMs !== null ? Math.max(autoStart, startOverrideMs) : autoStart;
  const windowEnd = endOverrideMs !== null ? Math.min(autoEnd, endOverrideMs) : autoEnd;

  if (nowMs >= windowStart && nowMs <= windowEnd) return 'live';

  // 3. Position relative to the canonical event boundaries.
  if (nowMs < startMs) return 'pre';
  return 'post';
}
