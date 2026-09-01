/**
 * EventGalleryBlock — the lead visual for the public event page.
 * ----------------------------------------------------------------------
 * Anatomy (matches the supplied design):
 *
 *   ┌───────────────────────────────────────────┐
 *   │ [FEATURED]                          (♥)   │  ← 16:9 hero, rounded-xl
 *   │                                           │
 *   └───────────────────────────────────────────┘
 *   (‹) [thumb][thumb][thumb][thumb][thumb] (›)   ← 5-up strip, active ringed
 *
 * Data sources, in order:
 *   1. `event.featuredImage` (when usable) becomes slide 0.
 *   2. `events.getGallery` rows follow, in `sortOrder`.
 *
 * With no photo at all — the common case in this dataset — the hero falls
 * back to `EventMedia`, which paints the deterministic designed tile
 * instead of an empty grey box, and the strip is not rendered.
 *
 * Gallery rows whose URL points at YouTube / Vimeo / an .mp4 are treated
 * as video: the thumbnail carries a play badge and the item opens in a
 * lightbox (embedded player) rather than swapping the still hero.
 *
 * The prev/next arrows only mount when the strip actually overflows its
 * track — measured with a ResizeObserver, not guessed from item count.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EventMedia,
  eventMonogram,
  isUsableImage,
  typeLabelFor,
} from "./EventVisual";
import { EventBookmarkButton, type BookmarkableEvent } from "./EventCard";

// ----------------------------------------------------------------------
// Types + URL helpers
// ----------------------------------------------------------------------

export interface GalleryRow {
  id: number;
  imageUrl: string;
  caption?: string | null;
  altText?: string | null;
}

export interface GallerySlide {
  key: string;
  url: string;
  kind: "image" | "video";
  caption: string | null;
  alt: string;
  /** True for the event's own `featuredImage` (drives the credit line). */
  isFeaturedImage: boolean;
}

/** youtube / youtu.be / vimeo / a direct .mp4 all count as video. */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return (
    u.includes("youtube.com") ||
    u.includes("youtu.be") ||
    u.includes("vimeo.com") ||
    u.includes(".mp4")
  );
}

/**
 * Convert a share URL into something that can sit in an <iframe>.
 * Returns null when the URL is a plain file (played with <video>) or
 * cannot be embedded — the caller then opens it in a new tab.
 */
export function videoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.toString();
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("vimeo.com")) {
      if (host.startsWith("player.")) return u.toString();
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Build the ordered slide list from the event row + gallery rows. */
export function buildSlides(
  event: { title: string; featuredImage?: string | null },
  rows: GalleryRow[],
): GallerySlide[] {
  const slides: GallerySlide[] = [];
  if (isUsableImage(event.featuredImage)) {
    slides.push({
      key: "featured",
      url: event.featuredImage as string,
      kind: "image",
      caption: null,
      alt: event.title,
      isFeaturedImage: true,
    });
  }
  for (const row of rows || []) {
    if (!row?.imageUrl) continue;
    const video = isVideoUrl(row.imageUrl);
    // A gallery row that repeats the featured image would give the strip
    // two identical thumbnails.
    if (!video && row.imageUrl === event.featuredImage) continue;
    slides.push({
      key: `g-${row.id}`,
      url: row.imageUrl,
      kind: video ? "video" : "image",
      caption: row.caption || null,
      alt: row.altText || row.caption || event.title,
      isFeaturedImage: false,
    });
  }
  return slides;
}

// ----------------------------------------------------------------------
// Lightbox
// ----------------------------------------------------------------------

export function GalleryLightbox({
  slide,
  onClose,
}: {
  slide: GallerySlide | null;
  onClose: () => void;
}) {
  const open = !!slide;
  const embed = slide && slide.kind === "video" ? videoEmbedUrl(slide.url) : null;
  const isFile = !!slide && slide.kind === "video" && !embed;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl border-[var(--border)] p-4">
        <DialogHeader className="sr-only">
          <DialogTitle>{slide?.caption || slide?.alt || "Event media"}</DialogTitle>
        </DialogHeader>
        {slide && slide.kind === "image" && (
          <img
            src={slide.url}
            alt={slide.alt}
            className="max-h-[75vh] w-full rounded-lg object-contain"
          />
        )}
        {embed && (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe
              src={embed}
              title={slide?.caption || "Event video"}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {isFile && (
          <video
            src={slide!.url}
            controls
            className="max-h-[75vh] w-full rounded-lg bg-black"
          />
        )}
        {slide?.caption && (
          <p className="text-sm text-muted-foreground">{slide.caption}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------
// Block
// ----------------------------------------------------------------------

export interface GalleryEvent extends BookmarkableEvent {
  featuredImage?: string | null;
  featuredImageCredit?: string | null;
  featuredImageSource?: string | null;
  featuredImageLicense?: string | null;
  isFeatured?: number | boolean | null;
}

export default function EventGalleryBlock({
  event,
  rows,
  isLoading = false,
}: {
  event: GalleryEvent;
  rows: GalleryRow[];
  isLoading?: boolean;
}) {
  const [slides, setSlides] = useState<GallerySlide[]>(() => buildSlides(event, rows));
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<GallerySlide | null>(null);

  // Rebuild when the gallery query resolves or the route changes event.
  useEffect(() => {
    setSlides(buildSlides(event, rows));
    setActive(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, event.featuredImage, rows]);

  const stripRef = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) {
      setOverflows(false);
      return;
    }
    const measure = () => setOverflows(el.scrollWidth - el.clientWidth > 4);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [slides.length]);

  const scrollStrip = useCallback((dir: -1 | 1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }, []);

  const current = slides[active] || null;

  // ---------------------------------------------------------- loading
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="aspect-[16/9] w-full animate-pulse rounded-xl bg-muted" />
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-[16/10] flex-1 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  // Labels for the photo-less hero. Cheap string work, no extra query.
  const heroDateLabel = (() => {
    const d = (event as any).startDate ? new Date(String((event as any).startDate).replace(" ", "T")) : null;
    const e = (event as any).endDate ? new Date(String((event as any).endDate).replace(" ", "T")) : null;
    if (!d || isNaN(d.getTime())) return null;
    const f = (x: Date, withYear = true) =>
      x.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
    if (e && !isNaN(e.getTime()) && e.toDateString() !== d.toDateString()) {
      return `${f(d, d.getFullYear() !== e.getFullYear())} – ${f(e)}`;
    }
    return f(d);
  })();
  const heroPlaceLabel = [ (event as any).city, (event as any).country ]
    .filter(Boolean).join(", ") || null;

  const heroInner =
    current && current.kind === "image" ? (
      <button
        type="button"
        onClick={() => setLightbox(current)}
        className="block h-full w-full cursor-zoom-in"
        aria-label={`View larger: ${current.alt}`}
      >
        <img
          src={current.url}
          alt={current.alt}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </button>
    ) : current ? (
      <button
        type="button"
        onClick={() => setLightbox(current)}
        className="relative flex h-full w-full items-center justify-center bg-zinc-950"
        aria-label={`Play video: ${current.caption || event.title}`}
      >
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-zinc-900 shadow-lg">
          <Play className="ml-0.5 h-7 w-7" fill="currentColor" />
        </span>
      </button>
    ) : (
      // No photo at all — the common case. `EventMedia` paints the
      // deterministic gradient tile; the hero variant deliberately ships
      // without typography (it normally sits under a title overlay), so
      // the kicker + monogram are added here to give the slot a focal
      // point instead of leaving it looking like a failed image.
      <div className="relative h-full w-full">
        <EventMedia
          event={event}
          variant="hero"
          loading="eager"
          interactive={false}
          className="h-full w-full"
        />
        {/* A bare monogram on an empty gradient read as a failed image.
            Without photography the tile has to carry information, so it
            states the event, its dates and where it happens. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm">
            {typeLabelFor(event.type)}
          </span>
          <h2 className="mt-1 line-clamp-2 text-3xl font-black leading-[1.05] tracking-tight text-white drop-shadow sm:text-5xl">
            {event.title}
          </h2>
          {(heroDateLabel || heroPlaceLabel) && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-white/75">
              {heroDateLabel && <span>{heroDateLabel}</span>}
              {heroDateLabel && heroPlaceLabel && (
                <span className="text-white/35">•</span>
              )}
              {heroPlaceLabel && <span>{heroPlaceLabel}</span>}
            </p>
          )}
        </div>
      </div>
    );

  return (
    <section aria-label="Event media" className="space-y-3">
      {/* ------------------------------------------------------- hero */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-muted">
        {heroInner}

        {event.isFeatured ? (
          <span className="pointer-events-none absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
            <Star className="h-3 w-3" fill="currentColor" aria-hidden="true" />
            Featured
          </span>
        ) : null}

        <div className="absolute right-4 top-4 z-10">
          <EventBookmarkButton
            event={event}
            className="h-10 w-10 shadow-md ring-black/10"
          />
        </div>

        {/* Free licences (Wikimedia Commons and similar) require a visible
            credit wherever the photo is shown. */}
        {current?.isFeaturedImage && event.featuredImageCredit ? (
          <p className="absolute bottom-2 right-3 z-10 max-w-[70%] truncate rounded bg-black/45 px-2 py-0.5 text-right text-[10px] text-white/85">
            Photo:{" "}
            {event.featuredImageSource ? (
              <a
                href={event.featuredImageSource}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline underline-offset-2 hover:text-white"
              >
                {event.featuredImageCredit}
              </a>
            ) : (
              event.featuredImageCredit
            )}
            {event.featuredImageLicense ? ` · ${event.featuredImageLicense}` : ""}
          </p>
        ) : null}
      </div>

      {current?.caption && (
        <p className="px-1 text-xs text-muted-foreground">{current.caption}</p>
      )}

      {/* ------------------------------------------------------ strip */}
      {slides.length > 1 && (
        <div className="flex items-center gap-2">
          {overflows && (
            <button
              type="button"
              onClick={() => scrollStrip(-1)}
              aria-label="Scroll thumbnails left"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <div
            ref={stripRef}
            className="flex flex-1 gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {slides.map((slide, i) => {
              const isActive = i === active;
              return (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => {
                    setActive(i);
                    if (slide.kind === "video") setLightbox(slide);
                  }}
                  aria-label={
                    slide.kind === "video"
                      ? `Play video ${i + 1} of ${slides.length}`
                      : `Show image ${i + 1} of ${slides.length}`
                  }
                  aria-current={isActive ? "true" : undefined}
                  className={`relative aspect-[16/10] shrink-0 grow-0 basis-[calc((100%-1rem)/3)] overflow-hidden rounded-lg bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:basis-[calc((100%-2rem)/5)] ${
                    isActive
                      ? "ring-2 ring-emerald-600 ring-offset-2 ring-offset-background"
                      : "opacity-80 ring-1 ring-[var(--border)] hover:opacity-100"
                  }`}
                >
                  {slide.kind === "image" ? (
                    <img
                      src={slide.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-zinc-900">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-900">
                        <Play className="ml-px h-3.5 w-3.5" fill="currentColor" />
                      </span>
                    </span>
                  )}
                  {slide.kind === "video" && (
                    <span className="absolute inset-0 bg-black/10" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {overflows && (
            <button
              type="button"
              onClick={() => scrollStrip(1)}
              aria-label="Scroll thumbnails right"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <GalleryLightbox slide={lightbox} onClose={() => setLightbox(null)} />
    </section>
  );
}
