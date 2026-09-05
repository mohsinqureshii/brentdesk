/**
 * EventCollage — the hero's photo montage.
 * ----------------------------------------------------------------------
 * The design shows three photographs in a slanted arrangement: one tall
 * tile on the left, two stacked on the right, the whole block sheared a
 * few degrees. It is drawn as a CSS grid whose wrapper carries
 * `skewX(-6deg)` and whose tile contents carry the inverse `skewX(6deg)`,
 * so the frames slant but the photography inside stays upright.
 *
 * MOST EVENTS HAVE NO PHOTOS. That is the normal case in this dataset
 * (see EventVisual.tsx), so the collage is built to look deliberate at
 * zero images: every empty tile is filled with an `EventFallbackTile`
 * gradient, each seeded differently so the three tiles don't repeat.
 *
 * Media comes from the same source as the old gallery block — the
 * event's `featuredImage` followed by `events.getGallery` rows — via the
 * shared `buildSlides`, so captions, video detection and the lightbox
 * behave identically to before.
 */

import { useMemo, useState } from "react";
import { Play } from "lucide-react";

import { useT } from "@/lib/i18n";

import {
  buildSlides,
  GalleryLightbox,
  type GalleryRow,
  type GallerySlide,
} from "./EventGallery";
import { EventFallbackTile } from "./EventVisual";

export interface CollageEvent {
  id: number;
  title: string;
  slug: string;
  type?: string | null;
  featuredImage?: string | null;
  featuredImageCredit?: string | null;
  featuredImageSource?: string | null;
  featuredImageLicense?: string | null;
}

/** One tile: a real photo/video when we have one, a gradient otherwise. */
function CollageTile({
  slide,
  event,
  seed,
  index,
  total,
  onOpen,
  className,
}: {
  slide: GallerySlide | null;
  event: CollageEvent;
  seed: string;
  index: number;
  total: number;
  onOpen: (slide: GallerySlide) => void;
  className: string;
}) {
  const t = useT();
  // The wrapper is sheared; tile contents are counter-sheared and scaled
  // slightly so the slant never exposes a corner of the frame.
  const inner = "h-full w-full [transform:skewX(8deg)_scale(1.16)] origin-center";

  if (!slide) {
    // `hero` carries no caption of its own, so the label is drawn here —
    // in the tile's own unscaled box, where the shear cannot clip it.
    // Only the largest tile is labelled: repeating the event name on all
    // three reads as a rendering fault, not a placeholder.
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-[var(--border)] ${className}`}
      >
        <div className={inner}>
          <EventFallbackTile
            title={event.title}
            slug={seed}
            type={event.type}
            variant="hero"
            interactive={false}
          />
        </div>
        {index === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 [transform:skewX(8deg)]">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
              {event.type
                ? String(event.type).replace(/_/g, " ")
                : t("events.event")}
            </span>
            <span className="mt-1 block line-clamp-2 text-xl font-black leading-tight tracking-tight text-white/90 drop-shadow-sm">
              {event.title}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(slide)}
      aria-label={
        slide.kind === "video"
          ? t("events.playVideoN", { n: index + 1, total })
          : t("events.viewLarger", { name: slide.alt })
      }
      className={`group relative overflow-hidden rounded-xl border border-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      <div className={inner}>
        {slide.kind === "image" ? (
          <img
            src={slide.url}
            alt={slide.alt}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-zinc-950">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-zinc-900 shadow-lg">
              <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
            </span>
          </span>
        )}
      </div>
    </button>
  );
}

export default function EventCollage({
  event,
  rows,
  className = "",
}: {
  event: CollageEvent;
  rows: GalleryRow[];
  className?: string;
}) {
  const t = useT();
  const slides = useMemo(() => buildSlides(event, rows || []), [event, rows]);
  const [lightbox, setLightbox] = useState<GallerySlide | null>(null);

  // Exactly three slots — real media first, gradients after.
  const tiles: Array<GallerySlide | null> = [
    slides[0] ?? null,
    slides[1] ?? null,
    slides[2] ?? null,
  ];

  // Distinct seeds so two empty tiles never draw the same gradient.
  const seeds = [event.slug, `${event.slug}-b`, `${event.slug}-c`];

  const showsFeatured = tiles.some((t) => t?.isFeaturedImage);

  return (
    <div className={className}>
      {/* Per the design: a tall sheared lead tile on the left with two
          stacked tiles to its right, the block running off the right edge
          of the page rather than stopping at the container. The negative
          right margin produces that bleed; the page shell clips it so it
          never creates a horizontal scrollbar. The shear only reads as
          deliberate over photography — with gradient placeholders it looks
          like decoration — so it is applied at the wrapper and undone on
          each tile's contents. */}
      <div className="-mr-6 h-full [transform:skewX(-8deg)] sm:-mr-10 lg:-mr-16">
        <div className="grid h-[17rem] grid-cols-[minmax(0,54fr)_minmax(0,46fr)] grid-rows-2 gap-2.5 sm:h-[20rem] lg:h-full lg:min-h-[21rem] lg:max-h-[30rem]">
          <CollageTile
            slide={tiles[0]}
            event={event}
            seed={seeds[0]}
            index={0}
            total={3}
            onOpen={setLightbox}
            className="row-span-2 h-full w-full"
          />
          <CollageTile
            slide={tiles[1]}
            event={event}
            seed={seeds[1]}
            index={1}
            total={3}
            onOpen={setLightbox}
            className="h-full w-full"
          />
          <CollageTile
            slide={tiles[2]}
            event={event}
            seed={seeds[2]}
            index={2}
            total={3}
            onOpen={setLightbox}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Free licences (Wikimedia Commons and similar) require a visible
          credit wherever the photo appears. */}
      {showsFeatured && event.featuredImageCredit ? (
        <p className="mt-3 text-right text-[11px] text-muted-foreground">
          {t("events.photoCredit")}{" "}
          {event.featuredImageSource ? (
            <a
              href={event.featuredImageSource}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {event.featuredImageCredit}
            </a>
          ) : (
            event.featuredImageCredit
          )}
          {event.featuredImageLicense ? ` · ${event.featuredImageLicense}` : ""}
        </p>
      ) : null}

      <GalleryLightbox slide={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

/**
 * The remaining gallery photos, as a horizontal strip under the Overview
 * panel. Keeps the caption + video-lightbox behaviour the old gallery
 * block owned, now that the hero shows only three tiles.
 */
export function EventPhotoStrip({
  event,
  rows,
}: {
  event: CollageEvent;
  rows: GalleryRow[];
}) {
  const t = useT();
  const slides = useMemo(() => buildSlides(event, rows || []), [event, rows]);
  const [lightbox, setLightbox] = useState<GallerySlide | null>(null);

  // The hero collage already shows the first three; a strip that only
  // repeats them adds nothing.
  if (slides.length <= 3) return null;

  return (
    <section aria-label={t("events.eventPhotos")}>
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
        {t("events.photos")}
      </h2>
      <div className="-mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {slides.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            onClick={() => setLightbox(slide)}
            className="group shrink-0 snap-start text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={
              slide.kind === "video"
                ? t("events.playVideoN", { n: i + 1, total: slides.length })
                : t("events.viewPhotoN", { n: i + 1, total: slides.length })
            }
          >
            <span className="relative block h-40 w-60 overflow-hidden rounded-xl ring-1 ring-[var(--border)] sm:h-44 sm:w-72">
              {slide.kind === "image" ? (
                <img
                  src={slide.url}
                  alt={slide.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-zinc-900">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-zinc-900">
                    <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                  </span>
                </span>
              )}
            </span>
            {slide.caption && (
              <span className="mt-1.5 block max-w-60 truncate text-xs text-muted-foreground sm:max-w-72">
                {slide.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      <GalleryLightbox slide={lightbox} onClose={() => setLightbox(null)} />
    </section>
  );
}
