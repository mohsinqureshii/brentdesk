/**
 * EventHeroSection — the full-width split hero of the v4 event page.
 *
 *   ┌──────────────────────────┬───────────────────────────────┐
 *   │ ● LIVE NOW  In-person …  │  ┌─────────────────────────┐  │
 *   │ BIG TITLE                │  │        lead photo       │  │
 *   │ tagline in emerald       │  └─────────────────────────┘  │
 *   │ short description        │  ┌───────────────────┐┌─────┐ │
 *   │ 🗓 dates    📍 venue     │  └───────────────────┘└─────┘ │
 *   │ [Get Tickets] [Save]     │                               │
 *   │ Share · Calendar · Map   │                               │
 *   └──────────────────────────┴───────────────────────────────┘
 *          ~48%                             ~52%
 *
 * The banner is height-capped (21rem at desktop) so the dates, venue and
 * ticket CTA stay above the fold on a laptop.
 *
 * On mobile the two halves stack, text first.
 *
 * Every element here is backed by a column: the chips come from
 * `format` / `type` / `isFeatured`, the tag row from the event's linked
 * `sectors`, the meta block from the date and venue columns. Anything
 * missing is omitted rather than defaulted.
 */

import { Link } from "wouter";
import {
  Calendar,
  MapPin,
  Navigation,
  Share2,
  Star,
  Tag,
  Ticket,
} from "lucide-react";

import { stripHtml } from "@/lib/sanitizeHtml";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import EventShareButtons from "./EventShareButtons";
import EventCollage from "./EventCollage";
import { type GalleryRow } from "./EventGallery";
import { EventSaveButton, formatLongDateRange, formatLocation } from "./EventCard";
import { EventRsvpButtons } from "./EventRsvp";
import { FORMAT_LABEL, typeLabelFor } from "./EventVisual";
import {
  CONTAINER,
  durationLabel,
  buildDirectionsUrl,
  externalTicketUrlOf,
  isExternalProvider,
  ProviderBadge,
  useExternalTicketClick,
  type EventRow,
} from "./eventMeta";

type EventMode = "pre" | "live" | "post";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground">
      {children}
    </span>
  );
}

export default function EventHeroSection({
  event,
  mode,
  gallery,
  isInternal,
  onOpenCheckout,
  onSelectTab,
}: {
  event: EventRow;
  mode: EventMode;
  gallery: GalleryRow[];
  isInternal: boolean;
  onOpenCheckout: (ticketId?: number) => void;
  onSelectTab: (id: string, scroll?: boolean) => void;
}) {
  const provider = event.ticketProvider || "none";
  const externalProvider = isExternalProvider(provider) ? provider : null;
  const externalUrl = externalTicketUrlOf(event);
  const handleExternalClick = useExternalTicketClick(
    event.id,
    externalProvider || "external",
    externalUrl,
    event.slug || "",
  );
  const legacyUrl = provider === "none" ? externalUrl : "";

  // Never sell a seat at an event that has already finished.
  const showTicketCta = mode !== "post" && (isInternal || !!externalUrl);

  const directionsUrl = buildDirectionsUrl(event);
  const duration = durationLabel(event.startDate, event.endDate);
  const venueName = event.venueName || event.venue || null;
  const location = formatLocation(event.city, event.country, event.format);
  const sectors: Array<{ id: number; name: string }> = event.sectors || [];
  const shortDescription = stripHtml(event.shortDescription || "");

  const secondaryAction =
    "inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-emerald-700 dark:hover:text-emerald-400";

  return (
    <section className={`${CONTAINER} overflow-hidden pt-6 lg:pt-10`}>
      <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)] lg:gap-12">
        {/* --------------------------------------------------- text */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {mode === "live" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                Live now
              </span>
            )}
            {mode === "post" && <Chip>Event ended</Chip>}
            {event.format && (
              <Chip>
                {FORMAT_LABEL[String(event.format)] ||
                  String(event.format).replace(/_/g, "-")}
              </Chip>
            )}
            {event.type && <Chip>{typeLabelFor(event.type)}</Chip>}
            {event.isFeatured ? (
              <Chip>
                <Star className="h-3 w-3" aria-hidden="true" /> Featured
              </Chip>
            ) : null}
          </div>

          <h1 className="mt-4 text-4xl font-black leading-[0.98] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {event.title}
          </h1>

          {event.tagline && (
            <p className="mt-3 text-xl font-bold leading-snug text-emerald-700 dark:text-emerald-400 lg:text-2xl">
              {event.tagline}
            </p>
          )}

          {shortDescription && (
            <p className="mt-4 line-clamp-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              {shortDescription}
            </p>
          )}

          {/* ------------------------------------------- meta block */}
          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-5">
            <div className="flex items-start gap-3">
              <Calendar
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="font-bold text-foreground">
                  {formatLongDateRange(event.startDate, event.endDate)}
                </div>
                {duration && (
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {duration}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="font-bold text-foreground">
                  {venueName || location}
                </div>
                {venueName && (
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {location}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --------------------------------------------- sectors */}
          {sectors.length > 0 && (
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Tag
                className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <span className="min-w-0">
                {sectors.map((s, i) => (
                  <span key={s.id}>
                    {i > 0 && <span className="px-1.5 text-muted-foreground/50">/</span>}
                    <span className="font-medium text-foreground">{s.name}</span>
                  </span>
                ))}
              </span>
            </div>
          )}

          {/* --------------------------------------------- actions */}
          <div className="mt-7 flex flex-wrap items-start gap-3">
            {showTicketCta && (
              <div>
                {externalProvider && externalUrl ? (
                  <>
                    <Button
                      size="lg"
                      className="h-12 gap-2 rounded-lg bg-emerald-600 px-8 text-sm font-semibold text-white hover:bg-emerald-700"
                      onClick={handleExternalClick}
                    >
                      <Ticket className="h-4 w-4" aria-hidden="true" /> Get Tickets
                    </Button>
                    <ProviderBadge provider={externalProvider} align="left" />
                  </>
                ) : isInternal ? (
                  <Button
                    size="lg"
                    className="h-12 gap-2 rounded-lg bg-emerald-600 px-8 text-sm font-semibold text-white hover:bg-emerald-700"
                    onClick={() => {
                      onSelectTab("tickets");
                      onOpenCheckout();
                    }}
                  >
                    <Ticket className="h-4 w-4" aria-hidden="true" /> Get Tickets
                  </Button>
                ) : legacyUrl ? (
                  <a href={legacyUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      className="h-12 gap-2 rounded-lg bg-emerald-600 px-8 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      <Ticket className="h-4 w-4" aria-hidden="true" /> Get Tickets
                    </Button>
                  </a>
                ) : null}
              </div>
            )}

            {/* RSVP belongs beside the ticket CTA, not four screens down
                in the closing band — deciding to attend is a hero-level
                action. Both controls read the same getMyRsvp query, so
                the band below stays in sync. Hidden once the event has
                finished: there is nothing left to attend. */}
            {mode !== "post" && (
              <EventRsvpButtons eventId={event.id} slug={event.slug} variant="hero" />
            )}

            <EventSaveButton event={event} />
          </div>

          {/* ------------------------------------- secondary row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3">
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className={secondaryAction}>
                  <Share2 className="h-4 w-4" aria-hidden="true" /> Share
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Share this event</DialogTitle>
                </DialogHeader>
                <EventShareButtons
                  slug={event.slug}
                  title={event.title}
                  size="default"
                />
              </DialogContent>
            </Dialog>

            {/* Server-rendered iCal — a proper .ics that Outlook/Google/
                Apple all recognise, and a shareable link, not a data: URI. */}
            <a
              href={`/events/${event.slug}/calendar.ics`}
              download={`${event.slug}.ics`}
              className={secondaryAction}
            >
              <Calendar className="h-4 w-4" aria-hidden="true" /> Add to Calendar
            </a>

            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryAction}
              >
                <Navigation className="h-4 w-4" aria-hidden="true" /> Directions
              </a>
            )}

            {mode === "live" && (
              <Link
                href={`/events/${event.slug}/live`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline dark:text-red-400"
              >
                Follow live coverage
              </Link>
            )}
          </div>

        </div>

        {/* ------------------------------------------------- banner */}
        <EventCollage event={event} rows={gallery} className="min-w-0 lg:flex lg:flex-col lg:justify-center" />
      </div>
    </section>
  );
}
