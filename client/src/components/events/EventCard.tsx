/**
 * Event card primitives for the public events hub.
 * ----------------------------------------------------------------------
 * Three units live here, all sharing the same formatting helpers:
 *
 *   EventCard          — the grid unit (v5 anatomy)
 *   LiveEventCard      — the dark overlay card used by the LIVE NOW rail
 *   TrendingEventRow   — the numbered sidebar row
 *
 * v5 grid anatomy (matches the supplied design):
 *
 *   ┌─────────────────────────────┐
 *   │ 16:9 media                  │  ← EventMedia; TYPE badge top-left,
 *   │  [TYPE]            (🔖)     │    bookmark button top-right
 *   ├─────────────────────────────┤
 *   │ MAR │ Title, two lines      │  ← date block + text column
 *   │  4  │ 📍 City, Country      │
 *   │     │ 🗓 March 4–7, 2026    │
 *   └─────────────────────────────┘
 *
 * Every media slot goes through `EventMedia`, which renders a designed,
 * deterministic gradient tile when an event has no photo (the common
 * case in this dataset) and swaps to the same tile if a real `<img>`
 * fails to load. There is no state in which this file shows a broken
 * image glyph.
 *
 * Card links use the "stretched link" pattern — the anchor sits on the
 * title and grows to cover the card via `after:absolute after:inset-0`.
 * That keeps the bookmark <button> a sibling of the <a> rather than a
 * (invalid, unfocusable) child of it.
 */

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";
import { Link } from "wouter";
import { Bookmark, CalendarDays, MapPin, Radio } from "lucide-react";
import { toast } from "sonner";

import { publication } from "@shared/publication";
import type { UiKey } from "@shared/uiStrings";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { EventMedia, typeLabelFor } from "./EventVisual";

// ----------------------------------------------------------------------
// Shared formatting helpers (also used by the hero + live rail)
// ----------------------------------------------------------------------

/** The shape `useT()` returns — helpers below take it so they can translate. */
type Translate = (key: UiKey, vars?: Record<string, string | number>) => string;

export function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Date-block content: `{ month: "MAR", day: "4–7" }`.
 *
 * The month comes from `fmtDate`, not a hardcoded English array — the card
 * strip is drawn `uppercase`, so English still reads MAR while Arabic reads
 * the Arabic month instead of "MAR" on a translated page.
 */
export function cardDateStrip(
  t: Translate,
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): { month: string; day: string } {
  const s = asDate(start);
  if (!s) return { month: t("events.tbd"), day: "—" };
  const e = asDate(end);
  const month = fmtDate(s, { month: "short" });
  const sameMonth =
    e && s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
  if (e && sameMonth && s.getDate() !== e.getDate()) {
    return { month, day: `${s.getDate()}–${e.getDate()}` };
  }
  return { month, day: String(s.getDate()) };
}

/** "March 4–7, 2026" — the long form used by the hero and card meta. */
export function formatLongDateRange(
  t: Translate,
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string {
  const s = asDate(start);
  if (!s) return t("events.dateTbd");
  const e = asDate(end);
  const fmt = (d: Date) =>
    fmtDate(d, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const sameDay =
    e &&
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();
  if (!e || sameDay) return fmt(s);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    const month = fmtDate(s, { month: "long" });
    return `${month} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${fmt(s)} – ${fmt(e)}`;
}

/** "Mar 4, 2026" — the compact form used by the sidebar rows. */
export function formatShortDate(
  t: Translate,
  start: Date | string | null | undefined,
): string {
  const s = asDate(start);
  if (!s) return t("events.dateTbd");
  return fmtDate(s, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLocation(
  t: Translate,
  city: string | null | undefined,
  country: string | null | undefined,
  format: string | null | undefined,
): string {
  if (format === "virtual") return t("events.online");
  const parts = [city, country].filter(Boolean);
  return parts.length ? parts.join(", ") : t("events.locationTbd");
}

export function formatPriceLabel(
  t: Translate,
  isFree: number | boolean | null | undefined,
  ticketPrice: string | number | null | undefined,
  ticketCurrency: string | null | undefined,
): { label: string; tone: "free" | "paid" } | null {
  if (isFree) return { label: t("events.free"), tone: "free" };
  const n = ticketPrice != null ? Number(ticketPrice) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  const currency = (ticketCurrency || "USD").toUpperCase();
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return {
    label: t("events.priceFrom", { price: `${symbol}${Math.round(n)}` }),
    tone: "paid",
  };
}

// ----------------------------------------------------------------------
// Type badge palette
// ----------------------------------------------------------------------

/**
 * Emerald is reserved as the page accent, so the type badges use a
 * separate, colour-coded ramp. All pairs clear AA on their own ground in
 * both themes.
 */
const TYPE_BADGE_CLASS: Record<string, string> = {
  conference: "bg-blue-600 text-white",
  summit: "bg-violet-600 text-white",
  webinar: "bg-sky-600 text-white",
  meetup: "bg-amber-500 text-amber-950",
  workshop: "bg-orange-600 text-white",
  hackathon: "bg-fuchsia-600 text-white",
  other: "bg-zinc-700 text-white",
};

export function typeBadgeClass(type: string | null | undefined): string {
  return (
    TYPE_BADGE_CLASS[(type || "other").toLowerCase()] || TYPE_BADGE_CLASS.other
  );
}

// ----------------------------------------------------------------------
// Bookmark button — real, account-backed
// ----------------------------------------------------------------------

export interface BookmarkableEvent {
  id: number;
  title: string;
  slug: string;
  featuredImage?: string | null;
  type?: string | null;
}

/**
 * `bookmarks.check` / `bookmarks.toggle` are both `protectedProcedure`,
 * so the query only runs for a signed-in visitor and a logged-out click
 * is intercepted before it can 401 — it toasts an invitation to sign in
 * instead. tRPC's httpBatchLink folds the per-card `check` calls into a
 * single request per render, so a 24-card grid is still one round-trip.
 */
export function useEventBookmark(event: BookmarkableEvent) {
  const t = useT();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const checkQuery = trpc.bookmarks.check.useQuery(
    { contentType: "event", contentId: event.id },
    { enabled: isAuthenticated, retry: false, staleTime: 60_000 },
  );

  const toggleMutation = trpc.bookmarks.toggle.useMutation({
    onSuccess: (result) => {
      setOptimistic(result.bookmarked);
      void utils.bookmarks.check.invalidate({
        contentType: "event",
        contentId: event.id,
      });
      toast.success(
        result.bookmarked
          ? t("events.savedToBookmarks")
          : t("events.removedFromBookmarks"),
      );
    },
    onError: () => {
      setOptimistic(null);
      toast.error(t("events.bookmarkError"));
    },
  });

  const saved = optimistic ?? checkQuery.data?.bookmarked ?? false;

  const toggle = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!isAuthenticated) {
      toast(t("events.signInToSave"), {
        description: t("events.bookmarksStoredOn", { site: publication.name }),
        action: {
          label: t("nav.signIn"),
          onClick: () => {
            window.location.href = "/signin";
          },
        },
      });
      return;
    }

    setOptimistic(!saved);
    toggleMutation.mutate({
      contentType: "event",
      contentId: event.id,
      contentTitle: event.title.slice(0, 500),
      contentSlug: event.slug.slice(0, 500),
      contentCategory: (event.type || "other").slice(0, 128),
      ...(event.featuredImage ? { contentImageUrl: event.featuredImage } : {}),
    });
  };

  return { saved, toggle, isPending: toggleMutation.isPending };
}

export function EventBookmarkButton({
  event,
  className = "",
}: {
  event: BookmarkableEvent;
  className?: string;
}) {
  const t = useT();
  const { saved, toggle, isPending } = useEventBookmark(event);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={
        saved
          ? t("events.removeFromBookmarks", { title: event.title })
          : t("events.saveToBookmarks", { title: event.title })
      }
      title={saved ? t("article.saved") : t("events.saveEvent")}
      disabled={isPending}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-zinc-700 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${className}`}
    >
      <Bookmark
        className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`}
      />
    </button>
  );
}

/**
 * The same account-backed toggle as `EventBookmarkButton`, drawn as a
 * labelled outline button — the hero's "Save Event" action. Same state,
 * same mutation, same signed-out prompt; only the chrome differs.
 */
export function EventSaveButton({
  event,
  className = "",
}: {
  event: BookmarkableEvent;
  className?: string;
}) {
  const t = useT();
  const { saved, toggle, isPending } = useEventBookmark(event);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      disabled={isPending}
      title={saved ? t("events.savedToBookmarks") : t("events.saveThisEvent")}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg border px-6 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${
        saved
          ? "border-primary bg-primary/10 text-primary"
          : "border-[var(--border)] text-foreground hover:border-primary/50 hover:text-primary dark:hover:text-primary"
      } ${className}`}
    >
      <Bookmark
        className={`h-4 w-4 ${saved ? "fill-primary text-primary dark:fill-primary dark:text-primary" : ""}`}
        aria-hidden="true"
      />
      {saved ? t("article.saved") : t("events.saveEvent")}
    </button>
  );
}

// ----------------------------------------------------------------------
// Grid card
// ----------------------------------------------------------------------

export interface CardEvent {
  id: number;
  title: string;
  slug: string;
  shortDescription?: string | null;
  featuredImage?: string | null;
  type?: string | null;
  format?: string | null;
  city?: string | null;
  country?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  isFree?: number | boolean | null;
  ticketPrice?: string | number | null;
  ticketCurrency?: string | null;
  expectedAttendees?: number | null;
  goingCount?: number;
  speakerCount?: number;
  isFeatured?: number | boolean | null;
}

export function EventCard({
  event,
  isLive = false,
  tone = "default",
}: {
  event: CardEvent;
  isLive?: boolean;
  tone?: "default" | "past";
}) {
  const t = useT();
  const { month, day } = cardDateStrip(t, event.startDate, event.endDate);
  const location = formatLocation(t, event.city, event.country, event.format);
  const price = formatPriceLabel(
    t,
    event.isFree,
    event.ticketPrice,
    event.ticketCurrency,
  );
  const isPast = tone === "past";

  return (
    <article
      className={[
        "group relative flex h-full flex-col rounded-2xl border bg-card p-3",
        "transition-all duration-300 ease-out",
        isPast
          ? "border-border opacity-70 shadow-none hover:opacity-100 hover:shadow-md"
          : "border-border shadow-sm hover:-translate-y-1.5 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)]",
      ].join(" ")}
    >
      {/* ------------------------------------------------------- media */}
      <div className="relative overflow-hidden rounded-xl">
        <EventMedia
          event={event}
          variant="card"
          loading="lazy"
          interactive={!isPast}
          className={`aspect-[16/9] w-full ${
            isPast
              ? "grayscale transition-[filter] duration-300 group-hover:grayscale-0"
              : ""
          }`}
        />

        {/* Type badge — top-left, colour-coded */}
        <span
          className={`absolute left-2.5 top-2.5 z-10 inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] shadow-sm ${typeBadgeClass(
            event.type,
          )}`}
        >
          {typeLabelFor(event.type)}
        </span>

        {/* Bookmark — top-right. z-20 keeps it above the stretched link. */}
        <div className="absolute right-2.5 top-2.5 z-20">
          <EventBookmarkButton event={event} />
        </div>

        {isLive && (
          <span className="absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            <PulsingDot light />
            {t("events.live")}
          </span>
        )}

        {price && (
          <span
            className={`absolute bottom-2.5 right-2.5 z-10 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
              price.tone === "free"
                ? "bg-primary text-white"
                : "bg-white/95 text-zinc-900"
            }`}
          >
            {price.label}
          </span>
        )}
      </div>

      {/* -------------------------------------------------------- body */}
      <div className="mt-3.5 flex flex-1 gap-3.5 px-1 pb-1">
        {/* Date block */}
        <div className="w-12 shrink-0 text-center">
          <div className="text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground">
            {month}
          </div>
          <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-foreground">
            {day}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className={`line-clamp-2 min-h-[2.6rem] text-[15px] font-bold leading-snug tracking-tight transition-colors ${
              isPast
                ? "text-muted-foreground group-hover:text-foreground"
                : "text-foreground group-hover:text-primary dark:group-hover:text-primary"
            }`}
          >
            <Link
              href={`/events/${event.slug}`}
              className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
            >
              {event.title}
            </Link>
          </h3>

          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {formatLongDateRange(t, event.startDate, event.endDate)}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

/** Mirrors the grid-card anatomy so the grid doesn't reflow on load. */
export function EventCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-3">
      <Skeleton className="aspect-[16/9] w-full rounded-xl" />
      <div className="mt-3.5 flex gap-3.5 px-1 pb-1">
        <div className="w-12 shrink-0">
          <Skeleton className="mx-auto h-2.5 w-8" />
          <Skeleton className="mx-auto mt-1.5 h-6 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="mt-2 h-4 w-[55%]" />
          <Skeleton className="mt-3 h-3 w-[65%]" />
          <Skeleton className="mt-2 h-3 w-[80%]" />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Live indicator
// ----------------------------------------------------------------------

export function PulsingDot({ light }: { light?: boolean }) {
  const solid = light ? "bg-white" : "bg-red-600";
  const ping = light ? "bg-white" : "bg-red-500";
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full ${ping} opacity-75`}
      />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${solid}`} />
    </span>
  );
}

// ----------------------------------------------------------------------
// LIVE NOW rail card — dark image card with an overlaid CTA
// ----------------------------------------------------------------------

export interface LiveCardEvent {
  id: number;
  title: string;
  slug: string;
  featuredImage?: string | null;
  type?: string | null;
  city?: string | null;
  country?: string | null;
  format?: string | null;
  livePostsLastHour: number;
}

export function LiveEventCard({ event }: { event: LiveCardEvent }) {
  const t = useT();
  const location = formatLocation(t, event.city, event.country, event.format);
  // The only real-time number `listLiveNow` returns is the count of live
  // posts filed in the last hour. It is labelled as exactly that — this
  // hub has no viewer/concurrency telemetry to show.
  const updates = event.livePostsLastHour;

  return (
    <Link
      href={`/events/${event.slug}/live`}
      className="group relative w-[280px] shrink-0 snap-start focus-visible:outline-none sm:w-[320px] lg:w-[calc((100%-3.75rem)/4)]"
    >
      <article className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-950 shadow-sm ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-primary">
        <div className="absolute inset-0">
          <EventMedia
            event={event}
            variant="hero"
            className="h-full w-full"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow">
            <PulsingDot light />
            {t("events.live")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Radio className="h-3 w-3" />
            {updates <= 0
              ? t("events.coverageOpen")
              : updates === 1
                ? t("events.updatesThisHourOne", { n: updates })
                : t("events.updatesThisHourMany", { n: updates })}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug">
            {event.title}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/75">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-900 shadow-sm transition-colors group-hover:bg-primary/100 group-hover:text-white">
            {t("events.watchLive")}
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </article>
    </Link>
  );
}

export function LiveEventCardSkeleton() {
  return (
    <Skeleton className="aspect-[4/3] w-[280px] shrink-0 rounded-2xl sm:w-[320px] lg:w-[calc((100%-3.75rem)/4)]" />
  );
}

// ----------------------------------------------------------------------
// Sidebar trending row
// ----------------------------------------------------------------------

export function TrendingEventRow({
  event,
  rank,
}: {
  event: CardEvent;
  rank: number;
}) {
  const t = useT();
  const location = formatLocation(t, event.city, event.country, event.format);

  return (
    <div className="group relative flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold tabular-nums text-primary ring-1 ring-primary/20 dark:bg-primary/100/10 dark:text-primary dark:ring-primary/25">
        {rank}
      </span>

      <EventMedia
        event={event}
        variant="thumb"
        interactive={false}
        className="h-12 w-12 shrink-0 rounded-lg"
      />

      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-[13px] font-bold leading-snug transition-colors group-hover:text-primary dark:group-hover:text-primary">
          <Link
            href={`/events/${event.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:underline"
          >
            {event.title}
          </Link>
        </h4>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {location}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {formatShortDate(t, event.startDate)}
        </p>
      </div>
    </div>
  );
}

export function TrendingEventRowSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
      <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-[90%]" />
        <Skeleton className="mt-2 h-2.5 w-[50%]" />
        <Skeleton className="mt-1.5 h-2.5 w-[40%]" />
      </div>
    </div>
  );
}
