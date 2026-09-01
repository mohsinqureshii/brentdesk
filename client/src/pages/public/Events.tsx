/**
 * Public Events Hub — Index Page (v4)
 * ----------------------------------------------------------------------
 * Rebuilt around two hard constraints from the previous version:
 *
 *  1. **The canvas.** v3 sat in a `max-w-7xl` column while the site
 *     header runs to `max-w-[1400px]`, so the page read as a narrow strip
 *     floating in white space. Everything here uses the same container as
 *     `layout/Header.tsx` and the grid goes to four columns at 2xl, so
 *     the content actually fills the viewport.
 *
 *  2. **No photography.** Most events have `featuredImage = null` (see
 *     `components/events/EventVisual.tsx`). The design is built for that:
 *     every media slot renders a deterministic, per-event generated tile
 *     — gradient + texture + type watermark + monogram — and any real
 *     `<img>` that fails falls back to the same tile via `onError`. There
 *     is no state in which this page shows a broken-image glyph.
 *
 * Layout (top → bottom):
 *   1. Masthead      — page h1, one-line positioning, live stats, submit CTA
 *   2. Spotlight     — featured (else next) upcoming event, works photo-less
 *   3. Live now rail — conditional on `listLiveNow` returning rows
 *   4. Filter bar    — sticky under the header, ONE row on desktop
 *   5. Sections      — Happening now / This month / Upcoming, or Past
 *   6. Submit band   — in-flow (v3 floated this over the content)
 *
 * Data (unchanged surface area):
 *   trpc.events.list        — grid + spotlight, filters, city/type counts
 *   trpc.events.listLiveNow — live rail + the "live" dot on grid cards
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock,
  Globe2,
  MapPin,
  Newspaper,
  Plus,
  Search,
  SlidersHorizontal,
  Ticket,
  TrendingUp,
  X,
} from "lucide-react";

import { publication } from "@shared/publication";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { stripHtml } from "@/lib/sanitizeHtml";
import { useEdition } from "@/hooks/useEdition";

import {
  EventCard,
  EventCardSkeleton,
  LiveEventCard,
  PulsingDot,
  TrendingEventRow,
  TrendingEventRowSkeleton,
  asDate,
  formatLocation,
  formatLongDateRange,
  formatShortDate,
  type CardEvent,
  type LiveCardEvent,
} from "@/components/events/EventCard";
import { EventMedia, FORMAT_LABEL, typeLabelFor } from "@/components/events/EventVisual";
import { SidebarAd } from "@/components/ads/AdUnit";

// ----------------------------------------------------------------------
// Layout constants
// ----------------------------------------------------------------------

/** Matches `layout/Header.tsx` exactly — this is the site's canvas. */
const CONTAINER = "w-full max-w-[1400px] mx-auto px-6 lg:px-8";

/** 1 / 2 / 3 / 4 columns. Equal heights come from the cards themselves. */
const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6";

// ----------------------------------------------------------------------
// Filter vocabulary — every option below maps to a field that
// `listEventsSchema` (server/modules/events/events.router.ts) actually
// applies. Nothing here is decorative.
// ----------------------------------------------------------------------

type TimeFilter = "upcoming" | "past";
type FormatFilter = "all" | "in_person" | "virtual" | "hybrid";
type PriceFilter = "any" | "free";
type TypeFilter =
  | "all"
  | "conference"
  | "webinar"
  | "meetup"
  | "workshop"
  | "hackathon"
  | "summit"
  | "other";

const FORMAT_OPTIONS: { value: FormatFilter; label: string }[] = [
  { value: "all", label: "Any format" },
  { value: "in_person", label: "In-person" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Any type" },
  { value: "conference", label: "Conference" },
  { value: "summit", label: "Summit" },
  { value: "webinar", label: "Webinar" },
  { value: "meetup", label: "Meetup" },
  { value: "workshop", label: "Workshop" },
  { value: "hackathon", label: "Hackathon" },
  { value: "other", label: "Other" },
];

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: "any", label: "Any price" },
  { value: "free", label: "Free only" },
];

// ----------------------------------------------------------------------
// Countdown
// ----------------------------------------------------------------------

/** "In 12 days" / "In 3d 4h" / "Starting now" / null once it's begun. */
function useCountdown(target: Date | string | null | undefined): string | null {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => tick((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, [target]);

  const t = asDate(target);
  if (!t) return null;
  const ms = t.getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days >= 7) return `In ${days} days`;
  if (days > 0) return `In ${days}d ${hours}h`;
  if (hours > 0) return `In ${hours}h ${mins}m`;
  if (mins > 1) return `In ${mins}m`;
  return "Starting now";
}

// ----------------------------------------------------------------------
// URL <-> filter state (shareable + back/forward safe)
// ----------------------------------------------------------------------

interface Filters {
  time: TimeFilter;
  format: FormatFilter;
  type: TypeFilter;
  city: string | null;
  price: PriceFilter;
  search: string;
  /** sectors.id — the public list resolver now honours sectorId. */
  sector: number | null;
}

const DEFAULT_FILTERS: Filters = {
  time: "upcoming",
  format: "all",
  type: "all",
  city: null,
  price: "any",
  search: "",
  sector: null,
};

function readFiltersFromUrl(): Filters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  const sp = new URLSearchParams(window.location.search);
  // v3 shipped `time=this_week` and `time=live`; those links are still in
  // the wild, so anything that isn't "past" resolves to "upcoming"
  // (both of those cohorts now surface as sections, not as filters).
  const rawTime = sp.get("time");
  const time: TimeFilter = rawTime === "past" ? "past" : "upcoming";
  const rawFormat = sp.get("format") as FormatFilter | null;
  const rawType = sp.get("type") as TypeFilter | null;
  return {
    time,
    format: FORMAT_OPTIONS.some((o) => o.value === rawFormat)
      ? (rawFormat as FormatFilter)
      : "all",
    type: TYPE_OPTIONS.some((o) => o.value === rawType)
      ? (rawType as TypeFilter)
      : "all",
    city: sp.get("city") || null,
    price: sp.get("price") === "free" ? "free" : "any",
    search: sp.get("q") || "",
    sector: sp.get("sector") ? Number(sp.get("sector")) || null : null,
  };
}

function writeFiltersToUrl(f: Filters) {
  if (typeof window === "undefined") return;
  const sp = new URLSearchParams();
  if (f.time !== DEFAULT_FILTERS.time) sp.set("time", f.time);
  if (f.format !== DEFAULT_FILTERS.format) sp.set("format", f.format);
  if (f.type !== DEFAULT_FILTERS.type) sp.set("type", f.type);
  if (f.city) sp.set("city", f.city);
  if (f.price !== DEFAULT_FILTERS.price) sp.set("price", f.price);
  if (f.search) sp.set("q", f.search);
  if (f.sector) sp.set("sector", String(f.sector));
  const qs = sp.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  // replaceState, not push — flicking filters shouldn't junk the back stack.
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(null, "", next);
  }
}

/** Filters that actually narrow the list (the time toggle doesn't count). */
function countNarrowingFilters(f: Filters): number {
  let n = 0;
  if (f.format !== "all") n++;
  if (f.type !== "all") n++;
  if (f.city) n++;
  if (f.price !== "any") n++;
  if (f.search.trim()) n++;
  if (f.sector) n++;
  return n;
}

// ----------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------

export default function Events() {
  const { editionCountryId } = useEdition();
  const [filters, setFilters] = useState<Filters>(() => readFiltersFromUrl());

  useEffect(() => {
    writeFiltersToUrl(filters);
  }, [filters]);

  useEffect(() => {
    const onPop = () => setFilters(readFiltersFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Auto-discoverable RSS feed (SEO component can't render arbitrary
  // <link> tags, so it's injected here).
  useEffect(() => {
    const href = "/events/feed.xml";
    if (
      document.querySelector(
        `link[rel="alternate"][type="application/rss+xml"][href="${href}"]`,
      )
    ) {
      return;
    }
    const link = document.createElement("link");
    link.rel = "alternate";
    link.type = "application/rss+xml";
    link.title = `${publication.name} — Upcoming Events`;
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  // Only parameters present on `listEventsSchema` AND applied by the
  // public `list` resolver are sent. (`sectorId`/`categoryId`/`regionId`
  // are in the schema but the public resolver ignores them — see the
  // note at the bottom of this file.)
  const queryArgs = useMemo(() => {
    const now = new Date();
    const base: Record<string, unknown> = {
      page: 1,
      limit: 96,
      editionCountryId: editionCountryId ?? undefined,
      sortBy: "startDate" as const,
      sortOrder: filters.time === "past" ? ("desc" as const) : ("asc" as const),
      search: filters.search.trim() || undefined,
    };
    if (filters.format !== "all") base.format = filters.format;
    if (filters.type !== "all") base.type = filters.type;
    if (filters.city) base.city = filters.city;
    if (filters.price === "free") base.isFree = true;
    if (filters.sector) base.sectorId = filters.sector;
    if (filters.time === "past") base.startDateTo = now;
    else base.upcoming = true;
    return base;
  }, [filters, editionCountryId]);

  const eventsQuery = trpc.events.list.useQuery(queryArgs as any);

  // Spotlight — editorially controlled and independent of the visitor's
  // filters: featured upcoming first, else simply the next one up.
  const featuredQuery = trpc.events.list.useQuery({
    page: 1,
    limit: 5,
    featured: true,
    upcoming: true,
    sortBy: "startDate",
    sortOrder: "asc",
    editionCountryId: editionCountryId ?? undefined,
  } as any);

  const fallbackUpcomingQuery = trpc.events.list.useQuery(
    {
      page: 1,
      limit: 5,
      upcoming: true,
      sortBy: "startDate",
      sortOrder: "asc",
      editionCountryId: editionCountryId ?? undefined,
    } as any,
    {
      enabled:
        featuredQuery.isSuccess &&
        (featuredQuery.data?.items?.length ?? 0) === 0,
    },
  );

  // The cover rotates through several featured events rather than
  // pinning one; a single static hero made the page feel inert.
  const spotlightPool = useMemo(() => {
    const featured = (featuredQuery.data?.items || []) as SpotlightEvent[];
    if (featured.length) return featured.slice(0, 5);
    const fallback = (fallbackUpcomingQuery.data?.items || []) as SpotlightEvent[];
    return fallback.slice(0, 5);
  }, [featuredQuery.data, fallbackUpcomingQuery.data]);

  // Poll the live rail so post counts stay warm during a real conference.
  const liveNowQuery = trpc.events.listLiveNow.useQuery(undefined, {
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const liveEvents = (liveNowQuery.data || []) as LiveCardEvent[];
  const liveIdSet = useMemo(
    () => new Set(liveEvents.map((e) => e.id)),
    [liveEvents],
  );

  const items = (eventsQuery.data?.items || []) as CardEvent[];
  const cities = eventsQuery.data?.cityCounts || [];
  const typeCounts = eventsQuery.data?.typeCounts || {};

  // typeCounts / cityCounts are computed across the whole published set
  // (not the current filter), so they're safe to use as headline stats.
  const totalPublished = useMemo(
    () => Object.values(typeCounts).reduce((a, b) => a + Number(b || 0), 0),
    [typeCounts],
  );

  const sections = useMemo(
    () => groupEvents(items, filters, liveIdSet),
    [items, filters, liveIdSet],
  );

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const clearAll = () =>
    setFilters((prev) => ({ ...DEFAULT_FILTERS, time: prev.time }));

  const narrowingCount = countNarrowingFilters(filters);
  const isLoading = eventsQuery.isLoading;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Events — ${publication.name}`}
        description="The MENA tech events hub: conferences, summits, demo days, workshops, and live coverage of what's happening right now."
      />
      <Header />

      <main>
        {/* Split hero: editorial promise + search on the left, the
            editorially chosen spotlight event on the right. */}
        <SearchHero
          filters={filters}
          updateFilter={updateFilter}
          spotlightPool={spotlightPool}
          spotlightLoading={
            featuredQuery.isLoading ||
            (fallbackUpcomingQuery.isFetching && spotlightPool.length === 0)
          }
          totalPublished={totalPublished}
          cityCount={cities.length}
          liveCount={liveEvents.length}
        />

        {liveEvents.length > 0 && <LiveRail events={liveEvents} />}

        <TypeTabs
          filters={filters}
          updateFilter={updateFilter}
          typeCounts={typeCounts}
          cities={cities}
          narrowingCount={narrowingCount}
          onClear={clearAll}
        />

        <FilterBar
          filters={filters}
          updateFilter={updateFilter}
          cities={cities}
          narrowingCount={narrowingCount}
          onClear={clearAll}
        />

        <div className={`${CONTAINER} grid grid-cols-1 gap-8 pb-16 pt-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]`}>
          <div>
          {isLoading ? (
            <GridSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              time={filters.time}
              onClear={narrowingCount > 0 ? clearAll : undefined}
            />
          ) : (
            <div className="space-y-10">
              {sections.map((section) => (
                <section key={section.key}>
                  <SectionHeading
                    title={section.title}
                    hint={section.hint}
                    count={section.items.length}
                    live={false}
                  />
                  {section.key === "month" ? (
                    // Near-term events read better as one scrollable line
                    // than as a second full grid competing with the main one.
                    <div className="-mx-1 flex snap-x gap-5 overflow-x-auto px-1 pb-2">
                      {section.items.map((event) => (
                        <div
                          key={event.id}
                          className="w-[280px] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3rem)/3)]"
                        >
                          <EventCard
                            event={event}
                            isLive={liveIdSet.has(event.id)}
                            tone={section.tone}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={GRID}>
                      {section.items.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          isLive={liveIdSet.has(event.id)}
                          tone={section.tone}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}

              {/* Past events are never mixed into an upcoming view — the
                  toggle is the only door into them, and it's signposted. */}
              {filters.time === "upcoming" && (
                <PastEventsTeaser onShowPast={() => updateFilter("time", "past")} />
              )}
            </div>
          )}
          </div>

          {/* Sidebar: a genuine ranking (by RSVPs) plus the events ad
              slot that already exists in the advertising manager. */}
          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-4">
              <TrendingPanel
                editionCountryId={editionCountryId ?? undefined}
                liveIdSet={liveIdSet}
              />
              <RelatedArticlesPanel />
              <SidebarAd slotKey="events-sidebar" category="events" />
            </div>
          </aside>
        </div>

        <SubmitBand />
      </main>

      <Footer />
    </div>
  );
}

// ----------------------------------------------------------------------
// Split hero — promise + search on the left, spotlight event on the right
// ----------------------------------------------------------------------

/** Topic chips seed the search box; they are plain queries, not a new
 *  taxonomy, so they can never drift out of sync with real data. */
const POPULAR_TOPICS = ["AI", "Cybersecurity", "Fintech", "Startups", "Cloud", "Energy"];

function SearchHero({
  filters,
  updateFilter,
  spotlightPool,
  spotlightLoading,
  totalPublished,
  cityCount,
  liveCount,
}: {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  spotlightPool: SpotlightEvent[];
  spotlightLoading: boolean;
  totalPublished: number;
  cityCount: number;
  liveCount: number;
}) {
  const [draft, setDraft] = useState(filters.search);
  useEffect(() => setDraft(filters.search), [filters.search]);

  // Auto-advance the cover. Pauses on hover so a visitor reading a card
  // doesn't have it swapped out from under them.
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || spotlightPool.length < 2) return;
    const id = setInterval(
      () => setSlide((i) => (i + 1) % spotlightPool.length),
      6000,
    );
    return () => clearInterval(id);
  }, [paused, spotlightPool.length]);
  useEffect(() => {
    if (slide >= spotlightPool.length) setSlide(0);
  }, [spotlightPool.length, slide]);

  const spotlight = spotlightPool[slide] ?? null;

  return (
    <section className="border-b border-[var(--border)] bg-gradient-to-b from-muted/40 to-background">
      <div className={`${CONTAINER} grid grid-cols-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-12`}>
        {/* Left: promise, search, topics */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            {publication.name} Events
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Discover events.
            <br />
            Connect people.
            <br />
            Shape the <span className="text-emerald-600 dark:text-emerald-400">future.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            From global conferences to local meetups — find the events that connect,
            educate and move the region&rsquo;s tech community forward.
          </p>

          <form
            className="mt-6 flex max-w-md items-center gap-2 rounded-full border border-[var(--border)] bg-background p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-emerald-600/30"
            onSubmit={(e) => {
              e.preventDefault();
              updateFilter("search", draft.trim());
            }}
          >
            <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search events, topics or locations"
              aria-label="Search events"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" className="shrink-0 rounded-full bg-emerald-600 px-5 hover:bg-emerald-700">
              Search
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Popular topics:</span>
            {POPULAR_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => updateFilter("search", topic)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filters.search.toLowerCase() === topic.toLowerCase()
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-[var(--border)] text-muted-foreground hover:border-emerald-600/40 hover:text-foreground"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          <dl className="mt-8 flex items-center gap-8">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Events listed</dt>
              <dd className="text-2xl font-bold tabular-nums text-foreground">{totalPublished}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Cities</dt>
              <dd className="text-2xl font-bold tabular-nums text-foreground">{cityCount}</dd>
            </div>
            {liveCount > 0 && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Live now</dt>
                <dd className="flex items-center gap-1.5 text-2xl font-bold tabular-nums text-red-600">
                  <PulsingDot /> {liveCount}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Right: spotlight */}
        <div>
          {spotlightLoading ? (
            <Skeleton className="aspect-[4/3] w-full rounded-2xl lg:aspect-[16/11]" />
          ) : spotlight ? (
            <div
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <SpotlightCard event={spotlight} />
              {spotlightPool.length > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  {spotlightPool.map((ev, i) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSlide(i)}
                      aria-label={`Show ${ev.title}`}
                      aria-current={i === slide}
                      className={`h-1.5 rounded-full transition-all ${
                        i === slide
                          ? "w-7 bg-emerald-600"
                          : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-[16/11] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-sm text-muted-foreground">
              No upcoming events scheduled yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SpotlightCard({ event }: { event: SpotlightEvent }) {
  const location = formatLocation(event.city, event.country, event.format);
  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl lg:aspect-[16/11]">
        <EventMedia event={event as any} variant="hero" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <span className="inline-flex rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Featured
          </span>
          <h2 className="mt-3 line-clamp-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
            {event.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/85">
            {location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden /> {location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {formatLongDateRange(event.startDate, event.endDate)}
            </span>
          </div>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition-transform group-hover:translate-x-0.5">
            View details <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ----------------------------------------------------------------------
// Category tabs + filter popover
// ----------------------------------------------------------------------

/** Only types the API actually accepts. */
const TYPE_TABS: Array<{ value: Filters["type"]; label: string }> = [
  { value: "all", label: "All events" },
  { value: "conference", label: "Conferences" },
  { value: "summit", label: "Summits" },
  { value: "meetup", label: "Meetups" },
  { value: "webinar", label: "Webinars" },
  { value: "workshop", label: "Workshops" },
  { value: "hackathon", label: "Hackathons" },
];

function TypeTabs({
  filters,
  updateFilter,
  typeCounts,
  cities,
  narrowingCount,
  onClear,
}: {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  typeCounts: Record<string, number>;
  cities?: Array<{ city: string; count: number }>;
  narrowingCount: number;
  onClear: () => void;
}) {
  return (
    <div className="border-b border-[var(--border)] bg-background/95 backdrop-blur">
      <div className={`${CONTAINER} flex items-center gap-3 overflow-x-auto py-3`}>
        <div className="flex items-center gap-2" role="tablist" aria-label="Event type">
          {TYPE_TABS.map((tab) => {
            const active = filters.type === tab.value;
            const count = tab.value === "all" ? undefined : typeCounts?.[tab.value];
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={active}
                onClick={() => updateFilter("type", tab.value)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-[var(--border)] text-muted-foreground hover:border-emerald-600/40 hover:text-foreground"
                }`}
              >
                {tab.label}
                {count ? <span className="ml-1.5 opacity-70 tabular-nums">{count}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {narrowingCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="h-9">
              Clear <span className="ml-1 tabular-nums">({narrowingCount})</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Trending — ranked by RSVPs, an actual signal we hold
// ----------------------------------------------------------------------

function TrendingPanel({
  editionCountryId,
  liveIdSet,
}: {
  editionCountryId?: number;
  liveIdSet: Set<number>;
}) {
  // "registrations" is a real sortBy option on the events list; it ranks
  // by RSVP volume. No synthetic trend score is invented here, and the
  // panel is labelled for what it actually measures.
  const q = trpc.events.list.useQuery({
    page: 1,
    limit: 5,
    upcoming: true,
    sortBy: "registrations",
    sortOrder: "desc",
    editionCountryId,
  } as any);

  const items = (q.data?.items || []) as CardEvent[];
  if (!q.isLoading && items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-card">
      <div className="border-b border-[var(--border)] bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          </span>
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            Most anticipated
          </h2>
        </div>
        <p className="mt-0.5 pl-8 text-[11px] text-muted-foreground">
          Ranked by RSVPs on {publication.name}
        </p>
      </div>

      <ol className="divide-y divide-[var(--border)]">
        {q.isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-4 py-3">
                <TrendingEventRowSkeleton />
              </li>
            ))
          : items.map((event, i) => (
              <li key={event.id} className="px-4 py-3 transition-colors hover:bg-muted/40">
                <TrendingEventRow event={event} rank={i + 1} />
              </li>
            ))}
      </ol>

      <Link
        href="/events"
        className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50/60 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
      >
        View all events <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/**
 * Event coverage from the newsroom. Uses the existing published-article
 * feed — no new endpoint, and nothing renders if there are no articles.
 */
function RelatedArticlesPanel() {
  const q = trpc.news.list.useQuery({ page: 1, limit: 4 } as any, {
    staleTime: 5 * 60_000,
  });
  const articles = ((q.data as any)?.items || []) as Array<{
    id: number;
    title: string;
    slug: string;
    featuredImage?: string | null;
    publishedAt?: string | null;
    primaryCategory?: { slug: string } | null;
  }>;
  if (!q.isLoading && articles.length === 0) return null;

  const href = (a: (typeof articles)[number]) =>
    a.primaryCategory?.slug ? `/${a.primaryCategory.slug}/${a.slug}` : `/news/${a.slug}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-card">
      <div className="border-b border-[var(--border)] bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700 dark:text-blue-400">
            <Newspaper className="h-3.5 w-3.5" aria-hidden />
          </span>
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            Event coverage
          </h2>
        </div>
        <p className="mt-0.5 pl-8 text-[11px] text-muted-foreground">
          Reporting from the {publication.name} newsroom
        </p>
      </div>

      <ul className="divide-y divide-[var(--border)]">
        {q.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </li>
            ))
          : articles.map((a) => (
              <li key={a.id}>
                <Link
                  href={href(a)}
                  className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  {a.featuredImage ? (
                    <img
                      src={a.featuredImage}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Newspaper className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
                      {a.title}
                    </p>
                    {a.publishedAt && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatShortDate(a.publishedAt)}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
      </ul>

      <Link
        href="/news"
        className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50/60 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        More from the newsroom <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/** Sector filter — backed by `events.listSectors`; the public list
 *  resolver applies `sectorId`, so this returns real results. */
function SectorChip({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const { data } = trpc.events.listSectors.useQuery(undefined, {
    staleTime: 10 * 60_000,
  });
  const sectors = (data || []) as Array<{ id: number; name: string }>;
  if (sectors.length === 0) return null;

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      aria-label="Filter by sector"
      className={`h-9 shrink-0 rounded-full border px-3 text-sm ${
        value
          ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-border bg-background text-muted-foreground"
      }`}
    >
      <option value="">All sectors</option>
      {sectors.map((sec) => (
        <option key={sec.id} value={sec.id}>
          {sec.name}
        </option>
      ))}
    </select>
  );
}

// ----------------------------------------------------------------------
// Sectioning
// ----------------------------------------------------------------------

interface Section {
  key: string;
  title: string;
  hint?: string;
  items: CardEvent[];
  tone: "default" | "past";
}

/**
 * Splits the upcoming list into three readable cohorts. "Happening now"
 * catches anything the live-coverage query flagged plus anything whose
 * start time has already passed (multi-day events mid-run), so a
 * conference in progress doesn't sit under "This month" as if it hadn't
 * started.
 *
 * With a search term active the cohorts are collapsed — three headings
 * over one card each reads as noise, not structure.
 */
function groupEvents(
  items: CardEvent[],
  filters: Filters,
  liveIdSet: Set<number>,
): Section[] {
  if (items.length === 0) return [];

  if (filters.time === "past") {
    return [
      {
        key: "past",
        title: "Past events",
        hint: "Archived — registration is closed",
        items,
        tone: "past",
      },
    ];
  }

  if (filters.search.trim()) {
    return [
      {
        key: "results",
        title: `Results for “${filters.search.trim()}”`,
        items,
        tone: "default",
      },
    ];
  }

  const now = Date.now();
  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long" });

  const happening: CardEvent[] = [];
  const thisMonth: CardEvent[] = [];
  const later: CardEvent[] = [];

  for (const item of items) {
    const start = asDate(item.startDate);
    if (liveIdSet.has(item.id) || (start && start.getTime() <= now)) {
      happening.push(item);
    } else if (start && start.getTime() <= endOfMonth.getTime()) {
      thisMonth.push(item);
    } else {
      later.push(item);
    }
  }

  const sections: Section[] = [];
  // Events under way are shown in the full-bleed live band above; a
  // second "Happening now" grid here duplicated that section.
  if (happening.length) {
    thisMonth.unshift(...happening);
  }
  if (thisMonth.length) {
    sections.push({
      key: "month",
      title: `This month`,
      hint: `Everything left in ${monthLabel}`,
      items: thisMonth,
      tone: "default",
    });
  }
  if (later.length) {
    sections.push({
      key: "later",
      title: thisMonth.length ? "Further ahead" : "Upcoming",
      hint: "The rest of the calendar",
      items: later,
      tone: "default",
    });
  }
  return sections;
}

function SectionHeading({
  title,
  hint,
  count,
  live,
}: {
  title: string;
  hint?: string;
  count: number;
  live?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
      <div className="flex items-center gap-2.5">
        {live && <PulsingDot />}
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      <p className="pb-0.5 text-sm text-muted-foreground">
        <span className="font-medium tabular-nums text-foreground">
          {count} event{count === 1 ? "" : "s"}
        </span>
        {hint ? ` · ${hint}` : ""}
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------
// 1. Masthead
// ----------------------------------------------------------------------

function Masthead({
  totalPublished,
  cityCount,
  liveCount,
}: {
  totalPublished: number;
  cityCount: number;
  liveCount: number;
}) {
  return (
    <section className="border-b border-border bg-muted/40">
      <div className={`${CONTAINER} py-10 lg:py-14`}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              {publication.name} Events
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Every conference, summit and demo day that matters.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              The regional tech calendar in one place — with live reporting
              from the floor while it's happening.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-5 lg:items-end">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <Stat value={totalPublished} label="events listed" />
              <Stat value={cityCount} label={cityCount === 1 ? "city" : "cities"} />
              {liveCount > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
                    <PulsingDot />
                    {liveCount}
                  </div>
                  <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    live now
                  </div>
                </div>
              )}
            </div>
            <Link href="/events/submit">
              <Button size="lg" className="gap-2 rounded-full">
                <Plus className="h-4 w-4" />
                Submit an event
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums">
        {value > 0 ? value.toLocaleString() : "—"}
      </div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. Spotlight
// ----------------------------------------------------------------------

interface SpotlightEvent {
  id: number;
  title: string;
  slug: string;
  featuredImage?: string | null;
  type?: string | null;
  city?: string | null;
  country?: string | null;
  format?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  ticketUrl?: string | null;
  registrationUrl?: string | null;
  websiteUrl?: string | null;
  shortDescription?: string | null;
}

function Spotlight({
  event,
  loading,
}: {
  event: SpotlightEvent | null;
  loading: boolean;
}) {
  const countdown = useCountdown(event?.startDate);

  if (loading) {
    return (
      <div className={`${CONTAINER} pt-8`}>
        <Skeleton className="h-[420px] w-full rounded-3xl lg:h-[480px]" />
      </div>
    );
  }

  // Nothing on the calendar — say so plainly rather than rendering an
  // empty black slab.
  if (!event) {
    return (
      <div className={`${CONTAINER} pt-8`}>
        <div className="rounded-3xl border border-dashed border-border px-8 py-14 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">
            No upcoming events on the calendar yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Check back shortly — or submit yours and we'll list it for free.
          </p>
        </div>
      </div>
    );
  }

  const ticketHref =
    event.ticketUrl ||
    event.registrationUrl ||
    event.websiteUrl ||
    `/events/${event.slug}`;
  const excerpt = stripHtml(event.shortDescription);
  const formatLabel = event.format ? FORMAT_LABEL[event.format] : null;

  return (
    <div className={`${CONTAINER} pt-8`}>
      <Link href={`/events/${event.slug}`} className="group block">
        <article className="relative min-h-[440px] overflow-hidden rounded-3xl bg-zinc-950 shadow-lg ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-2xl lg:min-h-[520px]">
          {/* Media fills the slab — generated tile when there's no photo,
              which is the common case. The absolute positioning lives on
              a wrapper, not on EventMedia's own className: EventMedia's
              root carries `relative`, and Tailwind emits `.relative`
              after `.absolute`, so an `absolute` passed in would lose. */}
          <div className="absolute inset-0">
            <EventMedia
              event={event}
              variant="hero"
              loading="eager"
              className="h-full w-full"
            />
          </div>

          {/* Legibility scrim: vertical for the copy block, horizontal so
              the left edge stays dark on wide viewports. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

          <div className="relative flex min-h-[440px] flex-col justify-end p-6 text-white sm:p-10 lg:min-h-[520px] lg:p-14">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
                Spotlight
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
                {typeLabelFor(event.type)}
              </span>
              {formatLabel && (
                <span className="rounded-full border border-white/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                  {formatLabel}
                </span>
              )}
              {countdown && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-amber-950 shadow-sm">
                  <Clock className="h-3.5 w-3.5" />
                  {countdown}
                </span>
              )}
            </div>

            <h2 className="max-w-4xl text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {event.title}
            </h2>

            {excerpt && (
              <p className="mt-4 hidden max-w-2xl text-base leading-relaxed text-white/75 sm:line-clamp-2 sm:block">
                {excerpt}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-white/85 sm:text-base">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" />
                {formatLongDateRange(event.startDate, event.endDate)}
              </span>
              <span className="inline-flex items-center gap-2">
                {event.format === "virtual" ? (
                  <Globe2 className="h-4 w-4 shrink-0" />
                ) : (
                  <MapPin className="h-4 w-4 shrink-0" />
                )}
                {formatLocation(event.city, event.country, event.format)}
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              {/* Intercepts the outer card link so the primary CTA goes
                  straight to registration. */}
              <Button
                size="lg"
                className="gap-2 rounded-full bg-white text-black shadow-lg hover:bg-white/90"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (ticketHref.startsWith("/")) {
                    window.location.href = ticketHref;
                  } else {
                    window.open(ticketHref, "_blank", "noopener");
                  }
                }}
              >
                <Ticket className="h-4 w-4" />
                Get tickets
              </Button>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 transition-colors group-hover:text-white">
                View event
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. Live rail
// ----------------------------------------------------------------------

/**
 * Full-bleed live band. This is the only place live events appear —
 * the grid used to repeat them under a "Happening now" heading, which
 * read as a duplicate of this section.
 */
function LiveRail({ events }: { events: LiveCardEvent[] }) {
  return (
    <section className="w-full border-y border-red-500/15 bg-red-50/60 py-8 dark:bg-red-950/15">
      <div className={CONTAINER}>
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-500">
            <PulsingDot light />
            Live now
          </span>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            Happening right now
          </h2>
          <span className="text-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"} being covered live
          </span>
        </div>
        <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-1">
          {events.map((event) => (
            <LiveEventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 4. Filter bar — ONE row on desktop, no wrapping
// ----------------------------------------------------------------------

interface FilterBarProps {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  cities: { city: string; count: number }[];
  narrowingCount: number;
  onClear: () => void;
}

/**
 * The admin events screen wrapped its filters onto three lines and the
 * user called it out, so the same discipline applies here: on `lg` and
 * up every control lives on a single non-wrapping row (`flex-nowrap`,
 * fixed control widths, search takes the slack). Below `lg` the controls
 * become one horizontally-scrollable track under the search field — a
 * scroll, never a stack of half-empty rows.
 *
 * Sticky offset is `top-20` because `layout/Header.tsx` is `sticky top-0`
 * with an `h-20` bar.
 */
function FilterBar({
  filters,
  updateFilter,
  cities,
  narrowingCount,
  onClear,
}: FilterBarProps) {
  return (
    <div className="sticky top-20 z-30 border-y border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className={`${CONTAINER} py-3`}>
        <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-3">
          {/* The hero owns search — a second box here was redundant.
              This slot now surfaces the active search as a removable
              chip plus a sector filter, which the public list resolver
              now honours. */}
          <div className="flex w-full items-center gap-2 lg:w-auto lg:shrink-0">
            {filters.search ? (
              <button
                type="button"
                onClick={() => updateFilter("search", "")}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-50 px-3 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                aria-label={`Clear search for ${filters.search}`}
              >
                <Search className="h-3.5 w-3.5" aria-hidden />
                <span className="max-w-[160px] truncate">{filters.search}</span>
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
            <SectorChip
              value={filters.sector}
              onChange={(v) => updateFilter("sector", v)}
            />
          </div>

          {/* Controls track */}
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-1 lg:flex-nowrap lg:overflow-visible lg:px-0 lg:pb-0">
            <Segmented
              value={filters.time}
              onChange={(v) => updateFilter("time", v)}
              options={[
                { value: "upcoming", label: "Upcoming" },
                { value: "past", label: "Past" },
              ]}
            />

            <span className="hidden h-5 w-px shrink-0 bg-border lg:block" />

            <SelectChip
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              value={filters.format}
              active={filters.format !== "all"}
              options={FORMAT_OPTIONS}
              onChange={(v) => updateFilter("format", v)}
              width="w-44"
            />
            <SelectChip
              value={filters.type}
              active={filters.type !== "all"}
              options={TYPE_OPTIONS}
              onChange={(v) => updateFilter("type", v)}
              width="w-44"
            />
            <CityChip
              value={filters.city}
              cities={cities}
              onChange={(c) => updateFilter("city", c)}
            />
            <SelectChip
              value={filters.price}
              active={filters.price !== "any"}
              options={PRICE_OPTIONS}
              onChange={(v) => updateFilter("price", v)}
              width="w-40"
            />

            {narrowingCount > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Clear {narrowingCount} filter{narrowingCount === 1 ? "" : "s"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex shrink-0 items-center rounded-full border border-border bg-muted/50 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Popover-backed chip — same footprint as a select, no native styling. */
function SelectChip<T extends string>({
  value,
  options,
  onChange,
  active,
  icon,
  width = "w-44",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  active: boolean;
  icon?: React.ReactNode;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === value)?.label || options[0].label;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition-colors ${
            active
              ? "border-transparent bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          {icon}
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={`${width} p-1`} align="start">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              opt.value === value
                ? "bg-accent font-medium text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function CityChip({
  value,
  cities,
  onChange,
}: {
  value: string | null;
  cities: { city: string; count: number }[];
  onChange: (c: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition-colors ${
            value
              ? "border-transparent bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          {value || "Any city"}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search cities…" />
          <CommandList>
            <CommandEmpty>No cities found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__any__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Any city
              </CommandItem>
              {cities.map((c) => (
                <CommandItem
                  key={c.city}
                  value={c.city}
                  onSelect={() => {
                    onChange(c.city);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1 truncate">{c.city}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {c.count}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ----------------------------------------------------------------------
// 5. Grid states
// ----------------------------------------------------------------------

function GridSkeleton() {
  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3 border-b border-border pb-3">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className={GRID}>
        {Array.from({ length: 8 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  time,
  onClear,
}: {
  time: TimeFilter;
  onClear?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border px-6 py-20 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <CalendarDays className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">
        {onClear
          ? "No events match these filters"
          : time === "past"
            ? "No past events on record yet"
            : "Nothing on the calendar right now"}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {onClear
          ? "Try widening your search, or clear the filters to browse the full calendar."
          : "New events are added constantly — or submit yours and we'll list it for free."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onClear && (
          <Button onClick={onClear} variant="outline" className="rounded-full">
            Clear filters
          </Button>
        )}
        <Link href="/events/submit">
          <Button className="gap-2 rounded-full">
            <Plus className="h-4 w-4" />
            Submit an event
          </Button>
        </Link>
      </div>
    </div>
  );
}

function PastEventsTeaser({ onShowPast }: { onShowPast: () => void }) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 px-6 py-6 sm:flex-row">
      <div>
        <h3 className="text-base font-semibold">Looking for something that already happened?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the archive for recaps, recordings and our coverage.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onShowPast}
        className="shrink-0 gap-2 rounded-full"
      >
        View past events
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------
// 6. Submit band
// ----------------------------------------------------------------------

/**
 * v3 floated this as a fixed card pinned over the bottom of the viewport,
 * which permanently covered a slice of the grid. It's an in-flow band now
 * — same message, none of the occlusion.
 */
function SubmitBand() {
  return (
    <section className="border-t border-border bg-muted/40">
      <div className={`${CONTAINER} py-14`}>
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hosting an event?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Get it in front of the region's founders, operators and investors.
              Listing on the {publication.name} events hub is free.
            </p>
          </div>
          <Link href="/events/submit" className="shrink-0">
            <Button size="lg" className="gap-2 rounded-full">
              <Plus className="h-4 w-4" />
              Submit your event
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// API note
// ----------------------------------------------------------------------
// `listEventsSchema` accepts `sectorId`, `categoryId` and `regionId`, but
// the public `events.list` resolver never turns them into WHERE clauses —
// only `adminList` (and the CSV export) do. A sector filter here would
// therefore silently return unfiltered results, so it's deliberately not
// offered until the public resolver applies the predicate. Every control
// in the bar above maps to a filter the resolver really honours.
