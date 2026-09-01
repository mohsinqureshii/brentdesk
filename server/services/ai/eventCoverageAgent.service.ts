/**
 * Event Coverage Agent
 * ----------------------------------------------------------------------
 * Automated web sweep for events in live-coverage mode. For each live
 * event it pulls Google News RSS for the event's name, drops items we
 * have already seen (dedup on sourceUrl), asks the LLM to condense the
 * fresh ones into short live-blog drafts, and files them into
 * event_live_posts as source='ai', approvalStatus='pending'.
 *
 * Nothing this agent writes is publicly visible: drafts surface in the
 * reporter console's suggestion queue and only go live when a human
 * approves them (see events.router approveLiveSuggestion).
 *
 * Scheduling: startServer() runs runEventCoverageSweep() every
 * 15 minutes in production. The sweep is cheap when nothing is live —
 * one indexed query, zero network calls.
 */

import { getDb } from "../../db";
import { events, eventLivePosts } from "../../../drizzle/schema";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { invokeLLM } from "../../_core/llm";

const MAX_EVENTS_PER_SWEEP = 3;
const MAX_SUGGESTIONS_PER_EVENT = 3;
const RSS_ITEM_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface RssItem {
  title: string;
  link: string;
  pubDate: Date | null;
  sourceName: string | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of blocks) {
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1];
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
    const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1];
    if (!title || !link) continue;
    const parsed = pubDate ? new Date(pubDate) : null;
    items.push({
      title: decodeEntities(title),
      link: decodeEntities(link),
      pubDate: parsed && !isNaN(parsed.getTime()) ? parsed : null,
      sourceName: source ? decodeEntities(source) : null,
    });
  }
  return items;
}

async function fetchEventNews(eventTitle: string): Promise<RssItem[]> {
  const q = encodeURIComponent(`"${eventTitle}"`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; TechScoopCoverageBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Google News RSS ${res.status}`);
  const xml = await res.text();
  const cutoff = Date.now() - RSS_ITEM_MAX_AGE_MS;
  return parseRss(xml)
    .filter(i => !i.pubDate || i.pubDate.getTime() >= cutoff)
    .slice(0, 8);
}

interface DraftSuggestion {
  headline: string;
  body: string;
  postType: "update" | "breaking" | "funding" | "session";
}

async function draftSuggestions(
  eventTitle: string,
  items: RssItem[],
): Promise<Array<DraftSuggestion & { sourceUrl: string }>> {
  const list = items
    .map((i, n) => `${n + 1}. "${i.title}"${i.sourceName ? ` — ${i.sourceName}` : ""}`)
    .join("\n");

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You write terse live-blog updates for a tech news site covering a live event. " +
          "For each headline given, produce a 1-2 sentence factual update suitable for a live feed. " +
          "Never invent facts beyond the headline; attribute claims to the source when uncertain " +
          '("According to <source>, ..."). Classify each as postType: "update" (default), ' +
          '"breaking" (major announcements only), "funding" (investment/funding news), or "session" (talks/panels).',
      },
      {
        role: "user",
        content:
          `Event: ${eventTitle}\n\nHeadlines:\n${list}\n\n` +
          "Return ONLY a JSON array, one object per headline, in the same order: " +
          '[{"headline": string (<=120 chars, punchy), "body": string, "postType": string}]',
      },
    ],
  });

  const raw = (result as any)?.choices?.[0]?.message?.content ?? "";
  const jsonText = raw.match(/\[[\s\S]*\]/)?.[0];
  if (!jsonText) return [];
  let parsed: any[];
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }

  const out: Array<DraftSuggestion & { sourceUrl: string }> = [];
  for (let n = 0; n < Math.min(parsed.length, items.length); n++) {
    const p = parsed[n];
    if (!p?.body) continue;
    const postType = ["update", "breaking", "funding", "session"].includes(p.postType)
      ? p.postType
      : "update";
    out.push({
      headline: String(p.headline ?? items[n].title).slice(0, 500),
      body: String(p.body).slice(0, 2000),
      postType,
      sourceUrl: items[n].link,
    });
  }
  return out;
}

/** Events currently inside their live window (mirrors listLiveNow). */
async function findLiveEvents() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: events.id, title: events.title, slug: events.slug })
    .from(events)
    .where(and(
      isNotNull(events.publishedAt),
      sql`(
        ${events.liveModeForce} = 'live'
        OR (
          ${events.liveModeForce} IS NULL
          AND NOW() >= COALESCE(${events.liveModeStartOverride}, DATE_SUB(${events.startDate}, INTERVAL 2 HOUR))
          AND NOW() <= COALESCE(${events.liveModeEndOverride}, DATE_ADD(${events.endDate}, INTERVAL 6 HOUR))
        )
      )`,
    ))
    .limit(MAX_EVENTS_PER_SWEEP);
  return rows;
}

export async function runEventCoverageSweep(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const liveEvents = await findLiveEvents();
  if (!liveEvents.length) return;

  for (const ev of liveEvents) {
    try {
      const news = await fetchEventNews(ev.title);
      if (!news.length) continue;

      // Dedup against everything we ever filed for this event,
      // regardless of approval outcome — a rejected suggestion must
      // not come back on the next sweep.
      const seen = await db
        .select({ sourceUrl: eventLivePosts.sourceUrl })
        .from(eventLivePosts)
        .where(and(eq(eventLivePosts.eventId, ev.id), isNotNull(eventLivePosts.sourceUrl)));
      const seenSet = new Set(seen.map(s => s.sourceUrl));
      const fresh = news.filter(i => !seenSet.has(i.link)).slice(0, MAX_SUGGESTIONS_PER_EVENT);
      if (!fresh.length) continue;

      const drafts = await draftSuggestions(ev.title, fresh);
      for (const d of drafts) {
        await (db as any).insert(eventLivePosts).values({
          eventId: ev.id,
          authorId: 0, // system — no user attribution on AI drafts
          headline: d.headline,
          body: d.body,
          postType: d.postType,
          source: "ai",
          approvalStatus: "pending",
          sourceUrl: d.sourceUrl,
        } as any);
      }
      if (drafts.length) {
        console.log(`[CoverageAgent] ${ev.slug}: filed ${drafts.length} suggestion(s) for review`);
      }
    } catch (err) {
      console.error(`[CoverageAgent] sweep failed for ${ev.slug}:`, (err as Error).message);
    }
  }
}
