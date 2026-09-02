import { sql } from "drizzle-orm";
import { articles } from "../../drizzle/schema";

/**
 * Reader-facing recency ordering for article lists.
 *
 * `publishedAt` is when BrentDesk published a piece and `eventDate` is when
 * the development happened. Sorting on publishedAt is right for a newsroom
 * that publishes as news breaks, and wrong for an archive assembled in one
 * sitting: 115 articles then share a publication timestamp to the second,
 * so the order degenerates to insertion order and a November 2025 story can
 * lead the homepage over one from August 2026.
 *
 * Order by when the news happened, falling back to publication for anything
 * with no event date. `id` breaks ties so paging is stable — several stories
 * legitimately share a date.
 *
 * Deliberately NOT used for sitemaps and feeds, where `lastmod` and
 * `pubDate` describe the publication record and must stay truthful.
 */
export const newsRecencyDesc = sql`COALESCE(${articles.eventDate}, ${articles.publishedAt}) DESC, ${articles.id} DESC`;

/**
 * The same recency, without a direction, for call sites that apply asc/desc
 * dynamically from a sort parameter.
 */
export const newsRecency = sql`COALESCE(${articles.eventDate}, ${articles.publishedAt})`;
