/**
 * EventLive — public live-coverage page (Reuters-style live blog).
 *
 * Route: /events/:slug/live
 *
 * Layout:
 *   - Sticky top bar (below the site header): event title, live status
 *     badge (LIVE / Replay / Starting soon + countdown), update count,
 *     link back to the event page.
 *   - "Key moments" horizontal rail of pinned posts — navigation chips
 *     that scroll to the post's card in the feed.
 *   - Main feed, newest-first. Initial load via listLivePosts, then a
 *     25s delta poll (since = newest publishedAt seen). New posts are
 *     buffered behind a floating "N new updates" pill so the reader's
 *     scroll position never jumps.
 *   - Right sidebar (lg+): event info card + about link.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calendar,
  MapPin,
  Pin,
  Radio,
} from "lucide-react";

import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";
import {
  getEventLiveStatus,
  type EventLiveStatus,
} from "@/lib/eventLive";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import LivePostCard, { type LivePost } from "@/components/events/LivePostCard";

const POLL_MS = 25_000;

// ----------------------------------------------------------------
// Small local helpers
// ----------------------------------------------------------------

function formatEventDate(d: string | Date | null | undefined): string {
  if (!d) return "Date TBA";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): string {
  if (!start) return "TBA";
  const s = new Date(start);
  const startStr = s.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!end) return startStr;
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) return startStr;
  return `${startStr} – ${e.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

/** Compact countdown string, re-rendering every 30s. */
function useCountdown(target: string | Date | null | undefined): string {
  const [, force] = useState(0);
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => force((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return "";
  const ms = new Date(target).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "starting now";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

function chipLabel(p: LivePost): string {
  const text =
    p.headline ||
    p.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ||
    p.postType;
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

function StatusBadge({
  status,
  countdown,
}: {
  status: EventLiveStatus;
  countdown: string;
}) {
  if (status === "live") {
    return (
      <Badge className="bg-red-600 text-white border-transparent flex items-center gap-1.5 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        LIVE
      </Badge>
    );
  }
  if (status === "post") {
    return (
      <Badge variant="secondary" className="shrink-0 text-muted-foreground">
        Replay
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-600 text-white border-transparent shrink-0">
      Starting soon{countdown ? ` · ${countdown}` : ""}
    </Badge>
  );
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function EventLive() {
  const { slug } = useParams<{ slug: string }>();

  const { data: event, isLoading, error } = trpc.events.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug },
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 space-y-4 max-w-3xl">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Event Not Found" noindex />
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <Radio className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Event Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/events">
            <Button>Back to Events</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return <EventLiveContent event={event as any} />;
}

function EventLiveContent({ event }: { event: any }) {
  const status = getEventLiveStatus(event);
  const countdown = useCountdown(event.startDate);
  const liveUrl = `${publication.siteUrl}/events/${event.slug}/live`;

  // ------------------------------------------------------------
  // Feed state — initial load, then buffered delta polling.
  // ------------------------------------------------------------
  const utils = trpc.useUtils();
  const initialQ = trpc.events.listLivePosts.useQuery(
    { eventId: event.id },
    { enabled: !!event.id, refetchOnWindowFocus: false },
  );

  const [posts, setPosts] = useState<LivePost[] | null>(null);
  const [pending, setPending] = useState<LivePost[]>([]);

  // Seed local state from the initial fetch exactly once.
  useEffect(() => {
    if (initialQ.data && posts === null) {
      setPosts(initialQ.data as LivePost[]);
    }
  }, [initialQ.data, posts]);

  // Track known ids + newest publishedAt for the delta poll without
  // recreating the interval on every feed change.
  const knownIdsRef = useRef<Set<number>>(new Set());
  const newestRef = useRef<string | null>(null);
  useEffect(() => {
    const ids = new Set<number>();
    let newest: string | null = null;
    for (const p of [...(posts ?? []), ...pending]) {
      ids.add(p.id);
      if (!newest || p.publishedAt > newest) newest = p.publishedAt;
    }
    knownIdsRef.current = ids;
    newestRef.current = newest;
  }, [posts, pending]);

  const feedReady = posts !== null;
  useEffect(() => {
    if (!event.id || !feedReady) return;
    const id = setInterval(async () => {
      try {
        const since = newestRef.current;
        const rows = (await utils.events.listLivePosts.fetch(
          since ? { eventId: event.id, since } : { eventId: event.id },
          { staleTime: 0 },
        )) as LivePost[];
        if (!rows || rows.length === 0) return;

        // Refresh rows we already render (pin toggles, edits) in place —
        // that never moves the scroll.
        const byId = new Map(rows.map((r) => [r.id, r]));
        setPosts((prev) =>
          prev ? prev.map((p) => byId.get(p.id) ?? p) : prev,
        );

        // Genuinely new posts wait in the buffer behind the pill.
        const fresh = rows.filter((r) => !knownIdsRef.current.has(r.id));
        if (fresh.length > 0) {
          setPending((prev) => [
            ...fresh.filter((f) => !prev.some((p) => p.id === f.id)),
            ...prev,
          ]);
        }
      } catch {
        // Poll errors are silent — next tick retries.
      }
    }, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, feedReady]);

  const mergePending = () => {
    if (pending.length === 0) return;
    const buffered = pending;
    setPosts((prev) => {
      const merged = [...buffered, ...(prev ?? [])];
      merged.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
      return merged;
    });
    setPending([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Feed order: strictly newest-first. Pinned posts keep their
  // chronological slot (with pin styling) — the rail is the shortcut.
  const feed = useMemo(() => {
    const list = [...(posts ?? [])];
    list.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
    return list;
  }, [posts]);

  const pinnedPosts = useMemo(
    () => feed.filter((p) => !!p.isPinned),
    [feed],
  );

  const scrollToPost = (id: number) => {
    document
      .getElementById(`live-post-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const where = [event.venueName || event.venue, event.city, event.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${event.title} — Live Coverage`}
        description={
          event.shortDescription ||
          `Live updates, funding announcements, and key moments from ${event.title}.`
        }
        canonical={liveUrl}
      />
      <Header />

      {/* ---------------- Sticky status bar ---------------- */}
      <div className="sticky top-20 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link
            href={`/events/${event.slug}`}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Back to event page"
            title="Back to event page"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-semibold truncate min-w-0">{event.title}</h1>
          <StatusBadge status={status} countdown={countdown} />
          <span className="ml-auto text-xs text-muted-foreground shrink-0 hidden sm:inline">
            {feed.length} update{feed.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* ---------------- New-updates pill ---------------- */}
      {pending.length > 0 && (
        <button
          type="button"
          onClick={mergePending}
          className="fixed left-1/2 -translate-x-1/2 top-36 z-50 flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition"
        >
          <ArrowUp className="h-4 w-4" />
          {pending.length} new update{pending.length === 1 ? "" : "s"}
        </button>
      )}

      <main className="container mx-auto px-4 py-6 lg:py-8">
        {/* ---------------- Key moments rail ---------------- */}
        {pinnedPosts.length > 0 && (
          <section className="mb-6" aria-label="Key moments">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              <Pin className="h-3.5 w-3.5 text-amber-500" />
              Key moments
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {pinnedPosts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => scrollToPost(p.id)}
                  className="snap-start shrink-0 max-w-[16rem] rounded-full border bg-card hover:bg-muted px-3.5 py-1.5 text-sm text-left truncate transition"
                  title={chipLabel(p)}
                >
                  {chipLabel(p)}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
          {/* ---------------- Feed ---------------- */}
          <section aria-label="Live feed" className="min-w-0">
            {!feedReady ? (
              <div className="space-y-3">
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-36 w-full" />
              </div>
            ) : feed.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <Radio className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-semibold">
                    Live coverage starts soon
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Our correspondents will start posting from{" "}
                    <span className="font-medium text-foreground">
                      {event.title}
                    </span>{" "}
                    on {formatEventDate(event.startDate)}. Check back here for
                    breaking news, funding announcements, and key moments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-3">
                {feed.map((p) => (
                  <li key={p.id}>
                    <LivePostCard post={p} eventSlug={event.slug} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------------- Sidebar ---------------- */}
          <aside className="hidden lg:block space-y-4 lg:sticky lg:top-36">
            <Card className="overflow-hidden">
              {event.featuredImage && (
                <img
                  src={event.featuredImage}
                  alt={event.title}
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              )}
              <CardContent className="p-5 space-y-3">
                <h2 className="font-semibold leading-tight">{event.title}</h2>
                {event.shortDescription && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {event.shortDescription}
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>
                      {formatShortDateRange(event.startDate, event.endDate)}
                    </span>
                  </div>
                  {where && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{where}</span>
                    </div>
                  )}
                </div>
                <Link href={`/events/${event.slug}`} className="block pt-1">
                  <Button variant="outline" className="w-full gap-2">
                    About this event
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
