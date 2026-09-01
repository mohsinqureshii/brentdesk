/**
 * Event RSS Feeds
 *
 * Two RSS 2.0 routes share this file because they hit the same tables
 * and use the same XML escaper / item builder:
 *
 *   GET /events/:slug/feed.xml — live posts for one event, newest first,
 *                                 capped at 100 items. Powers Feedly,
 *                                 NetNewsWire, IFTTT for live coverage.
 *
 *   GET /events/feed.xml       — all upcoming events, ordered by
 *                                 startDate ASC, capped at 50 items.
 *                                 Linked from the Events index page.
 *
 * The per-event feed treats every live post as a <channel><item>. We
 * generate stable GUIDs from (eventId, postId) so feed readers don't
 * duplicate items when posts are edited.
 *
 * The sitewide feed treats each upcoming event as an item. We pick
 * startDate as <pubDate> because that's what most readers sort on, and
 * include the venue + countdown in the description.
 */

import { publication, getBaseUrl } from "../../shared/publication";
import { Router } from "express";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../db";
import { events, eventLivePosts } from "../../drizzle/schema";
import { workflowService } from "../services/workflow.service";

const router = Router();

const SITE_ORIGIN = getBaseUrl();
const SITE = publication.name;

/** Escape `& < > " '` for embedding text in XML element bodies. */
function xmlEscape(s: string | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RFC-822 / RFC-2822 date format, required by RSS 2.0 <pubDate>. */
function rfc822(input: Date | string | null | undefined): string {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

function setRssHeaders(res: any) {
  res.set("Content-Type", "application/rss+xml; charset=utf-8");
  // 5-min fresh + 1h stale-while-revalidate. Live-coverage feeds need to
  // be quick to update; non-live event-list feeds rarely change minute
  // to minute either.
  res.set(
    "Cache-Control",
    "public, max-age=300, s-maxage=300, stale-while-revalidate=3600"
  );
  res.set("X-Robots-Tag", "index, follow");
}

/**
 * Per-event live feed — one item per live post.
 */
router.get("/events/:slug/feed.xml", async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!slug) {
    return res.status(400).type("text/plain").send("Missing slug");
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).type("text/plain").send("Database unavailable");
    }

    const eventRows = await db
      .select()
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);
    const event = eventRows[0];
    if (!event) {
      return res.status(404).type("text/plain").send("Event not found");
    }

    // Hide soft-deleted posts (isDeleted = 1) — the public live blog
    // applies the same filter.
    const posts = await db
      .select()
      .from(eventLivePosts)
      .where(
        and(eq(eventLivePosts.eventId, event.id), eq(eventLivePosts.isDeleted, 0))
      )
      .orderBy(desc(eventLivePosts.publishedAt))
      .limit(100);

    const eventUrl = `${SITE_ORIGIN}/events/${event.slug}`;
    const feedUrl = `${SITE_ORIGIN}/events/${event.slug}/feed.xml`;
    const lastBuildDate = rfc822(posts[0]?.publishedAt || event.updatedAt || new Date());

    const items = posts
      .map((p) => {
        const headline =
          p.headline || (p.body ? p.body.replace(/\s+/g, " ").slice(0, 120) : "Live update");
        const link = `${eventUrl}#post-${p.id}`;
        const description = [
          p.body || "",
          p.imageUrl ? `\n\n<img src="${p.imageUrl}" />` : "",
        ].join("");
        return [
          "    <item>",
          `      <title>${xmlEscape(headline)}</title>`,
          `      <link>${xmlEscape(link)}</link>`,
          `      <guid isPermaLink="false">livepost-${event.id}-${p.id}</guid>`,
          `      <pubDate>${rfc822(p.publishedAt)}</pubDate>`,
          `      <description>${xmlEscape(description)}</description>`,
          p.postType ? `      <category>${xmlEscape(p.postType)}</category>` : "",
          "    </item>",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(event.title)} — Live coverage</title>
    <link>${xmlEscape(eventUrl)}</link>
    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(
      event.shortDescription || `Live coverage of ${event.title} from ${SITE} correspondents.`,
    )}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>5</ttl>
${items}
  </channel>
</rss>`;

    setRssHeaders(res);
    res.send(xml);
  } catch (err) {
    console.error("[eventLiveFeed:per-event] failed:", err);
    res.status(500).type("text/plain").send("Failed to generate feed");
  }
});

/**
 * Sitewide upcoming-events feed — one item per published, future event.
 */
router.get("/events/feed.xml", async (_req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).type("text/plain").send("Database unavailable");
    }

    const publishedStatus = await workflowService.getStatusBySlug(
      "editorial",
      "published",
    );
    if (!publishedStatus) {
      return res.status(503).type("text/plain").send("Workflow not configured");
    }

    const nowIso = new Date().toISOString().slice(0, 19).replace("T", " ");

    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        tagline: events.tagline,
        shortDescription: events.shortDescription,
        description: events.description,
        startDate: events.startDate,
        endDate: events.endDate,
        venue: events.venue,
        venueName: events.venueName,
        city: events.city,
        country: events.country,
        publishedAt: events.publishedAt,
        type: events.type,
      })
      .from(events)
      .where(
        and(eq(events.statusId, publishedStatus.id), gte(events.startDate, nowIso)),
      )
      .orderBy(asc(events.startDate))
      .limit(50);

    const feedUrl = `${SITE_ORIGIN}/events/feed.xml`;
    const channelLink = `${SITE_ORIGIN}/events`;

    const items = rows
      .map((e) => {
        const link = `${SITE_ORIGIN}/events/${e.slug}`;
        const where = [e.venueName || e.venue, e.city, e.country]
          .filter(Boolean)
          .join(", ");
        const when = new Date(e.startDate).toUTCString();
        const desc =
          (e.shortDescription || e.tagline || e.description || "")
            .toString()
            .slice(0, 600) + (where ? `\n\nVenue: ${where}\nStarts: ${when}` : "");
        return [
          "    <item>",
          `      <title>${xmlEscape(e.title)}</title>`,
          `      <link>${xmlEscape(link)}</link>`,
          `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
          `      <pubDate>${rfc822(e.publishedAt || e.startDate)}</pubDate>`,
          `      <description>${xmlEscape(desc)}</description>`,
          e.type ? `      <category>${xmlEscape(e.type)}</category>` : "",
          "    </item>",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE} — Upcoming Industry Events</title>
    <link>${xmlEscape(channelLink)}</link>
    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml" />
    <description>Upcoming industry conferences, expos, and forums tracked by ${SITE}.</description>
    <language>en-us</language>
    <lastBuildDate>${rfc822(new Date())}</lastBuildDate>
    <ttl>30</ttl>
${items}
  </channel>
</rss>`;

    setRssHeaders(res);
    res.send(xml);
  } catch (err) {
    console.error("[eventLiveFeed:sitewide] failed:", err);
    res.status(500).type("text/plain").send("Failed to generate feed");
  }
});

export default router;
