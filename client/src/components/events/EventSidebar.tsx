/**
 * EventSidebar — the right rail beside the editorial half of the event
 * page (overview, what-to-expect, highlights, audience).
 *
 * It is a plain grid column, NOT a viewport-clamped panel: an earlier
 * version capped its height to `calc(100vh - 7rem)` with its own scroll,
 * which made short rails leave a void beside a long article. Here the
 * column is `self-start` and `sticky` from lg up, so it scrolls with the
 * page until it reaches the top and then holds — and it can never be
 * taller than its own content.
 *
 * ADDING A MODULE: write a component that returns `null` when it has
 * nothing real to show, wrap it in <RailCard>, and drop it into the list
 * in EventSidebar below. Every module self-fetches, so adding one costs
 * nothing on events that lack the data. That is the whole extension
 * point — no props threading, no layout changes.
 *
 * Nothing here invents data: each module reads a populated column and is
 * omitted entirely when the column is empty.
 */

import { Link } from "wouter";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ExternalLink,
  Globe,
  MapPin,
  Ticket,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { stripHtml } from "@/lib/sanitizeHtml";
import { SidebarAd } from "@/components/ads/AdUnit";
import {
  formatLongDateRange,
  formatLocation,
  type CardEvent,
} from "./EventCard";
import { EventFallbackTile, isUsableImage } from "./EventVisual";
import { durationLabel, buildDirectionsUrl, type EventRow } from "./eventMeta";
import { formatDate } from "./eventFormat";

// ----------------------------------------------------------------- shell

function RailCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-muted/40 px-5 py-3.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
          {title}
        </h2>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function FactRow({
  Icon,
  label,
  children,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-sm font-medium leading-snug text-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- modules

/** Dates, place and the organiser's own links — all from event columns. */
function KeyFacts({ event }: { event: EventRow }) {
  const duration = durationLabel(event.startDate, event.endDate);
  const venueName = event.venueName || event.venue || null;
  const location = formatLocation(event.city, event.country, event.format);
  const directionsUrl = buildDirectionsUrl(event);
  const website = event.websiteUrl || null;

  const rows: React.ReactNode[] = [];

  if (event.startDate) {
    rows.push(
      <FactRow Icon={CalendarDays} label="Dates" key="dates">
        {formatLongDateRange(event.startDate, event.endDate)}
        {duration && (
          <span className="block font-normal text-muted-foreground">{duration}</span>
        )}
      </FactRow>,
    );
  }

  if (venueName || location) {
    rows.push(
      <FactRow Icon={MapPin} label="Venue" key="venue">
        {venueName || location}
        {venueName && location && (
          <span className="block font-normal text-muted-foreground">{location}</span>
        )}
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Get directions <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </FactRow>,
    );
  }

  if (website) {
    rows.push(
      <FactRow Icon={Globe} label="Official site" key="site">
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1 break-all text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
        </a>
      </FactRow>,
    );
  }

  if (event.registrationUrl) {
    rows.push(
      <FactRow Icon={Ticket} label="Registration" key="reg">
        <a
          href={event.registrationUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Register on the organiser&rsquo;s site
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
        </a>
      </FactRow>,
    );
  }

  if (rows.length === 0) return null;

  return (
    <RailCard title="Key facts">
      <div className="divide-y divide-[var(--border)]">{rows}</div>
    </RailCard>
  );
}

/** Who runs the event. Omitted when no organiser has been recorded. */
function Organiser({ event }: { event: EventRow }) {
  const name = event.organizerName;
  if (!name) return null;
  const blurb = event.organizerDescription
    ? stripHtml(String(event.organizerDescription))
    : null;

  return (
    <RailCard title="Organiser">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="font-semibold leading-snug text-foreground">{name}</div>
          {blurb && (
            <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
              {blurb}
            </p>
          )}
          {event.organizerWebsite && (
            <a
              href={event.organizerWebsite}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Visit organiser <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </RailCard>
  );
}

/** Other upcoming events, current one excluded. */
function MoreEvents({ currentId }: { currentId: number }) {
  const q = trpc.events.list.useQuery({
    page: 1,
    limit: 8,
    upcoming: true,
    sortBy: "startDate",
    sortOrder: "asc",
  } as any);

  const items = (((q.data as any)?.items || []) as CardEvent[])
    .filter((e) => e.id !== currentId)
    .slice(0, 4);

  if (items.length === 0) return null;

  return (
    <RailCard
      title="Coming up next"
      action={
        <Link
          href="/events"
          className="text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
        >
          All events
        </Link>
      }
    >
      <ul className="divide-y divide-[var(--border)]">
        {items.map((e) => (
          <li key={e.id} className="first:pt-0 last:pb-0">
            <Link href={`/events/${e.slug}`} className="group flex gap-3 py-3">
              <span className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
                {isUsableImage(e.featuredImage) ? (
                  <img
                    src={e.featuredImage as string}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <EventFallbackTile
                    title={e.title}
                    slug={e.slug}
                    type={e.type}
                    variant="thumb"
                    interactive={false}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm font-semibold leading-snug text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  {e.title}
                </span>
                {e.startDate && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDate(e.startDate)}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </RailCard>
  );
}

// ------------------------------------------------------------------ rail

export default function EventSidebar({ event }: { event: EventRow }) {
  return (
    <aside
      aria-label={`About ${event.title}`}
      className="space-y-6 lg:sticky lg:top-24 lg:self-start"
    >
      <KeyFacts event={event} />
      <Organiser event={event} />
      <SidebarAd slotKey="events-sidebar" category="events" />
      <MoreEvents currentId={event.id} />
    </aside>
  );
}
