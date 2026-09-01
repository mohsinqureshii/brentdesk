/**
 * EventVisual — the event imagery system.
 * ----------------------------------------------------------------------
 * Most events in the database have no `featuredImage` (a previous seed
 * wrote `source.unsplash.com` URLs against an endpoint Unsplash has since
 * retired, and those dead URLs are being cleared server-side). So "no
 * photo" is the NORMAL case here, not the edge case.
 *
 * Rather than papering over that with a grey box and a camera icon, this
 * module generates a **designed** tile per event:
 *
 *   - a deterministic on-brand gradient chosen from a curated ramp set,
 *     keyed off the event slug so a given event always looks identical
 *     across renders, sessions, and pages (no flicker, no lottery);
 *   - a low-contrast geometric pattern (grid / dots / rays) — also
 *     deterministic — so two neighbouring cards from the same ramp still
 *     read as distinct;
 *   - a large lucide watermark chosen from the event *type*;
 *   - a type kicker + typographic monogram derived from the title.
 *
 * The result should look like a deliberate editorial treatment, not a
 * missing asset.
 *
 * `<EventMedia>` also guards real photography: any `<img>` that 404s,
 * times out, or is hot-linked from a dead host swaps to the generated
 * tile via `onError`, so a broken-image glyph can never reach the page.
 */

import { useEffect, useState } from "react";
import {
  Code2,
  Landmark,
  MonitorPlay,
  Presentation,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

// ----------------------------------------------------------------------
// Type vocabulary
// ----------------------------------------------------------------------

type IconCmp = React.ComponentType<{ className?: string; strokeWidth?: number }>;

/** Watermark glyph per event type. */
export const TYPE_ICON: Record<string, IconCmp> = {
  conference: Presentation,
  webinar: MonitorPlay,
  meetup: Users,
  workshop: Wrench,
  hackathon: Code2,
  summit: Landmark,
  other: Sparkles,
};

export const TYPE_LABEL: Record<string, string> = {
  conference: "Conference",
  webinar: "Webinar",
  meetup: "Meetup",
  workshop: "Workshop",
  hackathon: "Hackathon",
  summit: "Summit",
  other: "Event",
};

export const FORMAT_LABEL: Record<string, string> = {
  in_person: "In-person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

export function typeIconFor(type: string | null | undefined): IconCmp {
  return TYPE_ICON[(type || "other").toLowerCase()] || TYPE_ICON.other;
}

export function typeLabelFor(type: string | null | undefined): string {
  const key = (type || "other").toLowerCase();
  return TYPE_LABEL[key] || key.replace(/_/g, " ");
}

// ----------------------------------------------------------------------
// Deterministic palette
// ----------------------------------------------------------------------

interface Ramp {
  /** Top-left stop. */
  from: string;
  /** Mid stop — keeps the ramp from going flat. */
  mid: string;
  /** Bottom-right stop. */
  to: string;
  /** Bloom colour behind the watermark. */
  glow: string;
}

/**
 * Eight ramps, all in `oklch()` (this project's colour space — see
 * index.css). Deliberately deep and desaturated at the dark end so white
 * type sits at AA contrast on every one of them, in both themes. The
 * tile is dark in light mode *and* dark mode by design: it behaves like
 * photography would, so the card composition doesn't change with theme.
 */
const RAMPS: Ramp[] = [
  // Indigo — the house primary
  { from: "oklch(0.44 0.17 264)", mid: "oklch(0.32 0.13 268)", to: "oklch(0.19 0.07 272)", glow: "oklch(0.68 0.19 262)" },
  // Violet
  { from: "oklch(0.44 0.18 305)", mid: "oklch(0.31 0.14 300)", to: "oklch(0.19 0.08 295)", glow: "oklch(0.70 0.20 305)" },
  // Teal
  { from: "oklch(0.46 0.12 196)", mid: "oklch(0.33 0.09 200)", to: "oklch(0.19 0.05 205)", glow: "oklch(0.72 0.14 195)" },
  // Ember
  { from: "oklch(0.50 0.15 52)", mid: "oklch(0.35 0.12 42)", to: "oklch(0.21 0.07 34)", glow: "oklch(0.76 0.16 62)" },
  // Rose
  { from: "oklch(0.46 0.17 16)", mid: "oklch(0.33 0.13 10)", to: "oklch(0.20 0.07 4)", glow: "oklch(0.70 0.19 18)" },
  // Emerald
  { from: "oklch(0.45 0.13 160)", mid: "oklch(0.32 0.10 163)", to: "oklch(0.19 0.06 168)", glow: "oklch(0.72 0.16 158)" },
  // Graphite blue — the quiet one
  { from: "oklch(0.40 0.06 250)", mid: "oklch(0.28 0.04 252)", to: "oklch(0.17 0.02 255)", glow: "oklch(0.62 0.09 248)" },
  // Azure
  { from: "oklch(0.45 0.14 232)", mid: "oklch(0.32 0.11 238)", to: "oklch(0.19 0.06 244)", glow: "oklch(0.70 0.17 230)" },
];

/** FNV-1a — small, fast, and stable across engines. */
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Everything visual about an event's generated tile, derived purely from
 * its slug (+ type as a secondary salt). Same event → same tile, always.
 */
export interface EventVisualSpec {
  ramp: Ramp;
  /** Gradient angle in degrees. */
  angle: number;
  /** Which geometric overlay to draw. */
  pattern: 0 | 1 | 2;
}

export function eventVisual(
  seed: string | null | undefined,
  type?: string | null,
): EventVisualSpec {
  const h = hashString(`${seed || "event"}::${type || "other"}`);
  return {
    ramp: RAMPS[h % RAMPS.length],
    angle: [125, 145, 160, 110][(h >> 5) % 4],
    pattern: ((h >> 9) % 3) as 0 | 1 | 2,
  };
}

/** CSS for the geometric overlay. Kept subtle — texture, not decoration. */
function patternStyle(pattern: 0 | 1 | 2): React.CSSProperties {
  if (pattern === 0) {
    // Fine grid
    return {
      backgroundImage:
        "linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)",
      backgroundSize: "28px 28px",
    };
  }
  if (pattern === 1) {
    // Dot matrix
    return {
      backgroundImage:
        "radial-gradient(rgba(255,255,255,0.85) 1.1px, transparent 1.2px)",
      backgroundSize: "18px 18px",
    };
  }
  // Diagonal rays
  return {
    backgroundImage:
      "repeating-linear-gradient(115deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 14px)",
  };
}

/**
 * "Gitex Global 2026" → "GG"; "LEAP" → "LEAP"; "Web Summit Qatar" → "WSQ".
 * A short typographic mark so the tile has a focal point that isn't just
 * an icon. Years, articles and connectors are dropped.
 */
const MONOGRAM_STOPWORDS = new Set([
  "the", "a", "an", "and", "of", "for", "in", "on", "at", "to", "by",
  "with", "&", "de", "la", "el",
]);

export function eventMonogram(title: string | null | undefined): string {
  const raw = String(title || "").trim();
  if (!raw) return "TS";

  const words = raw
    // Strip punctuation by enumeration rather than a `\p{L}` negation —
    // the unicode regex flag needs an ES6+ target, and a plain [^A-Za-z]
    // class would mangle Arabic titles.
    .replace(/[.,:;!?'"“”‘’()[\]{}/\\|_@#*+~^=<>·—–]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .filter((w) => !/^\d{4}$/.test(w))
    .filter((w) => !MONOGRAM_STOPWORDS.has(w.toLowerCase()));

  if (words.length === 0) return raw.slice(0, 3).toUpperCase();

  // A brand-style all-caps token ("LEAP", "GITEX") is already the mark.
  const first = words[0];
  if (first.length >= 3 && first.length <= 6 && first === first.toUpperCase()) {
    return first;
  }

  const initials = words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return initials.length >= 2 ? initials : first.slice(0, 3).toUpperCase();
}

// ----------------------------------------------------------------------
// Image usability
// ----------------------------------------------------------------------

/**
 * Hosts known to be dead for this dataset. `source.unsplash.com` was
 * retired by Unsplash — every seeded URL pointing at it is a guaranteed
 * broken image, so we skip the network round-trip entirely rather than
 * waiting for `onError`. (The rows are being nulled server-side too;
 * this keeps already-cached clients honest in the meantime.)
 */
const DEAD_IMAGE_HOSTS = ["source.unsplash.com"];

export function isUsableImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;
  return !DEAD_IMAGE_HOSTS.some((host) => trimmed.includes(host));
}

// ----------------------------------------------------------------------
// The generated tile
// ----------------------------------------------------------------------

export type MediaVariant = "card" | "hero" | "compact" | "thumb";

interface FallbackProps {
  title: string;
  slug: string;
  type?: string | null;
  variant: MediaVariant;
  /** Adds the hover-scale transition. Parent must own `group`. */
  interactive?: boolean;
}

export function EventFallbackTile({
  title,
  slug,
  type,
  variant,
  interactive = true,
}: FallbackProps) {
  const { ramp, angle, pattern } = eventVisual(slug, type);
  const Icon = typeIconFor(type);
  const monogram = eventMonogram(title);
  const kicker = typeLabelFor(type);

  const iconSize =
    variant === "hero"
      ? "h-[22rem] w-[22rem] -right-16 -bottom-24"
      : variant === "thumb"
        ? "h-12 w-12 -right-1 -bottom-2"
        : variant === "compact"
          ? "h-32 w-32 -right-5 -bottom-8"
          : "h-52 w-52 -right-8 -bottom-12";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(${angle}deg, ${ramp.from} 0%, ${ramp.mid} 52%, ${ramp.to} 100%)`,
      }}
      aria-hidden="true"
    >
      {/* Texture */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={patternStyle(pattern)}
      />

      {/* Bloom — anchors the composition to the top-left, opposite the
          watermark, so the tile has a diagonal read. */}
      <div
        className={`absolute rounded-full opacity-40 blur-3xl ${
          variant === "thumb"
            ? "-left-3 -top-4 h-14 w-14 blur-xl"
            : "-left-10 -top-16 h-56 w-56"
        }`}
        style={{ backgroundColor: ramp.glow }}
      />

      {/* Type watermark */}
      <Icon
        className={`absolute text-white/[0.13] transition-transform duration-700 ease-out ${iconSize} ${
          interactive ? "group-hover:scale-110 group-hover:-rotate-3" : ""
        }`}
        strokeWidth={1}
      />

      {/* Bottom vignette so overlaid chrome stays legible */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

      {/* Typography — hero gets nothing here: its own overlay carries the
          title at display size, and a monogram underneath would double up. */}
      {variant === "card" && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
            {kicker}
          </span>
          <span className="mt-0.5 text-[2rem] font-black leading-none tracking-tight text-white/90 drop-shadow-sm">
            {monogram}
          </span>
        </div>
      )}

      {variant === "compact" && (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <span className="text-xl font-black leading-none tracking-tight text-white/80">
            {monogram}
          </span>
        </div>
      )}

      {/* Thumb — 40–56px squares in the sidebar. Only a centred mark
          fits; the kicker and a full-size monogram would be unreadable. */}
      {variant === "thumb" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black leading-none tracking-tight text-white/90">
            {monogram.slice(0, 3)}
          </span>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// EventMedia — photo when we have one, generated tile otherwise
// ----------------------------------------------------------------------

interface EventMediaProps {
  event: {
    title: string;
    slug: string;
    type?: string | null;
    featuredImage?: string | null;
  };
  variant?: MediaVariant;
  className?: string;
  /** `eager` for the hero, `lazy` everywhere else. */
  loading?: "eager" | "lazy";
  interactive?: boolean;
}

export function EventMedia({
  event,
  variant = "card",
  className = "",
  loading = "lazy",
  interactive = true,
}: EventMediaProps) {
  const src = event.featuredImage;
  const [failed, setFailed] = useState(false);

  // A different event can reuse this slot (grid re-render, filter change),
  // so the failure flag has to reset with the URL or a good photo would
  // inherit a stale failure.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showPhoto = isUsableImage(src) && !failed;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {showPhoto ? (
        <img
          src={src as string}
          alt={event.title}
          loading={loading}
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-transform duration-700 ease-out ${
            interactive ? "group-hover:scale-[1.06]" : ""
          }`}
        />
      ) : (
        <EventFallbackTile
          title={event.title}
          slug={event.slug}
          type={event.type}
          variant={variant}
          interactive={interactive}
        />
      )}
    </div>
  );
}
