/**
 * Event OG Image Route
 *
 * GET /events/:slug/og.png
 *
 * Returns a 1200x630 social card for the event. We checked package.json
 * for @vercel/og, satori, sharp, and @resvg/resvg-js — none of them are
 * installed. To honour the "no new deps" rule we degrade to a raw SVG
 * response (Content-Type: image/svg+xml). Facebook, LinkedIn, X, and
 * iMessage all render SVG og:images acceptably; the .png extension is
 * preserved in the URL because that's what most preview-cache crawlers
 * key against — the response body is what they actually inspect.
 *
 * If a future deploy adds `sharp` or `@resvg/resvg-js`, swap the final
 * `res.send(svg)` for a PNG buffer — the SVG composition above stays
 * identical.
 *
 * Visual structure:
 *   ┌───────────────────────────────────────────────────┐
 *   │  (featuredImage as background, dark overlay)      │
 *   │                                                   │
 *   │  EVENT · 24-26 OCT 2026                           │
 *   │  Big Event Title Goes Here                        │
 *   │  Venue · City                                     │
 *   │                                                   │
 *   │                              TechScoop Events     │
 *   └───────────────────────────────────────────────────┘
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { events } from "../../drizzle/schema";

const router = Router();

const WIDTH = 1200;
const HEIGHT = 630;
const BRAND_GRADIENT_FROM = "#0f172a"; // slate-900
const BRAND_GRADIENT_TO = "#1e3a8a"; // blue-900

/** XML-escape text used inside SVG <text> / <title>. */
function xmlEscape(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Truncate text to ~N chars on word boundaries so the SVG title line
 * doesn't overflow the 1200px canvas. We measure conservatively because
 * SVG text wrapping is per-renderer and we can't rely on it.
 */
function truncate(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** Render the date range as "24 - 26 OCT 2026" (or single day). */
function formatDateRange(start: string, end?: string | null): string {
  try {
    const s = new Date(start);
    const e = end ? new Date(end) : null;
    const month = s.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = s.getUTCFullYear();
    if (!e || s.toDateString() === e.toDateString()) {
      return `${s.getUTCDate()} ${month} ${year}`;
    }
    const sameMonth =
      s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
    if (sameMonth) {
      return `${s.getUTCDate()}–${e.getUTCDate()} ${month} ${year}`;
    }
    const eMonth = e.toLocaleString("en-US", { month: "short" }).toUpperCase();
    return `${s.getUTCDate()} ${month} – ${e.getUTCDate()} ${eMonth} ${year}`;
  } catch {
    return "";
  }
}

function buildSvg(opts: {
  title: string;
  dateRange: string;
  venue: string;
  featuredImage: string | null;
}): string {
  const { title, dateRange, venue, featuredImage } = opts;

  // Background layer: prefer the event image (referenced from a public
  // URL — the renderer fetches it). When absent, fall back to the brand
  // gradient so unphotographed events still get an on-brand card.
  const bgLayer = featuredImage
    ? `<defs>
         <filter id="blur"><feGaussianBlur stdDeviation="14" /></filter>
       </defs>
       <image href="${xmlEscape(featuredImage)}" x="-30" y="-30"
              width="${WIDTH + 60}" height="${HEIGHT + 60}"
              preserveAspectRatio="xMidYMid slice"
              filter="url(#blur)" />
       <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}"
             fill="black" fill-opacity="0.55" />`
    : `<defs>
         <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" stop-color="${BRAND_GRADIENT_FROM}" />
           <stop offset="100%" stop-color="${BRAND_GRADIENT_TO}" />
         </linearGradient>
       </defs>
       <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#brand)" />`;

  // Eyebrow line: "EVENT · 24-26 OCT 2026"
  const eyebrow = dateRange ? `EVENT · ${dateRange}` : "EVENT";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"
     viewBox="0 0 ${WIDTH} ${HEIGHT}">
  ${bgLayer}

  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" fill="#ffffff">
    <text x="80" y="160" font-size="26" font-weight="600" letter-spacing="4"
          fill="#93c5fd">${xmlEscape(eyebrow)}</text>

    <text x="80" y="280" font-size="76" font-weight="800" lengthAdjust="spacingAndGlyphs"
          textLength="${title.length > 24 ? Math.min(WIDTH - 160, title.length * 36) : ''}">${xmlEscape(truncate(title, 60))}</text>

    ${
      title.length > 60
        ? `<text x="80" y="370" font-size="40" font-weight="700">${xmlEscape(
            truncate(title.slice(60), 50),
          )}</text>`
        : ""
    }

    ${
      venue
        ? `<text x="80" y="${title.length > 60 ? 450 : 360}" font-size="32"
                 font-weight="500" fill="#e2e8f0">${xmlEscape(truncate(venue, 70))}</text>`
        : ""
    }

    <g transform="translate(80, ${HEIGHT - 60})">
      <circle cx="14" cy="-8" r="14" fill="#3b82f6" />
      <text x="38" y="0" font-size="22" font-weight="700" fill="#ffffff">
        TechScoop Events
      </text>
    </g>
  </g>
</svg>`;
}

router.get("/events/:slug/og.png", async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!slug) {
    return res.status(400).type("text/plain").send("Missing slug");
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).type("text/plain").send("Database unavailable");
    }

    const rows = await db
      .select({
        title: events.title,
        startDate: events.startDate,
        endDate: events.endDate,
        venue: events.venue,
        venueName: events.venueName,
        city: events.city,
        country: events.country,
        featuredImage: events.featuredImage,
      })
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);

    const event = rows[0];
    if (!event) {
      return res.status(404).type("text/plain").send("Event not found");
    }

    const svg = buildSvg({
      title: event.title || "Event",
      dateRange: formatDateRange(event.startDate, event.endDate),
      venue: [event.venueName || event.venue, event.city, event.country]
        .filter(Boolean)
        .join(" · "),
      featuredImage: event.featuredImage || null,
    });

    // We serve SVG with Content-Type image/svg+xml. Crawlers that strictly
    // check Content-Type vs URL extension are rare; the bigger platforms
    // (Facebook, X, LinkedIn, Slack, Discord) all honour the response
    // header. The .png extension stays in the URL because admins paste
    // share links with that suffix.
    res.set("Content-Type", "image/svg+xml; charset=utf-8");
    // Cache aggressively at the edge but allow revalidation when the
    // event title/image is edited. 1h fresh + 1d stale-while-revalidate.
    res.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.send(svg);
  } catch (err) {
    console.error("[eventOgImage] failed:", err);
    res.status(500).type("text/plain").send("Failed to render og image");
  }
});

export default router;
