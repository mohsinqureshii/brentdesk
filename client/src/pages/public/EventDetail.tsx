/**
 * Event Detail page — v4 rebuild (full-width, sectioned, emerald accent).
 * ======================================================================
 *
 * The sticky right rail is gone. The page now reads top-to-bottom as a
 * sequence of full-width sections:
 *
 *   1. HERO          split ~45/55 — copy on the left, a slanted photo
 *                    collage on the right (gradient tiles when the event
 *                    has no photography, which is the normal case).
 *   2. LIVE BAND     live mode only — lead live post + what's up next.
 *   3. TAB BAR       full-width underline tabs with icons.
 *   4. OVERVIEW      editorial column + a 2×3 stats grid.
 *   5. SPEAKERS      a row of portrait cards + "+N more".
 *   6. AGENDA        day tabs and a session preview beside the venue.
 *   7. AROUND        side events / tracks / highlights as image cards.
 *   8. FOLLOW BAND   RSVP + newsletter beside our own coverage.
 *
 * Sections 4–8 are the Overview tab panel; the remaining tabs keep their
 * own panels (Speakers, Tickets, Agenda, Side Events, Venue, FAQs, plus
 * Live or Recap depending on mode).
 *
 * The page still auto-switches between three display modes resolved
 * server-side (`resolveEventMode`, server/services/eventMode.service.ts):
 *
 *   pre   — marketing landing (the layout above).
 *   live  — plus the live-coverage banner, the live band and a "Live"
 *           tab holding the reverse-chrono feed; emits LiveBlogPosting.
 *   post  — plus a "Recap" tab (stats, recordings, photos, recap CTA);
 *           emits VideoObject per recording; no countdown.
 *
 * DATA HONESTY: every figure on this page maps to a column that is
 * actually populated. The stats grid only renders fields that are
 * non-null, the "Around" row renders nothing when the event has no side
 * events / tracks / highlights, and the live band counts real live posts
 * — there is no viewer telemetry anywhere in this product, so no
 * "watching" figure is ever shown.
 *
 * Tabs are NOT the Radix primitive: every panel stays in the document
 * and is hidden with the `hidden` attribute, so a crawler (or a reader
 * with JS off after hydration) sees agenda, speakers and FAQ markup
 * regardless of which tab is selected.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtNumber } from "@/lib/dates";
import { Link, useParams } from "wouter";
import {
  Calendar,
  CalendarDays,
  MapPin,
  Users,
  Clock,
  Ticket,
  Globe,
  Info,
  Star,
  Play,
  ExternalLink,
  Linkedin,
  Twitter,
  Check,
  ArrowRight,
  Radio,
  Quote,
  Zap,
  Camera,
  DollarSign,
  Mic2,
  HelpCircle,
  ChevronRight,
  Rss,
  Share2,
  Navigation,
  PartyPopper,
} from "lucide-react";

import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import { stripHtml, sanitizeHtml, looksLikeHtml } from "@/lib/sanitizeHtml";
import { isEventLive } from "@/lib/eventLive";
import { useBrowsingTracker } from "@/hooks/useBrowsingTracker";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InContentAd } from "@/components/ads/AdUnit";
import TicketCheckoutDialog from "@/components/events/TicketCheckoutDialog";
import { EntityShareIntents } from "@/components/events/EventShareButtons";
import EventAgenda from "@/components/events/EventAgenda";
import EventFaqs from "@/components/events/EventFaqs";
import EventSponsors, {
  SponsorTierGrid,
} from "@/components/events/EventSponsors";
import EventCoverage from "@/components/events/EventCoverage";
import EventSideEvents from "@/components/events/EventSideEvents";
import EventTabBar, {
  tabButtonId,
  tabPanelId,
  type EventTab,
} from "@/components/events/EventTabBar";
import {
  EventCard,
  EventCardSkeleton,
  asDate,
  type CardEvent,
} from "@/components/events/EventCard";
import EventHeroSection from "@/components/events/EventHeroSection";
import EventLiveBand from "@/components/events/EventLiveBand";
import EventOverviewSplit from "@/components/events/EventOverviewSplit";
import EventFeaturedSpeakers from "@/components/events/EventFeaturedSpeakers";
import EventAgendaPreview from "@/components/events/EventAgendaPreview";
import EventAroundSection, {
  buildAroundCards,
} from "@/components/events/EventAroundSection";
import EventFollowBand from "@/components/events/EventFollowBand";
import EventSidebar from "@/components/events/EventSidebar";
import { EventPhotoStrip } from "@/components/events/EventCollage";
import {
  CONTAINER,
  attendanceModeFor,
  buildDirectionsUrl,
  compactCountdown,
  externalTicketUrlOf,
  formatCurrency,
  isEmbeddableMapUrl,
  isExternalProvider,
  ProviderBadge,
  resolveTicketUrl,
  useExternalTicketClick,
  useNow,
  venueParts,
  type EventRow,
} from "@/components/events/eventMeta";
import {
  RichText,
  formatDate,
  formatTime,
  initialsOf,
} from "@/components/events/eventFormat";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type EventMode = "pre" | "live" | "post";

// The query response is wide and changes often — keep this loose. We
// only narrow when we touch a specific field. (`EventRow` comes from
// components/events/eventMeta so the section components share it.)
type TicketRow = any;
type LivePostRow = any;

// NOTE: formatDate / formatTime / initialsOf / RichText live in
// `@/components/events/eventFormat`; dates, durations, venue links,
// ticket-provider resolution and the countdown clock live in
// `@/components/events/eventMeta`, so every section component renders
// them exactly the same way this page does.

// ----------------------------------------------------------------
// FAQ helper — the events table stores FAQs in their own table now
// (events.getFaqs); the legacy `faqs` JSON column is still read as a
// fallback for rows that predate the editor UI. An empty result means
// no FAQ tab and no FAQPage schema emission.
// ----------------------------------------------------------------

function getFaqs(event: EventRow): Array<{ question: string; answer: string }> {
  const raw = (event as any)?.faqs;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((f) => f && f.question && f.answer)
      .map((f) => ({ question: String(f.question), answer: String(f.answer) }));
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? getFaqs({ faqs: parsed }) : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ================================================================
// Page entry point
// ================================================================

export default function EventDetail() {
  const t = useT();
  // The route uses /events/:id but the value is actually the slug
  // (matches the old URL contract — don't change without a redirect).
  const { id: slug } = useParams<{ id: string }>();

  const { data: event, isLoading, error } = trpc.events.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug },
  );

  useBrowsingTracker(
    event
      ? {
          contentType: "event",
          contentId: event.id,
          contentTitle: event.title,
          contentSlug: event.slug,
          contentCategory: (event as any).type || "",
        }
      : null,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <EventDetailSkeleton />
        <Footer />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title={t("state.eventNotFound")} noindex />
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {t("state.eventNotFound")}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("event.notFoundBody")}
          </p>
          <Link href="/events">
            <Button>{t("state.backToEvents")}</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const mode: EventMode = ((event as any).mode as EventMode) || "pre";

  return <EventDetailContent event={event as EventRow} mode={mode} />;
}

/** Mirrors the v4 anatomy so the page doesn't jump when data lands. */
function EventDetailSkeleton() {
  return (
    <div className={`${CONTAINER} py-8`}>
      <Skeleton className="h-4 w-64" />

      {/* hero: copy beside the collage */}
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-14">
        <div className="space-y-5">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <Skeleton className="h-16 w-[90%]" />
          <Skeleton className="h-16 w-[70%]" />
          <Skeleton className="h-6 w-[55%]" />
          <div className="flex gap-10 pt-2">
            <Skeleton className="h-14 w-44" />
            <Skeleton className="h-14 w-44" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-12 w-40 rounded-lg" />
            <Skeleton className="h-12 w-36 rounded-lg" />
          </div>
        </div>
        <div className="grid h-[26rem] grid-cols-2 grid-rows-2 gap-3 sm:h-[30rem] lg:h-[34rem]">
          <Skeleton className="row-span-2 h-full w-full rounded-2xl" />
          <Skeleton className="h-full w-full rounded-2xl" />
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
      </div>

      {/* tab bar */}
      <Skeleton className="mt-16 h-12 w-full" />

      {/* overview split */}
      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-16">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-[90%]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[70%]" />
        </div>
        <div className="grid grid-cols-2 gap-px lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Shell (SEO + schema + layout)
// ================================================================

function EventDetailContent({ event, mode }: { event: EventRow; mode: EventMode }) {
  const eventUrl = `${publication.siteUrl}/events/${event.slug}`;

  // FAQs live in their own table (events.getFaqs). Resolving them here —
  // rather than inside the accordion — keeps a single source for the
  // FAQPage JSON-LD below and for the FAQ tab's visibility.
  const { data: faqRows = [] } = trpc.events.getFaqs.useQuery(
    { eventId: event.id },
    { enabled: !!event.id },
  );
  const faqs = useMemo(() => {
    const fromDb = (faqRows as any[]).map((f) => ({
      question: String(f.question),
      answer: String(f.answer),
    }));
    return fromDb.length > 0 ? fromDb : getFaqs(event);
  }, [faqRows, event]);

  // Image fallback chain: featured → first gallery → site default.
  const heroImage =
    event.featuredImage ||
    (event.gallery && event.gallery[0]?.imageUrl) ||
    "/assets/og-image.png";

  // Event JSON-LD — required by Google's rich-result spec. We always
  // populate offers + performer + image so GSC stops flagging.
  const eventSchema = useMemo(() => {
    const performer =
      (event.speakers || []).slice(0, 12).map((s: any) => ({
        "@type": "Person" as const,
        name: s.name,
        jobTitle: s.title || undefined,
        image: s.photo || undefined,
      })) || [];

    const offers = (() => {
      const url = resolveTicketUrl(event) || eventUrl;
      if (event.isFree) {
        return {
          "@type": "Offer" as const,
          price: "0",
          priceCurrency: event.ticketCurrency || "USD",
          availability: "https://schema.org/InStock",
          url,
          validFrom: event.publishedAt || event.createdAt || undefined,
        };
      }
      if (event.ticketPrice) {
        return {
          "@type": "Offer" as const,
          price: String(event.ticketPrice),
          priceCurrency: event.ticketCurrency || "USD",
          availability:
            mode === "post"
              ? "https://schema.org/SoldOut"
              : "https://schema.org/InStock",
          url,
          validFrom: event.publishedAt || event.createdAt || undefined,
        };
      }
      // No price set — emit a 0 offer so the schema still passes.
      return {
        "@type": "Offer" as const,
        price: "0",
        priceCurrency: event.ticketCurrency || "USD",
        availability:
          mode === "post"
            ? "https://schema.org/SoldOut"
            : "https://schema.org/InStock",
        url,
        validFrom: event.publishedAt || event.createdAt || undefined,
      };
    })();

    return {
      name: event.title,
      description:
        stripHtml(event.shortDescription || event.description) ||
        `${event.title} — ${event.type || "event"}`,
      startDate: event.startDate,
      endDate: event.endDate || event.startDate,
      location: {
        name: event.venueName || event.venue || event.city || "TBA",
        address: event.venueAddress || event.address || event.addressLine || undefined,
      },
      image: heroImage,
      organizer: {
        name: event.organizerName || publication.name,
        url: event.organizerWebsite || publication.siteUrl,
      },
      performer,
      offers,
      eventStatus: "EventScheduled" as const,
      eventAttendanceMode: attendanceModeFor(event.format),
      url: eventUrl,
    };
  }, [event, mode, heroImage, eventUrl]);

  const breadcrumbs = [
    { name: "Home", url: `${publication.siteUrl}/` },
    { name: "Events", url: `${publication.siteUrl}/events` },
    { name: event.title, url: eventUrl },
  ];

  // No overflow clipping on this shell: `overflow-x-hidden` here turns it
  // into the scroll container for everything inside, which silently
  // disables `position: sticky` on the sidebar. The one thing that needs
  // clipping — the hero banner's bleed past the right margin — clips
  // itself inside EventHeroSection.
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={event.title}
        description={
          stripHtml(event.shortDescription || event.description).slice(0, 160) ||
          `${event.title} — event details, speakers, agenda, and tickets.`
        }
        canonical={eventUrl}
        // Always use the dynamic per-event OG endpoint instead of
        // event.featuredImage. This keeps the social card on-brand
        // (date + title + venue overlay) even for events without a
        // cover image, and survives admins swapping the featured image.
        ogImage={`${publication.siteUrl}/events/${event.slug}/og.png`}
      />
      <JsonLd type="Event" data={eventSchema} />
      <JsonLd type="BreadcrumbList" data={breadcrumbs} />
      {faqs.length > 0 && (
        <JsonLd
          type="FAQPage"
          data={{
            // Answers are CMS rich text — Google wants prose in the
            // schema payload, so the markup is stripped here while the
            // on-page accordion renders the sanitised HTML.
            questions: faqs.map((f) => ({
              question: f.question,
              answer: stripHtml(f.answer),
            })),
          }}
        />
      )}

      <Header />

      <EventPageLayout
        event={event}
        mode={mode}
        faqs={faqs}
        eventUrl={eventUrl}
      />

      <Footer />
    </div>
  );
}

// ================================================================
// Layout
// ================================================================

const BASE_TAB_ORDER = [
  "overview",
  "live",
  "recap",
  "speakers",
  "agenda",
  "tickets",
  "side-events",
  "venue",
  "faq",
] as const;

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: Info,
  live: Radio,
  recap: Play,
  speakers: Mic2,
  agenda: CalendarDays,
  tickets: Ticket,
  "side-events": PartyPopper,
  venue: MapPin,
  faq: HelpCircle,
};

function EventPageLayout({
  event,
  mode,
  faqs,
  eventUrl,
}: {
  event: EventRow;
  mode: EventMode;
  faqs: Array<{ question: string; answer: string }>;
  eventUrl: string;
}) {
  const t = useT();
  const eventId = event.id as number;

  // ------------------------------------------------------------ data
  // Each of these has a same-shape fallback on the `getBySlug` payload,
  // so the panels render immediately and refine when the dedicated
  // queries land — no empty flash, no layout jump.
  const galleryQ = trpc.events.getGallery.useQuery(
    { eventId },
    { enabled: !!eventId },
  );
  const speakersQ = trpc.events.getSpeakers.useQuery(
    { eventId },
    { enabled: !!eventId },
  );
  const highlightsQ = trpc.events.getHighlights.useQuery(
    { eventId },
    { enabled: !!eventId },
  );
  const sideEventsQ = trpc.events.getSideEvents.useQuery(
    { eventId },
    { enabled: !!eventId },
  );
  const ticketsQ = trpc.events.listTickets.useQuery(
    { eventId },
    { enabled: !!eventId },
  );

  // `useMemo` here isn't a performance flourish: these arrays feed effect
  // dependency lists further down (the collage rebuilds its slides when
  // `rows` changes identity), so a fresh `[]` on every render would loop.
  const gallery = useMemo<any[]>(
    () => (galleryQ.data as any[]) ?? event.gallery ?? [],
    [galleryQ.data, event.gallery],
  );
  const speakers = useMemo<any[]>(
    () => (speakersQ.data as any[]) ?? event.speakers ?? [],
    [speakersQ.data, event.speakers],
  );
  const highlights = useMemo<any[]>(
    () => (highlightsQ.data as any[]) ?? event.highlights ?? [],
    [highlightsQ.data, event.highlights],
  );
  const sideEvents = useMemo<any[]>(
    () => (sideEventsQ.data as any[]) ?? event.sideEvents ?? [],
    [sideEventsQ.data, event.sideEvents],
  );
  const tickets = useMemo<any[]>(
    () => (ticketsQ.data as any[]) ?? [],
    [ticketsQ.data],
  );
  const tracks: any[] = event.tracks || [];
  const schedule: any[] = event.schedule || [];

  // Live posts drive the live feed, the live band, the banner's update
  // count and the post-mode recap stats. Only fetched for the modes that
  // show them.
  const livePostsQ = trpc.events.listLivePosts.useQuery(
    { eventId },
    {
      enabled: mode !== "pre",
      refetchInterval: mode === "live" ? 30_000 : false,
      refetchOnWindowFocus: mode === "live",
    },
  );
  const livePosts: any[] = (livePostsQ.data as any[]) ?? [];
  const dealCount = livePosts.filter((p: any) => p.postType === "funding").length;

  // ------------------------------------------------------------ tabs
  const externalUrl = externalTicketUrlOf(event);
  const hasTickets = tickets.length > 0 || !!externalUrl;
  const hasVenue = venueParts(event).length > 0;

  const tabs: EventTab[] = useMemo(() => {
    const defs: Record<string, { label: string; show: boolean }> = {
      overview: { label: t("event.tabOverview"), show: true },
      live: { label: t("event.tabLive"), show: mode === "live" },
      recap: { label: t("event.tabRecap"), show: mode === "post" },
      speakers: { label: t("event.tabSpeakers"), show: speakers.length > 0 },
      agenda: { label: t("event.tabAgenda"), show: schedule.length > 0 },
      tickets: { label: t("event.tabTickets"), show: hasTickets },
      // The side-events panel carries the public "host a side event"
      // submission form, so it stays available for events that haven't
      // happened yet even with nothing listed.
      "side-events": {
        label: t("event.tabSideEvents"),
        show: sideEvents.length > 0 || mode !== "post",
      },
      venue: { label: t("event.tabVenue"), show: hasVenue },
      faq: { label: t("event.tabFaqs"), show: faqs.length > 0 },
    };
    return BASE_TAB_ORDER.filter((id) => defs[id]?.show).map((id) => ({
      id,
      label: defs[id].label,
      icon: TAB_ICONS[id],
    }));
  }, [
    t,
    mode,
    speakers.length,
    hasTickets,
    schedule.length,
    sideEvents.length,
    hasVenue,
    faqs.length,
  ]);

  const [requestedTab, setRequestedTab] = useState<string>(() => {
    if (typeof window === "undefined") return "overview";
    const hash = window.location.hash.replace("#", "");
    return (BASE_TAB_ORDER as readonly string[]).includes(hash) ? hash : "overview";
  });

  // A deep link can point at a tab whose data hasn't loaded yet (or that
  // this event doesn't have at all) — fall back to Overview for display
  // without discarding the request, so a late-arriving Speakers tab still
  // honours `#speakers`.
  const activeTab = tabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : "overview";

  // Sync tab → URL hash so deep-links / shares land on the right panel.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeTab && activeTab !== "overview") {
      window.history.replaceState(null, "", `#${activeTab}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [activeTab]);

  const tabsTopRef = useRef<HTMLDivElement | null>(null);
  const selectTab = (id: string, scroll = false) => {
    setRequestedTab(id);
    if (scroll && tabsTopRef.current) {
      tabsTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Internal Stripe checkout dialog, hoisted here so both the hero CTA
  // and the tier cards in the Tickets panel can open it.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTicketId, setCheckoutTicketId] = useState<number | undefined>();
  const openCheckout = (ticketId?: number) => {
    setCheckoutTicketId(ticketId);
    setCheckoutOpen(true);
  };

  const provider = event.ticketProvider || "none";
  const isInternal = provider === "internal" && tickets.length > 0;

  const startDate = asDate(event.startDate);
  const now = useNow(60_000, mode === "pre");

  return (
    <main className="pb-24 lg:pb-16">
      {/* --------------------------------------------------- breadcrumb */}
      <div className={`${CONTAINER} pt-5`}>
        <nav aria-label={t("common.breadcrumb")}>
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-sm">
            <li>
              <Link href="/" className="hover:text-foreground">
                {t("nav.home")}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li>
              <Link href="/events" className="hover:text-foreground">
                {t("nav.events")}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li className="min-w-0">
              <span
                className="block max-w-[60vw] truncate font-medium text-foreground"
                aria-current="page"
              >
                {event.title}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      {/* --------------------------------------------- live banner */}
      {mode === "live" && isEventLive(event) && (
        <div className="mt-4 border-y border-red-500/25 bg-red-500/5">
          <div className={`${CONTAINER} flex items-center gap-3 py-2.5`}>
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="truncate text-sm font-medium">
              {livePosts.length === 1
                ? t("event.liveCoverageOne")
                : t("event.liveCoverageMany", { n: livePosts.length })}
            </span>
            <Link href={`/events/${event.slug}/live`} className="ml-auto shrink-0">
              <Button size="sm" className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
                {t("event.followLive")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {mode === "live" && (
        <LiveBlogJsonLd posts={livePosts} event={event} eventUrl={eventUrl} />
      )}
      {mode === "post" &&
        (((event as any).recordings || []) as any[]).map((r) => (
          <PostVideoJsonLd key={r.id} recording={r} event={event} />
        ))}

      {/* ------------------------------------------------------ 1. hero */}
      <EventHeroSection
        event={event}
        mode={mode}
        gallery={gallery as any}
        isInternal={isInternal}
        onOpenCheckout={openCheckout}
        onSelectTab={selectTab}
      />

      {/* ------------------------------------------------- 2. live band */}
      {mode === "live" && <EventLiveBand event={event} posts={livePosts} />}

      {/* -------------------------------------- 3. tab bar + 4–8 panels */}
      <div className={`${CONTAINER} mt-16`} ref={tabsTopRef}>
        <EventTabBar
          tabs={tabs}
          active={activeTab}
          onChange={(id) => selectTab(id)}
        />

        {tabs.map((tab) => (
          <TabPanel key={tab.id} id={tab.id} active={activeTab}>
            {tab.id === "overview" && (
              <OverviewPanel
                event={event}
                gallery={gallery}
                highlights={highlights}
                sideEvents={sideEvents}
                speakers={speakers}
                tracks={tracks}
                dealCount={dealCount}
                onSelectTab={selectTab}
              />
            )}
            {tab.id === "live" && <LivePanel event={event} posts={livePosts} />}
            {tab.id === "recap" && <RecapPanel event={event} posts={livePosts} />}
            {tab.id === "speakers" && (
              <SpeakersPanel event={event} speakers={speakers} />
            )}
            {tab.id === "tickets" && (
              <TicketsPanel
                event={event}
                tickets={tickets}
                isLoading={ticketsQ.isLoading}
                onOpenCheckout={openCheckout}
              />
            )}
            {tab.id === "agenda" && <AgendaPanel event={event} />}
            {tab.id === "side-events" && <EventSideEvents eventId={event.id} />}
            {tab.id === "venue" && <VenuePanel event={event} />}
            {tab.id === "faq" && <EventFaqs faqs={faqs} />}
          </TabPanel>
        ))}
      </div>

      {/* Internal Stripe checkout — one instance for the whole page. */}
      {provider === "internal" && tickets.length > 0 && (
        <TicketCheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          eventId={event.id}
          eventSlug={event.slug}
          eventTitle={event.title}
          tickets={tickets as any}
          initialTicketId={checkoutTicketId}
        />
      )}

      {/* Mobile sticky CTA — the hero's primary action, always reachable */}
      <MobileTicketBar
        event={event}
        mode={mode}
        countdown={mode === "pre" ? compactCountdown(startDate, now) : ""}
        isInternal={isInternal}
        onOpenCheckout={openCheckout}
        onSelectTab={selectTab}
      />
    </main>
  );
}

/**
 * Panels stay in the document at all times — `hidden` rather than
 * conditional rendering — so crawlers index the agenda and FAQ copy
 * whichever tab happens to be selected.
 */
function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: string;
  children: React.ReactNode;
}) {
  const isActive = id === active;
  return (
    <section
      id={tabPanelId(id)}
      role="tabpanel"
      aria-labelledby={tabButtonId(id)}
      tabIndex={0}
      hidden={!isActive}
      className={`scroll-mt-32 pt-14 focus-visible:outline-none ${isActive ? "" : "hidden"}`}
    >
      {children}
    </section>
  );
}

/** Sticky bottom bar on small screens — mirrors the hero's primary CTA. */
function MobileTicketBar({
  event,
  mode,
  countdown,
  isInternal,
  onOpenCheckout,
  onSelectTab,
}: {
  event: EventRow;
  mode: EventMode;
  countdown: string;
  isInternal: boolean;
  onOpenCheckout: (ticketId?: number) => void;
  onSelectTab: (id: string, scroll?: boolean) => void;
}) {
  const t = useT();
  const provider = event.ticketProvider || "none";
  const externalProvider = isExternalProvider(provider) ? provider : null;
  const externalUrl = externalTicketUrlOf(event);
  const handleExternalClick = useExternalTicketClick(
    event.id,
    externalProvider || "external",
    externalUrl,
    event.slug || "",
  );

  if (mode === "post") return null;
  if (!isInternal && !externalUrl) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-[var(--border)] bg-background/95 p-3 backdrop-blur lg:hidden">
      <div className="min-w-0 flex-1">
        {countdown && (
          <div className="truncate text-xs text-muted-foreground">{countdown}</div>
        )}
        <div className="truncate font-semibold">{event.title}</div>
      </div>
      {externalProvider && externalUrl ? (
        <Button
          size="sm"
          className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={handleExternalClick}
        >
          <Ticket className="h-4 w-4" aria-hidden="true" /> {t("event.tabTickets")}
        </Button>
      ) : isInternal ? (
        <Button
          size="sm"
          className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => {
            onSelectTab("tickets");
            onOpenCheckout();
          }}
        >
          <Ticket className="h-4 w-4" aria-hidden="true" /> {t("event.tabTickets")}
        </Button>
      ) : (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
            <Ticket className="h-4 w-4" aria-hidden="true" /> {t("event.tabTickets")}
          </Button>
        </a>
      )}
    </div>
  );
}

// ================================================================
// OVERVIEW PANEL — sections 4 to 8 of the design
// ================================================================

function OverviewPanel({
  event,
  gallery,
  highlights,
  sideEvents,
  speakers,
  tracks,
  dealCount,
  onSelectTab,
}: {
  event: EventRow;
  gallery: any[];
  highlights: any[];
  sideEvents: any[];
  speakers: any[];
  tracks: any[];
  dealCount: number;
  onSelectTab: (id: string, scroll?: boolean) => void;
}) {
  const expectItems = useMemo(
    () => parseWhatToExpect(event.whatToExpect),
    [event.whatToExpect],
  );

  // Highlights can be consumed by the "Around" row above; anything that
  // didn't fit there still gets shown, so no editor copy is lost.
  const aroundKeys = useMemo(
    () =>
      new Set(
        buildAroundCards({ event, sideEvents, tracks, highlights }).map(
          (c) => c.key,
        ),
      ),
    [event, sideEvents, tracks, highlights],
  );
  const leftoverHighlights = highlights.filter(
    (h: any) => !aroundKeys.has(`highlight-${h.id}`),
  );

  return (
    <div className="space-y-20">
      {/* 4 — the editorial half runs beside the rail; the visual rows
          below (speakers, agenda, around, coverage) stay full width, so
          the page never turns into one long narrow column. */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <div className="min-w-0 space-y-16">
          <EventOverviewSplit
            event={event}
            speakerCount={speakers.length}
            trackCount={tracks.length}
            dealCount={dealCount}
          />
          <EventEditorialBlocks
            event={event}
            expectItems={expectItems}
            leftoverHighlights={leftoverHighlights}
          />
        </div>
        <EventSidebar event={event} />
      </div>

      {/* 5 */}
      <EventFeaturedSpeakers
        eventId={event.id}
        speakers={speakers as any}
        onViewAll={() => onSelectTab("speakers", true)}
      />

      {/* 6 */}
      <EventAgendaPreview
        event={event}
        gallery={gallery as any}
        onOpenAgenda={() => onSelectTab("agenda", true)}
      />

      {/* 7 */}
      <EventAroundSection
        event={event}
        sideEvents={sideEvents}
        tracks={tracks}
        highlights={highlights}
        onSelectTab={onSelectTab}
      />

      <EventPhotoStrip event={event} rows={gallery as any} />

      {/* Each of these self-fetches and returns null on an empty result,
          so the Overview tab never grows a hollow section. */}
      <EventSponsors eventId={event.id} />
      <EventCoverage eventId={event.id} />

      {/* 8 */}
      <MostAnticipated currentId={event.id} />

      <HostYourEventBand />

      <InContentAd slotKey="events-sidebar" category="events" />

      {/* 9 — the closing band, per the design: follow on the left,
          our own coverage of the event on the right. Nothing follows it,
          so the page ends on the two things a reader can act on. */}
      <EventFollowBand event={event} />
    </div>
  );
}


/**
 * The text-only blocks of the overview — what to expect, any highlights
 * the "Around" row didn't already use, and the target audience. They live
 * in the editorial column beside the rail rather than at full page width,
 * because measure matters: prose set across 1,400px is unreadable.
 */
function EventEditorialBlocks({
  event,
  expectItems,
  leftoverHighlights,
}: {
  event: any;
  expectItems: ExpectItem[] | null;
  leftoverHighlights: any[];
}) {
  const t = useT();
  return (
    <>
    {event.whatToExpect && (
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          {t("event.whatToExpect")}
        </h2>
        {expectItems ? (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {expectItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {item.title}
                  </div>
                  {item.detail && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {item.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <RichText
            html={event.whatToExpect}
            className="mt-6 text-[15px] leading-relaxed"
          />
        )}
      </section>
    )}

    {leftoverHighlights.length > 0 && (
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          {t("event.highlights")}
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {leftoverHighlights.map((h: any) => (
            <article
              key={h.id}
              className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-card p-6"
            >
              <h3 className="text-base font-bold leading-snug text-foreground">
                {h.title}
              </h3>
              {h.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {h.description}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    )}

    {/* Who should attend — backed by events.targetAudience (added in
        migration 0050). Renders only when an editor has filled it in;
        the audiences are never inferred. */}
    {Array.isArray((event as any).targetAudience) &&
      (event as any).targetAudience.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            {t("event.whoShouldAttend")}
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {((event as any).targetAudience as string[]).map((aud) => (
              <span
                key={aud}
                className="rounded-full border border-[var(--border)] bg-muted/50 px-3.5 py-1.5 text-sm font-medium text-foreground"
              >
                {aud}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/**
 * Closing row of upcoming events, rendered in the same full-width card
 * language as "Around {event}" so the page never breaks into a
 * content-plus-sidebar shape at the bottom.
 *
 * `events.list` sorts "registrations" against the event's view counter
 * server-side, so this is a popularity ranking of upcoming events —
 * labelled as "Most anticipated", never "Trending", because there is no
 * real trend (velocity) metric behind it.
 */
function MostAnticipated({ currentId }: { currentId: number }) {
  const t = useT();
  const q = trpc.events.list.useQuery({
    page: 1,
    limit: 8,
    upcoming: true,
    sortBy: "registrations",
    sortOrder: "desc",
  } as any);

  const items = (((q.data as any)?.items || []) as CardEvent[])
    .filter((e) => e.id !== currentId)
    .slice(0, 4);

  if (!q.isLoading && items.length === 0) return null;

  return (
    <section aria-label={t("event.mostAnticipatedEvents")}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            {t("events.mostAnticipated")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("event.byInterestOn", { site: publication.name })}
          </p>
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          {t("events.viewAll")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {q.isLoading
          ? [0, 1, 2, 3].map((i) => <EventCardSkeleton key={i} />)
          : items.map((e) => <EventCard key={e.id} event={e} />)}
      </div>
    </section>
  );
}

/**
 * Full-width closing CTA. Deliberately a single band rather than a boxed
 * card in a narrow column — the page has no sidebar and a half-empty
 * green box at the end reads as a second, unfinished layout.
 */
function HostYourEventBand() {
  const t = useT();
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-emerald-600/25 bg-emerald-50/60 px-7 py-8 dark:bg-emerald-500/[0.07] sm:flex-row sm:items-center sm:justify-between lg:px-10">
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">
          {t("event.hostYourEventOn", { site: publication.name })}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t("event.hostBandBlurb")}
        </p>
      </div>
      <Link href="/events/submit" className="shrink-0">
        <Button className="h-11 gap-1.5 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700">
          {t("events.submit")} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    </section>
  );
}

/**
 * `whatToExpect` is a single free-text/HTML column. When the copy is
 * genuinely structured — a JSON array, an HTML list, or bulleted lines
 * of "Lead — supporting detail" — it is rendered as the icon list from
 * the design. Anything else falls through to prose; nothing is split
 * apart on a guess.
 */
export interface ExpectItem {
  title: string;
  detail?: string;
}

const LEAD_SPLIT = /^\s*(.{2,70}?)\s*(?:[:–—]|\s-\s)\s*(.+)$/;

function cleanBullet(line: string): string {
  return line.replace(/^\s*[-*•·✓✔–—]\s*/, "").trim();
}

function splitLead(text: string): ExpectItem {
  const m = LEAD_SPLIT.exec(text);
  if (m) return { title: m[1].trim(), detail: m[2].trim() };
  return { title: text };
}

export function parseWhatToExpect(raw: unknown): ExpectItem[] | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. JSON array authored by an importer.
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const items = parsed
          .map((entry: any) => {
            if (typeof entry === "string") return splitLead(entry.trim());
            if (entry && typeof entry === "object") {
              const title = entry.title || entry.heading || entry.name;
              if (!title) return null;
              const detail = entry.description || entry.detail || entry.text;
              return {
                title: String(title),
                detail: detail ? String(detail) : undefined,
              };
            }
            return null;
          })
          .filter(Boolean) as ExpectItem[];
        if (items.length >= 2) return items;
      }
    } catch {
      /* fall through to the other shapes */
    }
  }

  // 2. HTML list from the admin rich-text editor. Sanitised first, then
  //    read as TEXT only — nothing from this path is injected as markup.
  if (looksLikeHtml(trimmed) && typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(
        sanitizeHtml(trimmed),
        "text/html",
      );
      const lis = Array.from(doc.querySelectorAll("li"));
      if (lis.length >= 2) {
        const items = lis
          .map((li) => {
            const lead = li.querySelector("strong, b, h3, h4");
            const whole = (li.textContent || "").replace(/\s+/g, " ").trim();
            if (!whole) return null;
            if (lead) {
              const title = (lead.textContent || "").replace(/\s+/g, " ").trim();
              const detail = whole.slice(title.length).replace(/^[\s:–—-]+/, "");
              if (title) return { title, detail: detail || undefined };
            }
            return splitLead(whole);
          })
          .filter(Boolean) as ExpectItem[];
        if (items.length >= 2) return items;
      }
      return null;
    } catch {
      return null;
    }
  }

  // 3. Plain text. Only treated as a list when EVERY line is either
  //    bulleted or clearly "Lead: detail" — otherwise it's a paragraph
  //    that happens to contain a newline, and splitting it would be a
  //    fabrication.
  const lines = trimmed
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const bulletCount = lines.filter((l) => /^[-*•·✓✔]/.test(l)).length;
  const leadCount = lines.filter((l) => LEAD_SPLIT.test(cleanBullet(l))).length;
  if (bulletCount === lines.length || leadCount === lines.length) {
    return lines.map((l) => splitLead(cleanBullet(l)));
  }
  return null;
}

// ================================================================
// SPEAKERS PANEL
// ================================================================

function SpeakerAvatar({
  speaker,
  className = "",
}: {
  speaker: any;
  className?: string;
}) {
  if (speaker.photo) {
    return (
      <img
        src={speaker.photo}
        alt=""
        loading="lazy"
        decoding="async"
        className={`shrink-0 rounded-full object-cover ring-1 ring-[var(--border)] ${className}`}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-600/10 font-bold text-emerald-700 dark:text-emerald-400 ${className}`}
      aria-hidden="true"
    >
      {initialsOf(speaker.name)}
    </span>
  );
}

function SpeakersPanel({
  event,
  speakers,
}: {
  event: EventRow;
  speakers: any[];
}) {
  const t = useT();
  if (!speakers || speakers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("event.speakersTba")}
      </p>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        {speakers.length === 1
          ? t("event.oneSpeaker")
          : t("event.nSpeakers", { n: speakers.length })}
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {speakers.map((s: any) => (
          // Anchor id supports deep-links like /e/leap-2026#speaker-42
          // shared from the EntityShareIntents dialog below.
          <article
            key={s.id}
            id={`speaker-${s.id}`}
            className="group relative flex h-full flex-col scroll-mt-32 rounded-2xl border border-[var(--border)] bg-card p-5 transition-shadow hover:shadow-md"
          >
            {/* Share sits absolute so a long role can use the full width
                and every card keeps the same header height. */}
            <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <SpeakerShareTrigger event={event} speaker={s} />
            </div>

            <SpeakerAvatar speaker={s} className="h-16 w-16 text-lg" />

            <h3 className="mt-3 line-clamp-2 text-[15px] font-bold leading-snug text-foreground">
              {s.personSlug ? (
                <Link
                  href={`/people/${s.personSlug}`}
                  className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400"
                >
                  {s.name}
                </Link>
              ) : (
                s.name
              )}
            </h3>

            {(s.title || s.company) && (
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                {s.title}
                {s.title && s.company ? (
                  <span className="text-muted-foreground/60"> · </span>
                ) : null}
                {s.company && (
                  <span className="font-medium text-foreground/80">{s.company}</span>
                )}
              </p>
            )}

            {s.bio && (
              <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                {stripHtml(s.bio)}
              </p>
            )}

            <div className="flex-1" />

            {(s.linkedinUrl || s.twitterUrl || s.websiteUrl) && (
              <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-3 text-muted-foreground">
                {s.linkedinUrl && (
                  <a
                    href={s.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("person.onLinkedin", { name: s.name })}
                    className="hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {s.twitterUrl && (
                  <a
                    href={s.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("person.onTwitter", { name: s.name })}
                    className="hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {s.websiteUrl && (
                  <a
                    href={s.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("person.website", { name: s.name })}
                    className="hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
                {s.personSlug && (
                  <Link
                    href={`/people/${s.personSlug}`}
                    className="ml-auto text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {t("nav.profile")}
                  </Link>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/**
 * Small share icon button on each speaker card. Opens a dialog with a
 * pre-filled tweet and a copy-link to the in-page anchor.
 */
function SpeakerShareTrigger({ event, speaker }: { event: EventRow; speaker: any }) {
  const t = useT();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="-m-1 shrink-0 p-1 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
          aria-label={t("event.shareX", { name: speaker.name })}
          title={t("article.share")}
        >
          <Share2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("event.shareSpeaker")}</DialogTitle>
        </DialogHeader>
        <EntityShareIntents
          eventSlug={event.slug}
          eventTitle={event.title}
          eventStartDate={event.startDate}
          entityName={speaker.name}
          entityType="speaker"
          hash={`speaker-${speaker.id}`}
        />
      </DialogContent>
    </Dialog>
  );
}

// ================================================================
// AGENDA / TICKETS / VENUE PANELS
// ================================================================

/**
 * The heavy lifting (day grouping, track colours, speaker chips) lives
 * in the shared EventAgenda component, which pulls the richer
 * `events.getSchedule` payload.
 */
function AgendaPanel({ event }: { event: EventRow }) {
  return (
    <EventAgenda
      eventId={event.id}
      eventStartDate={event.startDate}
      tracks={event.tracks || []}
      renderSessionAction={(session) => (
        <SessionShareTrigger event={event} session={session} />
      )}
    />
  );
}

/** Per-session share dialog, anchored on `#session-:id`. */
function SessionShareTrigger({
  event,
  session,
}: {
  event: EventRow;
  session: { id: number; title: string; speakerName?: string | null };
}) {
  const t = useT();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="-m-1 shrink-0 p-1 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
          aria-label={t("event.shareX", { name: session.title })}
          title={t("event.shareThisSession")}
        >
          <Share2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("event.shareSession")}</DialogTitle>
        </DialogHeader>
        <EntityShareIntents
          eventSlug={event.slug}
          eventTitle={event.title}
          eventStartDate={event.startDate}
          entityName={session.speakerName || session.title}
          entityType="session"
          hash={`session-${session.id}`}
        />
      </DialogContent>
    </Dialog>
  );
}

function TicketsPanel({
  event,
  tickets,
  isLoading,
  onOpenCheckout,
}: {
  event: EventRow;
  tickets: any[];
  isLoading: boolean;
  onOpenCheckout: (ticketId?: number) => void;
}) {
  const t = useT();
  const externalUrl = externalTicketUrlOf(event);
  const provider = event.ticketProvider || "none";
  const externalProvider = isExternalProvider(provider) ? provider : null;
  const handleExternalClick = useExternalTicketClick(
    event.id,
    externalProvider || "external",
    externalUrl || "",
    event.slug || "",
  );

  if (isLoading && tickets.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    );
  }

  // No tiers of our own — route to whatever channel the organiser uses.
  if (tickets.length === 0) {
    if (!externalUrl && !event.isFree) {
      return (
        <p className="text-sm text-muted-foreground">
          {t("event.ticketsTba")}
        </p>
      );
    }
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
            <Ticket className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-bold text-foreground">
              {event.isFree ? t("event.freeEntry") : t("event.getYourTicket")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {provider === "eventbrite"
                ? t("event.viaEventbrite")
                : provider === "luma"
                ? t("event.viaLuma")
                : t("event.viaOrganiser")}
            </p>
          </div>
        </div>
        {externalUrl && externalProvider ? (
          <div className="mt-4">
            <Button
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleExternalClick}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {event.isFree ? t("event.register") : t("event.buyTickets")}
            </Button>
            <ProviderBadge provider={externalProvider} align="left" />
          </div>
        ) : externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block"
          >
            <Button className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {event.isFree ? t("event.register") : t("event.buyTickets")}
            </Button>
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div id="tickets" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tickets.map((tier: TicketRow) => (
        <article
          key={tier.id}
          className={`rounded-2xl border bg-card p-5 ${
            tier.soldOut
              ? "border-[var(--border)] opacity-60"
              : "border-emerald-600/30"
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base font-bold text-foreground">{tier.name}</h3>
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(tier.priceCents, tier.currency)}
            </div>
          </div>
          {tier.description && (
            <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
          )}
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {tier.remaining !== null && tier.remaining !== undefined && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3" aria-hidden="true" />
                {tier.soldOut
                  ? t("event.soldOut")
                  : t("event.nRemaining", {
                      n: fmtNumber(Number(tier.remaining)),
                    })}
              </div>
            )}
            {tier.salesEndAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {t("event.salesEnd", { date: formatDate(tier.salesEndAt) })}
              </div>
            )}
          </div>
          <Button
            className="mt-4 w-full bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!!tier.soldOut}
            onClick={() => {
              if (provider === "internal") {
                onOpenCheckout(tier.id);
                return;
              }
              if (externalUrl) {
                window.open(externalUrl, "_blank", "noopener");
              }
            }}
          >
            {tier.soldOut ? t("event.soldOut") : t("events.getTickets")}
          </Button>
        </article>
      ))}
    </div>
  );
}

/**
 * Venue panel — name, full address, the admin-uploaded `venueImage`, an
 * embedded map when `venueMapUrl` is an actual embed URL (a plain
 * share link is NOT put in an iframe: Google blocks it in a frame), and
 * the Get Directions CTA.
 */
function VenuePanel({ event }: { event: EventRow }) {
  const t = useT();
  const name = event.venueName || event.venue || null;
  const address = event.venueAddress || event.address || event.addressLine || null;
  const locality = [event.city, event.country].filter(Boolean).join(", ");
  const directionsUrl = buildDirectionsUrl(event);
  const embeddable = isEmbeddableMapUrl(event.venueMapUrl);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {name || locality || t("event.tabVenue")}
        </h2>
        {(address || locality) && (
          <address className="mt-2 not-italic text-sm leading-relaxed text-muted-foreground">
            {address && <div>{address}</div>}
            {locality && <div>{locality}</div>}
          </address>
        )}
        {event.format === "virtual" && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("event.virtualJoiningDetails")}
          </p>
        )}

        {!embeddable && directionsUrl ? (
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-card p-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
              <MapPin className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-foreground">
                {name || locality}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("event.openInMaps")}
              </p>
            </div>
          </div>
        ) : null}

        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block"
          >
            <Button className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
              <Navigation className="h-4 w-4" aria-hidden="true" /> {t("event.getDirections")}
            </Button>
          </a>
        )}
      </div>

      <div className="space-y-6">
        {event.venueImage && (
          <img
            src={event.venueImage}
            alt={name ? `${name}` : t("event.tabVenue")}
            loading="lazy"
            className="aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-[var(--border)]"
          />
        )}

        {embeddable ? (
          <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[var(--border)]">
            <iframe
              src={event.venueMapUrl}
              title={t("event.mapOf", {
                place: name || locality || t("event.theVenue"),
              })}
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ================================================================
// LIVE PANEL
// ================================================================

function LivePanel({ event, posts }: { event: EventRow; posts: any[] }) {
  const t = useT();
  const nowSession = findCurrentSession(event.schedule || []);

  return (
    <div className="space-y-6">
      {nowSession && <NowHappeningCard session={nowSession} />}

      <div>
        <div className="mb-4 flex items-center gap-2">
          <Radio className="h-5 w-5 text-red-500" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-tight">{t("event.liveFeed")}</h2>
          <span className="text-sm text-muted-foreground">
            {posts.length === 1
              ? t("event.oneUpdate")
              : t("event.nUpdates", { n: posts.length })}
          </span>
          {/* RSS subscribe link — the per-event live feed for Feedly /
              NetNewsWire / IFTTT subscribers. */}
          <a
            href={`/events/${event.slug}/feed.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-muted-foreground transition hover:text-orange-500"
            aria-label={t("event.rssAria")}
            title={t("event.rssTitle")}
          >
            <Rss className="h-4 w-4" />
          </a>
        </div>

        {posts.length === 0 ? (
          <p className="rounded-2xl border border-[var(--border)] bg-card p-8 text-center text-sm text-muted-foreground">
            {t("event.liveFeedEmpty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {(posts as LivePostRow[]).map((p) => (
              <li key={p.id} id={`post-${p.id}`}>
                <LivePostCard post={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function findCurrentSession(schedule: any[]): any | null {
  const now = Date.now();
  for (const s of schedule) {
    const start = s.startTime ? new Date(s.startTime).getTime() : 0;
    const end = s.endTime ? new Date(s.endTime).getTime() : start + 3_600_000;
    if (start <= now && now <= end) return s;
  }
  return null;
}

function NowHappeningCard({ session }: { session: any }) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-emerald-600/30 bg-emerald-50/60 p-5 dark:bg-emerald-500/[0.07]">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
        {t("event.nowHappening")}
      </div>
      <h3 className="text-xl font-bold">{session.title}</h3>
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {formatTime(session.startTime)}
          {session.endTime ? ` – ${formatTime(session.endTime)}` : ""}
        </span>
        {(session.speakerName || session.speaker) && (
          <span className="flex items-center gap-1">
            <Mic2 className="h-4 w-4" aria-hidden="true" />
            {session.speakerName || session.speaker}
          </span>
        )}
        {session.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {session.location}
          </span>
        )}
      </div>
    </div>
  );
}

function LivePostCard({ post }: { post: any }) {
  const t = useT();
  const type = post.postType || "update";
  const time = formatTime(post.publishedAt);
  const dateStr = formatDate(post.publishedAt);

  const Header = (
    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        {post.isPinned ? (
          <Badge variant="outline" className="py-0 text-[10px]">
            {t("event.pinned")}
          </Badge>
        ) : null}
        <span className="uppercase tracking-wider">{type}</span>
      </span>
      <time dateTime={post.publishedAt} title={dateStr}>
        {time}
      </time>
    </div>
  );

  if (type === "funding") {
    return (
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-4">
          {Header}
          <div className="mt-1 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase text-emerald-600">
                {t("event.justAnnounced")}
              </div>
              <div className="text-lg font-bold leading-tight">
                {post.companyName || t("event.newDeal")}
                {post.fundingAmount ? ` · ${post.fundingAmount}` : ""}
              </div>
              {post.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {post.body}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "quote") {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-5">
          {Header}
          <Quote className="mb-2 h-5 w-5 text-blue-500" />
          <blockquote className="text-lg italic leading-snug">
            {post.body}
          </blockquote>
          {post.speakerName && (
            <cite className="mt-2 block text-sm not-italic text-muted-foreground">
              — {post.speakerName}
            </cite>
          )}
        </CardContent>
      </Card>
    );
  }

  if (type === "breaking") {
    return (
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="p-4">
          {Header}
          <div className="flex items-start gap-2">
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              {post.headline && (
                <h3 className="text-lg font-bold">{post.headline}</h3>
              )}
              {post.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm">{post.body}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "photo" && post.imageUrl) {
    return (
      <Card>
        <CardContent className="p-0">
          <img
            src={post.imageUrl}
            alt={post.headline || t("event.livePhoto")}
            className="h-auto w-full"
            loading="lazy"
          />
          <div className="p-4">
            {Header}
            {post.headline && <h3 className="font-semibold">{post.headline}</h3>}
            {post.body && (
              <p className="mt-1 text-sm text-muted-foreground">{post.body}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "video" && post.embedUrl) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          {Header}
          <div className="aspect-video overflow-hidden rounded bg-black">
            <iframe
              src={post.embedUrl}
              className="h-full w-full"
              allowFullScreen
              title={post.headline || t("event.liveVideo")}
            />
          </div>
          {post.headline && <h3 className="font-semibold">{post.headline}</h3>}
          {post.body && (
            <p className="text-sm text-muted-foreground">{post.body}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // update / session / sponsor / fallback
  return (
    <Card>
      <CardContent className="p-4">
        {Header}
        {post.headline && (
          <h3 className="font-semibold leading-snug">{post.headline}</h3>
        )}
        {post.body && (
          <p className="mt-1 whitespace-pre-wrap text-sm">{post.body}</p>
        )}
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            className="mt-3 h-auto w-full rounded"
            loading="lazy"
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * LiveBlogPosting schema — emitted as a separate block so the Event
 * schema stays canonical. Each post becomes a BlogPosting child for
 * Google's live coverage carousel.
 */
function LiveBlogJsonLd({
  posts,
  event,
  eventUrl,
}: {
  posts: any[];
  event: EventRow;
  eventUrl: string;
}) {
  const data = useMemo(() => {
    // Google's live coverage parser wants plain prose, not markup.
    const toPlainText = (s: string | null | undefined): string => {
      if (!s) return "";
      return String(s)
        .replace(/<[^>]+>/g, " ")
        .replace(/!?\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/[*_`>#~]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };
    const updates = (posts as LivePostRow[]).map((p: any) => ({
      "@type": "BlogPosting" as const,
      headline:
        p.headline || (p.body ? toPlainText(p.body).slice(0, 120) : "Live update"),
      datePublished: p.publishedAt,
      dateModified: p.updatedAt || p.publishedAt,
      articleBody: toPlainText(p.body),
      image: p.imageUrl || undefined,
      url: `${eventUrl}#post-${p.id}`,
    }));
    return {
      "@context": "https://schema.org",
      "@type": "LiveBlogPosting",
      headline: `${event.title} live coverage`,
      coverageStartTime: event.startDate,
      coverageEndTime: event.endDate || event.startDate,
      about: {
        "@type": "Event",
        name: event.title,
        startDate: event.startDate,
        endDate: event.endDate || event.startDate,
      },
      url: eventUrl,
      liveBlogUpdate: updates,
    };
  }, [posts, event, eventUrl]);

  useEffect(() => {
    const id = "jsonld-liveblogposting";
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      const s = document.getElementById(id);
      if (s) s.remove();
    };
  }, [data]);

  return null;
}

// ================================================================
// RECAP PANEL (post mode)
// ================================================================

function RecapPanel({ event, posts }: { event: EventRow; posts: any[] }) {
  const t = useT();
  const recordings: any[] = (event as any).recordings || [];

  const fundingCount = posts.filter((p: any) => p.postType === "funding").length;
  const sessionCount = (event.schedule || []).length;
  const attendeesShown = Number(
    event.ticketsSoldCount || event.expectedAttendees || 0,
  );
  const photoPosts = posts.filter(
    (p: any) => p.postType === "photo" && p.imageUrl,
  );

  const stats: Array<{ label: string; value: number }> = [
    ...(attendeesShown > 0
      ? [{ label: t("event.statAttendees"), value: attendeesShown }]
      : []),
    ...(fundingCount > 0
      ? [
          {
            label:
              fundingCount === 1
                ? t("event.statDealAnnounced")
                : t("event.statDealsAnnounced"),
            value: fundingCount,
          },
        ]
      : []),
    ...(sessionCount > 0
      ? [
          {
            label:
              sessionCount === 1
                ? t("event.statSession")
                : t("event.statSessions"),
            value: sessionCount,
          },
        ]
      : []),
    ...(posts.length > 0
      ? [
          {
            label:
              posts.length === 1
                ? t("event.statLiveUpdate")
                : t("event.statLiveUpdates"),
            value: posts.length,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-12">
      {stats.length >= 2 && (
        <section>
          <h2 className="text-xl font-bold tracking-tight">{t("event.byTheNumbers")}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-[var(--border)] bg-card p-4 text-center"
              >
                <dd className="text-2xl font-bold tabular-nums text-foreground">
                  {fmtNumber(s.value)}
                </dd>
                <dt className="mt-1 text-xs text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      {(event as any).recapArticleId && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-600/30 bg-emerald-50/60 p-6 dark:bg-emerald-500/[0.07]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {t("event.tabRecap")}
            </div>
            <h2 className="mt-1 text-xl font-bold">
              {t("event.readFullRecapOf", { title: event.title })}
            </h2>
          </div>
          <Link href={`/news/${(event as any).recapArticleSlug || ""}`}>
            <Button className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
              {t("event.readRecap")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </section>
      )}

      {recordings.length > 0 && (
        <section>
          <h2 className="text-xl font-bold tracking-tight">{t("event.sessionRecordings")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recordings.map((r) => (
              <Card key={r.id} className="overflow-hidden">
                <a
                  href={r.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-video bg-muted"
                >
                  {r.thumbnailUrl ? (
                    <img
                      src={r.thumbnailUrl}
                      alt={r.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
                    <Play className="h-12 w-12 text-white" fill="white" />
                  </div>
                </a>
                <CardContent className="p-4">
                  <h3 className="font-semibold leading-snug">{r.title}</h3>
                  {r.speakerName && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.speakerName}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {photoPosts.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Camera className="h-5 w-5" aria-hidden="true" /> {t("event.fromTheFloor")}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {photoPosts.map((p: any) => (
              <a
                key={p.id}
                href={p.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden rounded bg-muted"
              >
                <img
                  src={p.imageUrl}
                  alt={p.headline || ""}
                  className="h-full w-full object-cover transition hover:scale-105"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {(event.sponsors || []).length > 0 && (
        <section>
          <h2 className="text-xl font-bold tracking-tight">{t("event.sponsoredBy")}</h2>
          <div className="mt-4">
            <SponsorTierGrid sponsors={event.sponsors} />
          </div>
        </section>
      )}

      {stats.length === 0 &&
        recordings.length === 0 &&
        photoPosts.length === 0 &&
        !(event as any).recapArticleId && (
          <p className="text-sm text-muted-foreground">
            {t("event.recapEmpty")}
          </p>
        )}

      <section className="rounded-2xl border border-[var(--border)] bg-muted/30 p-6 text-center">
        <h2 className="text-lg font-bold">{t("event.goingNextYear")}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("event.findNextEdition", { site: publication.name })}
        </p>
        <Link href="/events" className="mt-4 inline-block">
          <Button variant="outline" className="gap-2">
            {t("event.browseAllEvents")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </section>
    </div>
  );
}

/** VideoObject schema for a single recording. */
function PostVideoJsonLd({
  recording,
  event,
}: {
  recording: any;
  event: EventRow;
}) {
  useEffect(() => {
    const id = `jsonld-video-${recording.id}`;
    const data = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: recording.title,
      description: `${recording.title} — ${event.title}`,
      thumbnailUrl: recording.thumbnailUrl,
      uploadDate: recording.createdAt || event.endDate || event.startDate,
      contentUrl: recording.videoUrl,
      duration: recording.durationSeconds
        ? `PT${Math.floor(recording.durationSeconds / 60)}M${recording.durationSeconds % 60}S`
        : undefined,
    };
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      const s = document.getElementById(id);
      if (s) s.remove();
    };
  }, [recording, event]);
  return null;
}
