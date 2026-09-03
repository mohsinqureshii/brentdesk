/**
 * EventAgendaPreview — the two-column agenda teaser.
 *
 *   ┌────────────────────────────┬──────────────────────────┐
 *   │ [Day 1][Day 2][Day 3]      │  venue photo / gradient  │
 *   │ 09:00 ★ Opening keynote    │  ABOUT THE VENUE         │
 *   │ 10:30   Investor panel     │  Riyadh Front Expo       │
 *   │ View full agenda →         │  Get directions →        │
 *   └────────────────────────────┴──────────────────────────┘
 *
 * Sessions come from `events.getSchedule` — the same source the full
 * Agenda tab uses — so the preview can never drift from the tab. Day
 * tabs derive their calendar date from the event's `startDate` because
 * the schedule table stores a 1-based `dayNumber` only.
 *
 * The star is `isFeatured` on the session row; it is not an interactive
 * bookmark, because there is no per-session bookmark endpoint.
 */

import { useMemo, useState } from "react";
import { ArrowRight, MapPin, Star } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { EventFallbackTile, isUsableImage } from "./EventVisual";
import { type GalleryRow } from "./EventGallery";
import { formatLocation } from "./EventCard";
import {
  dateForDayNumber,
  formatDayLabel,
  formatTime,
} from "./eventFormat";
import { buildDirectionsUrl, type EventRow } from "./eventMeta";

type Session = {
  id: number;
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  dayNumber?: number | null;
  sessionType?: string | null;
  isFeatured?: boolean;
};

const SESSION_TYPE_STYLES: Record<string, string> = {
  keynote: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  panel: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  workshop:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  networking:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  break: "border-[var(--border)] bg-muted text-muted-foreground",
  other: "border-[var(--border)] bg-muted text-muted-foreground",
};

function TypeBadge({ type }: { type: string }) {
  const cls = SESSION_TYPE_STYLES[type] || SESSION_TYPE_STYLES.other;
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${cls}`}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}

/** True when there is enough venue data to justify the right column. */
function hasVenueData(event: EventRow, gallery: GalleryRow[]): boolean {
  return Boolean(
    event.venueName ||
      event.venue ||
      event.city ||
      event.country ||
      isUsableImage(event.venueImage) ||
      (gallery || []).some((g) => isUsableImage(g?.imageUrl)),
  );
}

function VenueCard({
  event,
  gallery,
}: {
  event: EventRow;
  gallery: GalleryRow[];
}) {
  const t = useT();
  const name = event.venueName || event.venue || null;
  const locality = formatLocation(t, event.city, event.country, event.format);
  const directionsUrl = buildDirectionsUrl(event);

  const galleryImage = (gallery || []).find((g) => isUsableImage(g?.imageUrl));
  const image = isUsableImage(event.venueImage)
    ? (event.venueImage as string)
    : galleryImage?.imageUrl || null;

  return (
    <div className="min-w-0">
      <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-[var(--border)] lg:h-72">
        {image ? (
          <img
            src={image}
            alt={name ? `${name}` : t("events.venue")}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          // `hero` draws no caption. The venue's full name is printed
          // directly under this tile, so a three-letter monogram on top
          // of it reads as a truncation bug rather than a placeholder.
          <EventFallbackTile
            title={name || event.title}
            slug={`${event.slug}-venue`}
            type={event.type}
            variant="hero"
            interactive={false}
          />
        )}
      </div>

      <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
        {t("events.aboutVenue")}
      </h3>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
        {name || locality}
      </p>
      {name && <p className="mt-1 text-muted-foreground">{locality}</p>}
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {t("events.getDirections")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

export default function EventAgendaPreview({
  event,
  gallery,
  onOpenAgenda,
}: {
  event: EventRow;
  gallery: GalleryRow[];
  onOpenAgenda: () => void;
}) {
  const t = useT();
  const { data: rows = [], isLoading } = trpc.events.getSchedule.useQuery(
    { eventId: event.id },
    { enabled: !!event.id },
  );
  const sessions = rows as unknown as Session[];

  const days = useMemo(
    () =>
      Array.from(new Set(sessions.map((s) => s.dayNumber || 1))).sort(
        (a, b) => a - b,
      ),
    [sessions],
  );

  const [activeDay, setActiveDay] = useState<number | null>(null);
  const day = activeDay ?? days[0] ?? 1;

  const showVenue = hasVenueData(event, gallery);
  const venue = showVenue ? <VenueCard event={event} gallery={gallery} /> : null;

  if (isLoading) {
    return (
      <section className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-3">
          <Skeleton className="h-12 w-64 rounded-xl" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
        {venue}
      </section>
    );
  }

  // Nothing scheduled — the venue half still carries its weight, so the
  // section renders as a single column rather than disappearing. With
  // neither an agenda nor a venue there is nothing honest to show.
  if (sessions.length === 0) {
    if (!showVenue) return null;
    return (
      <section className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            {t("events.agenda")}
          </h2>
          <p className="mt-5 text-sm text-muted-foreground">
            {t("events.agendaComingSoon")}
          </p>
        </div>
        {venue}
      </section>
    );
  }

  const daySessions = sessions
    .filter((s) => (s.dayNumber || 1) === day)
    .sort((a, b) => {
      const at = a.startTime ? new Date(a.startTime).getTime() : 0;
      const bt = b.startTime ? new Date(b.startTime).getTime() : 0;
      return at - bt;
    })
    .slice(0, 5);

  return (
    <section className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      {/* ---------------------------------------------------- agenda */}
      <div className="min-w-0">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          {t("events.agenda")}
        </h2>

        {days.length > 1 && (
          <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
            {days.map((d) => {
              const dt = dateForDayNumber(event.startDate, d);
              const isActive = d === day;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDay(d)}
                  aria-pressed={isActive}
                  className={`shrink-0 rounded-xl border px-4 py-2.5 text-left transition ${
                    isActive
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-[var(--border)] hover:border-emerald-600/40 hover:bg-muted"
                  }`}
                >
                  <div className="text-sm font-bold leading-tight">
                    {t("events.dayN", { n: d })}
                  </div>
                  {dt && (
                    <div
                      className={`text-xs leading-tight ${
                        isActive ? "text-white/80" : "text-muted-foreground"
                      }`}
                    >
                      {formatDayLabel(dt)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <ul className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {daySessions.map((s) => (
            <li key={s.id} className="flex items-start gap-4 py-4">
              <div className="w-20 shrink-0 tabular-nums">
                <div className="text-sm font-bold text-foreground">
                  {formatTime(s.startTime) || t("events.tba")}
                </div>
                {s.endTime && (
                  <div className="text-xs text-muted-foreground">
                    {formatTime(s.endTime)}
                  </div>
                )}
              </div>

              {s.isFeatured ? (
                <Star
                  className="mt-0.5 h-4 w-4 shrink-0 fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400"
                  aria-label={t("events.featuredSession")}
                />
              ) : (
                <span className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}

              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold leading-snug text-foreground">
                  {s.title}
                </h3>
                {s.location && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {s.location}
                  </p>
                )}
              </div>

              {s.sessionType && <TypeBadge type={String(s.sessionType)} />}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onOpenAgenda}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {t("events.viewFullAgenda")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {venue}
    </section>
  );
}
