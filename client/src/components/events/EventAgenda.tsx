/**
 * Public agenda for an event.
 *
 * Sessions come from `events.getSchedule` (already ordered by dayNumber
 * then sortOrder) and are grouped into day tabs. Each day header shows
 * the real calendar date derived from the event's startDate, since the
 * schedule table only stores a 1-based `dayNumber`.
 *
 * The session rows carry a `speakers` array, but that payload has no
 * person slug on it — so we cross-reference `events.getSpeakers` (which
 * does return `personSlug`) by speaker id to decide whether an avatar
 * chip links to a /people profile.
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Clock, MapPin, Star, CalendarDays } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RichText,
  dateForDayNumber,
  formatDayLabel,
  formatTimeRange,
  initialsOf,
} from "./eventFormat";

type Session = {
  id: number;
  title: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  dayNumber?: number | null;
  sessionType?: string | null;
  trackId?: number | null;
  imageUrl?: string | null;
  isFeatured?: boolean;
  speakerName?: string | null;
  speakerIds?: number[];
  speakers?: Array<{
    id: number;
    name: string | null;
    title: string | null;
    company: string | null;
    photo: string | null;
    personId: number | null;
  }>;
};

type Track = { id: number; name: string; color?: string | null };

/** Muted, on-brand chips per session type. Falls back to neutral. */
const SESSION_TYPE_STYLES: Record<string, string> = {
  keynote:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
  panel: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
  workshop:
    "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25",
  networking:
    "bg-primary/100/10 text-primary border-primary",
  break: "bg-muted text-muted-foreground border-border",
  other: "bg-muted text-muted-foreground border-border",
};

function SessionTypeBadge({ type }: { type: string }) {
  const cls = SESSION_TYPE_STYLES[type] || SESSION_TYPE_STYLES.other;
  return (
    <Badge
      variant="outline"
      className={`capitalize text-[11px] font-medium ${cls}`}
    >
      {type.replace(/_/g, " ")}
    </Badge>
  );
}

function SpeakerChip({
  speaker,
  slug,
}: {
  speaker: NonNullable<Session["speakers"]>[number];
  slug?: string | null;
}) {
  const inner = (
    <span className="flex items-center gap-2 rounded-full border bg-background/80 py-1 pl-1 pr-3 transition hover:border-primary/40 hover:bg-muted">
      {speaker.photo ? (
        <img
          src={speaker.photo}
          alt=""
          aria-hidden="true"
          className="h-6 w-6 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
          {initialsOf(speaker.name)}
        </span>
      )}
      <span className="text-xs font-medium leading-none">{speaker.name}</span>
    </span>
  );

  if (slug) {
    return (
      <Link href={`/people/${slug}`} className="shrink-0">
        {inner}
      </Link>
    );
  }
  return <span className="shrink-0">{inner}</span>;
}

function SessionRow({
  session,
  track,
  slugBySpeakerId,
  action,
}: {
  session: Session;
  track?: Track;
  slugBySpeakerId: Map<number, string | null>;
  action?: React.ReactNode;
}) {
  const t = useT();
  const timeRange = formatTimeRange(session.startTime, session.endTime);
  const accent = track?.color || undefined;
  const speakers = session.speakers || [];

  return (
    <li id={`session-${session.id}`} className="scroll-mt-24">
      <Card
        className={`overflow-hidden transition ${
          session.isFeatured
            ? "border-primary/40 bg-primary/[0.035] shadow-sm"
            : "hover:border-primary/30"
        }`}
      >
        <div className="flex">
          {/* Track colour spine — a neutral hairline when the session
              isn't assigned to a track. */}
          <div
            className="w-1 shrink-0"
            style={{ backgroundColor: accent || "var(--border)" }}
            aria-hidden="true"
          />
          <CardContent className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row">
              {/* Time column */}
              <div className="shrink-0 sm:w-32">
                <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {timeRange || t("events.tba")}
                </div>
                {track?.name && (
                  <div
                    className="mt-1 text-[11px] font-semibold uppercase tracking-wider"
                    style={accent ? { color: accent } : undefined}
                  >
                    {track.name}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  {session.sessionType && (
                    <SessionTypeBadge type={String(session.sessionType)} />
                  )}
                  {session.isFeatured && (
                    <Badge className="gap-1 border-transparent bg-primary/15 text-[11px] text-primary hover:bg-primary/20">
                      <Star className="h-3 w-3" /> {t("list.featured")}
                    </Badge>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 text-base font-semibold leading-snug sm:text-lg">
                    {session.title}
                  </h3>
                  {action}
                </div>

                {session.location && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {session.location}
                  </div>
                )}

                {session.description && (
                  <RichText
                    html={session.description}
                    className="mt-2 text-sm text-muted-foreground prose-p:my-1"
                  />
                )}

                {speakers.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {speakers.map((sp) => (
                      <SpeakerChip
                        key={sp.id}
                        speaker={sp}
                        slug={slugBySpeakerId.get(sp.id) || null}
                      />
                    ))}
                  </div>
                ) : session.speakerName ? (
                  <div className="mt-3 text-sm text-muted-foreground">
                    {session.speakerName}
                  </div>
                ) : null}
              </div>

              {/* Optional thumbnail */}
              {session.imageUrl && (
                <div className="shrink-0 sm:w-40">
                  <img
                    src={session.imageUrl}
                    alt=""
                    aria-hidden="true"
                    className="h-28 w-full rounded-lg object-cover ring-1 ring-border sm:h-24"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </li>
  );
}

export default function EventAgenda({
  eventId,
  eventStartDate,
  tracks = [],
  renderSessionAction,
}: {
  eventId: number;
  eventStartDate?: string | Date | null;
  tracks?: Track[];
  /** Optional per-session affordance (the page injects a share trigger). */
  renderSessionAction?: (session: Session) => React.ReactNode;
}) {
  const t = useT();
  const { data: sessions = [], isLoading } = trpc.events.getSchedule.useQuery(
    { eventId },
    { enabled: !!eventId },
  );
  // Only used to resolve person slugs for the speaker chips — the
  // schedule payload carries personId but not the slug.
  const { data: speakerRows = [] } = trpc.events.getSpeakers.useQuery(
    { eventId },
    { enabled: !!eventId },
  );

  const slugBySpeakerId = useMemo(() => {
    const m = new Map<number, string | null>();
    for (const s of speakerRows as any[]) {
      if (s.personId && s.personSlug) m.set(s.id, s.personSlug as string);
    }
    return m;
  }, [speakerRows]);

  const trackById = useMemo(() => {
    const m = new Map<number, Track>();
    for (const t of tracks || []) m.set(t.id, t);
    return m;
  }, [tracks]);

  const list = sessions as unknown as Session[];

  const days = useMemo(
    () =>
      Array.from(new Set(list.map((s) => s.dayNumber || 1))).sort(
        (a, b) => a - b,
      ),
    [list],
  );

  const [activeDay, setActiveDay] = useState<number | null>(null);
  const day = activeDay ?? days[0] ?? 1;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-32" />
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">{t("events.agendaNotPublished")}</p>
          <p className="text-sm text-muted-foreground">
            {t("events.agendaNotPublishedBody")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const daySessions = list
    .filter((s) => (s.dayNumber || 1) === day)
    .sort((a, b) => {
      const at = a.startTime ? new Date(a.startTime).getTime() : 0;
      const bt = b.startTime ? new Date(b.startTime).getTime() : 0;
      return at - bt;
    });

  const activeDate = dateForDayNumber(eventStartDate, day);

  return (
    <div className="space-y-5">
      {days.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => {
            const dt = dateForDayNumber(eventStartDate, d);
            const isActive = d === day;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setActiveDay(d)}
                aria-pressed={isActive}
                className={`shrink-0 rounded-xl border px-4 py-2 text-left transition ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "bg-background hover:border-primary/40 hover:bg-muted"
                }`}
              >
                <div className="text-sm font-semibold leading-tight">
                  {t("events.dayN", { n: d })}
                </div>
                {dt && (
                  <div
                    className={`text-xs leading-tight ${
                      isActive
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
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

      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold">
          {days.length > 1 ? t("events.dayN", { n: day }) : t("events.agenda")}
          {activeDate && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {formatDayLabel(activeDate)}
            </span>
          )}
        </h3>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {daySessions.length === 1
            ? t("events.sessionCountOne", { n: daySessions.length })
            : t("events.sessionCountMany", { n: daySessions.length })}
        </span>
      </div>

      {daySessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("events.noSessionsForDay")}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {daySessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              track={s.trackId ? trackById.get(s.trackId) : undefined}
              slugBySpeakerId={slugBySpeakerId}
              action={renderSessionAction?.(s)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
