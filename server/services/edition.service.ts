/**
 * Edition Service
 * ----------------------------------------------------------------------
 * Resolves the active edition for an incoming request. Used by the
 * Express middleware (req.edition) and the tRPC context (ctx.edition)
 * so listing queries can bias their ORDER BY toward the visitor's
 * country.
 *
 * Resolution order, highest priority first:
 *   1. `tsEdition` cookie (explicit visitor choice, sticky)
 *   2. `CF-IPCountry` header (Cloudflare geo, automatic)
 *   3. International (fallback for visitors whose country has no
 *      configured edition)
 *
 * Bots ALWAYS get International, regardless of cookie/geo. This is
 * the cloaking-safety lever — Googlebot sees one consistent view of
 * every URL.
 *
 * The active edition list is cached in-process for 60s. Editions
 * change rarely (admin-managed) and looking them up on every request
 * would add a needless DB round-trip per page load.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { editions, countries } from "../../drizzle/schema";

export interface ResolvedEdition {
  id: number;
  slug: string;
  countryId: number | null;       // null only for International
  name: string;
  isInternational: boolean;
  supportedLocales: string[];
  flagEmoji: string | null;
}

interface EditionRow {
  id: number;
  slug: string;
  countryId: number | null;
  name: string;
  isInternational: number;
  supportedLocales: unknown;
  flagEmoji: string | null;
  iso2: string | null;
}

// ============================================================
// In-process cache (60s)
// ============================================================
let cache: { rows: EditionRow[]; ts: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function loadActiveEditions(): Promise<EditionRow[]> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) return cache.rows;

  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: editions.id,
      slug: editions.slug,
      countryId: editions.countryId,
      name: editions.name,
      isInternational: editions.isInternational,
      supportedLocales: editions.supportedLocales,
      flagEmoji: editions.flagEmoji,
      iso2: countries.iso2,
    })
    .from(editions)
    .leftJoin(countries, eq(editions.countryId, countries.id))
    .where(eq(editions.isActive, 1));

  cache = { rows: rows as EditionRow[], ts: now };
  return cache.rows;
}

export function invalidateEditionCache() {
  cache = null;
}

function toResolved(r: EditionRow): ResolvedEdition {
  return {
    id: r.id,
    slug: r.slug,
    countryId: r.countryId,
    name: r.name,
    isInternational: !!r.isInternational,
    supportedLocales: Array.isArray(r.supportedLocales)
      ? (r.supportedLocales as string[])
      : ["en"],
    flagEmoji: r.flagEmoji,
  };
}

// ============================================================
// Bot detection — user-agent based
// ============================================================
// Crawlers always get the International edition. Same content
// regardless of geo so Google never sees us serve different
// HTML to different IPs (cloaking risk).
//
// This is a deliberately broad list. False positives (real users
// flagged as bots) only mean they get International — minor UX hit.
// False negatives (bots not flagged) only mean they get personalized
// content from their IP — also fine, just less consistent.
// ============================================================
const BOT_UA_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,           // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /applebot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /slackbot/i,
  /discordbot/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /screaming\s*frog/i,
  /sitebulb/i,
  /lighthouse/i,
  /chrome-lighthouse/i,
  /gptbot/i,
  /chatgpt-user/i,
  /claudebot/i,
  /perplexitybot/i,
  /\bcrawler\b/i,
  /\bspider\b/i,
  /\bbot\b/i,
];

export function isBotUserAgent(ua: string | undefined): boolean {
  if (!ua) return false;
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}

// ============================================================
// Cookie parsing (zero-dep, no cookie-parser middleware needed)
// ============================================================
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// ============================================================
// Main resolver
// ============================================================
export async function resolveEdition(opts: {
  cookieHeader: string | undefined;
  cfCountry: string | undefined;
  userAgent: string | undefined;
}): Promise<ResolvedEdition> {
  const rows = await loadActiveEditions();
  if (rows.length === 0) {
    // No editions configured — return a synthetic International so
    // callers can still rely on `ctx.edition` being non-null.
    return {
      id: 0, slug: "intl", countryId: null,
      name: "International", isInternational: true,
      supportedLocales: ["en"], flagEmoji: "🌍",
    };
  }

  const intl = rows.find((r) => r.isInternational) || rows[0];

  // 1. Bots always get International, no matter what cookie / IP says.
  if (isBotUserAgent(opts.userAgent)) {
    return toResolved(intl);
  }

  // 2. Explicit cookie override wins — visitor picked this edition.
  if (opts.cookieHeader) {
    const cookies = parseCookies(opts.cookieHeader);
    const slug = cookies.tsEdition;
    if (slug) {
      const match = rows.find((r) => r.slug === slug);
      if (match) return toResolved(match);
    }
  }

  // 3. Cloudflare geo. CF-IPCountry is a 2-letter ISO code (or "T1"
  //    for Tor / "XX" when unknown). Look up by iso2.
  const cf = (opts.cfCountry || "").toUpperCase();
  if (cf && cf.length === 2 && cf !== "XX" && cf !== "T1") {
    const match = rows.find((r) => r.iso2 === cf);
    if (match) return toResolved(match);
  }

  // 4. Fall back to International.
  return toResolved(intl);
}
