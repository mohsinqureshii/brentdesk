/**
 * EventLiveBand — the dark "we are on the ground" band that sits between
 * the hero and the tab bar while an event is in live mode.
 *
 * DATA HONESTY: there is no viewer telemetry anywhere in this product,
 * so this band never shows a "N watching" figure. The only counter it
 * prints is the real number of published live posts, labelled as
 * updates. The session name in the meta line is the `location` (stage)
 * of the session actually running now, per `events.getSchedule` — it is
 * omitted when nothing is scheduled at this minute.
 *
 * The UP NEXT card renders only when a future session exists.
 */

import { Link } from "wouter";
import { ArrowRight, Play, Radio } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { EventFallbackTile } from "./EventVisual";
import { CONTAINER, relativeStart, useNow, type EventRow } from "./eventMeta";
import { formatTimeRange } from "./eventFormat";

type Session = {
  id: number;
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  dayNumber?: number | null;
};

/** First line of a post's body — used when it has no headline. */
function postHeadline(post: any): string {
  if (post?.headline) return String(post.headline);
  const body = String(post?.body || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[*_`>#~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return body.slice(0, 140) || "Live update";
}

export default function EventLiveBand({
  event,
  posts,
}: {
  event: EventRow;
  posts: any[];
}) {
  const now = useNow(60_000, true);

  const { data: scheduleRows = [] } = trpc.events.getSchedule.useQuery(
    { eventId: event.id },
    { enabled: !!event.id },
  );
  const sessions = scheduleRows as unknown as Session[];

  // `listLivePosts` already returns pinned-first, then newest-first, so
  // the lead post is simply the first row.
  const lead = posts[0] || null;

  const currentSession =
    sessions.find((s) => {
      const start = s.startTime ? new Date(s.startTime).getTime() : 0;
      if (!start) return false;
      const end = s.endTime ? new Date(s.endTime).getTime() : start + 3_600_000;
      return start <= now && now <= end;
    }) || null;

  const nextSession =
    sessions
      .filter((s) => {
        const start = s.startTime ? new Date(s.startTime).getTime() : 0;
        return start > now;
      })
      .sort(
        (a, b) =>
          new Date(a.startTime as string).getTime() -
          new Date(b.startTime as string).getTime(),
      )[0] || null;

  const updates = posts.length;
  const metaBits = [
    currentSession?.location || null,
    updates === 0
      ? "No updates yet"
      : `${updates} update${updates === 1 ? "" : "s"}`,
  ].filter(Boolean) as string[];

  const leadImage = lead?.imageUrl || null;
  const hasVideo = !!lead?.embedUrl;

  return (
    <section className={`${CONTAINER} mt-12`} aria-label="Live coverage">
      <div className="grid gap-4 rounded-2xl bg-zinc-950 p-6 text-white lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8 lg:p-8">
        {/* ------------------------------------------------- left */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
              Live at {event.title}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              Live
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Link
              href={`/events/${event.slug}/live`}
              className="group relative block h-28 w-full shrink-0 overflow-hidden rounded-xl sm:w-44"
              aria-label={`Open live coverage of ${event.title}`}
            >
              {leadImage ? (
                <img
                  src={leadImage}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <EventFallbackTile
                  title={event.title}
                  slug={`${event.slug}-live`}
                  type={event.type}
                  variant="compact"
                  interactive={false}
                />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/35">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-zinc-900">
                  {hasVideo ? (
                    <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                  ) : (
                    <Radio className="h-5 w-5" />
                  )}
                </span>
              </span>
            </Link>

            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-snug text-white sm:text-2xl">
                {lead ? postHeadline(lead) : `Live coverage of ${event.title}`}
              </h2>
              <p className="mt-2 text-sm text-white/60">
                {metaBits.join(" · ")}
              </p>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ up next */}
        {nextSession ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">
                Up next
              </span>
            </div>
            <h3 className="mt-3 text-base font-bold leading-snug text-white">
              {nextSession.title}
            </h3>
            <p className="mt-1.5 text-sm text-white/60">
              {[
                nextSession.location,
                formatTimeRange(nextSession.startTime, nextSession.endTime),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {(() => {
              const rel = relativeStart(
                nextSession.startTime ? new Date(nextSession.startTime) : null,
                now,
              );
              return rel ? (
                <p className="mt-1 text-sm font-semibold text-emerald-400">{rel}</p>
              ) : null;
            })()}
            <Link
              href={`/events/${event.slug}/live`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:underline"
            >
              View all live sessions
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
