/**
 * Publish Hooks
 * ----------------------------------------------------------------------
 * Single fan-out point invoked by every entity router/scheduler when an
 * item transitions to `published`. Handles two side-effects:
 *
 *   1. Sitemap freshness — debounced static-file regeneration into
 *      dist/public/ so the apex /sitemap-*.xml URLs (served by the
 *      Cloudflare seo-worker → /api/ origin → static fallback) reflect
 *      the new URL within ~10s of publish, regardless of CDN cache TTL.
 *
 *   2. Search-engine notification — calls notifySearchEngines with the
 *      correct routing per entity type:
 *        - article  → IndexNow + sitemap-ping + Google Indexing API (news)
 *        - job      → Google Indexing API (officially supported: JobPosting)
 *        - event    → Google Indexing API (officially supported: BroadcastEvent)
 *        - others   → IndexNow + sitemap-ping only
 *
 * All work is fire-and-forget; failures never block the publish flow.
 */

import { getBaseUrl } from "../../shared/publication";
import fs from "node:fs";
import path from "node:path";
import { notifySearchEngines } from "./indexingNotification.service";
import { seoService } from "./seo.service";

const BASE_URL = process.env.BASE_URL && process.env.BASE_URL.startsWith("http")
  ? process.env.BASE_URL
  : getBaseUrl();

export type PublishedEntityType =
  | "article"
  | "job"
  | "event"
  | "company"
  | "person"
  | "investor"
  | "accelerator"
  | "resource"
  | "research";

interface PublishedEvent {
  entityType: PublishedEntityType;
  entityId: number;
  url: string;
  title?: string;
  slug?: string;
  triggeredBy?: number;
  trigger?: "publish" | "transition" | "scheduled" | "bulk_publish" | "manual";
}

// ============================================================
// SITEMAP REGENERATION (DEBOUNCED)
// ============================================================

const PROJECT_ROOT = path.resolve(process.cwd());
const TARGET_DIRS = [
  path.resolve(PROJECT_ROOT, "client", "public"),
  path.resolve(PROJECT_ROOT, "dist", "public"),
].filter(p => {
  try { return fs.existsSync(p); } catch { return false; }
});

// Map entityType → list of sitemap files that must be regenerated
const ENTITY_TO_SITEMAPS: Record<PublishedEntityType, string[]> = {
  article:     ["articles", "news", "categories", "tags", "authors", "images"],
  job:         ["jobs"],
  event:       ["events"],
  company:     ["companies"],
  person:      ["people"],
  investor:    ["investors"],
  accelerator: ["accelerators"],
  resource:    ["resources"],
  research:    ["research"],
};

const dirty = new Set<string>();
let flushTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 10_000;

/**
 * Writes one sub-sitemap to every target dir.
 *
 * Throws when NO directory accepted the write. A partial success (one of
 * several dirs read-only) is still a success — the file is being served
 * from somewhere — but a total failure must propagate, otherwise the
 * caller counts the file as written and logs "0 errors" while the
 * sitemap on disk is stale or absent.
 */
async function writeSitemapFile(name: string, xml: string) {
  const failures: string[] = [];
  for (const dir of TARGET_DIRS) {
    try {
      fs.writeFileSync(path.join(dir, `sitemap-${name}.xml`), xml, "utf-8");
    } catch (err) {
      failures.push(`${dir}: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`[PublishHooks] Failed to write sitemap-${name}.xml in ${dir}:`, err);
    }
  }
  if (failures.length === TARGET_DIRS.length) {
    throw new Error(`could not write sitemap-${name}.xml anywhere (${failures.join("; ")})`);
  }
}

async function flushSitemaps() {
  if (dirty.size === 0) return;
  const modules = Array.from(dirty);
  dirty.clear();
  flushTimer = null;

  if (TARGET_DIRS.length === 0) {
    console.log("[PublishHooks] No writable target dirs; sitemap regen skipped");
    return;
  }

  console.log(`[PublishHooks] Regenerating sitemaps: ${modules.join(", ")}`);
  await Promise.all(
    modules.map(async (m) => {
      try {
        const xml =
          m === "news"   ? await seoService.generateGoogleNewsSitemap() :
          m === "images" ? await seoService.generateImagesSitemap() :
                           await seoService.generateSitemap(m);
        await writeSitemapFile(m, xml);
      } catch (err) {
        console.error(`[PublishHooks] Sitemap "${m}" regen failed:`, err);
      }
    })
  );

  // Also rewrite the index — its <lastmod> values must update.
  try {
    const indexXml = await seoService.generateSitemapIndex();
    for (const dir of TARGET_DIRS) {
      try {
        fs.writeFileSync(path.join(dir, "sitemap.xml"), indexXml, "utf-8");
        fs.writeFileSync(path.join(dir, "sitemap-index.xml"), indexXml, "utf-8");
      } catch {}
    }
  } catch (err) {
    console.error("[PublishHooks] Sitemap index regen failed:", err);
  }
}

function scheduleSitemapRegen(entityType: PublishedEntityType) {
  for (const m of ENTITY_TO_SITEMAPS[entityType] || []) dirty.add(m);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushSitemaps().catch(err => console.error("[PublishHooks] flushSitemaps:", err));
  }, DEBOUNCE_MS);
  // Don't keep the process alive just for this timer.
  if (typeof flushTimer.unref === "function") flushTimer.unref();
}

// ============================================================
// SEARCH-ENGINE NOTIFICATION ROUTING
// ============================================================

/**
 * Per Google's Indexing API ToS, only JobPosting and BroadcastEvent (live
 * stream) URLs are officially eligible. News articles work in practice but
 * we already opt-in for them via the news flow. Other entity types should
 * NOT call the Google Indexing API — only IndexNow + sitemap ping.
 */
const GOOGLE_API_ELIGIBLE: ReadonlySet<PublishedEntityType> = new Set([
  "article", // news/article — historically accepted, low risk
  "job",     // JobPosting — explicitly supported
  "event",   // BroadcastEvent — explicitly supported
]) as any;

async function fanOutNotifications(ev: PublishedEvent) {
  const useGoogleApi = GOOGLE_API_ELIGIBLE.has(ev.entityType);
  const oldEnv = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
  if (!useGoogleApi) {
    // Temporarily mask the env so submitGoogleIndexingApi short-circuits.
    delete process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
  }
  try {
    await notifySearchEngines({
      url: ev.url,
      type: "URL_UPDATED",
      articleId: ev.entityType === "article" ? ev.entityId : undefined,
      articleTitle: ev.title,
      articleSlug: ev.slug,
      triggeredBy: ev.triggeredBy,
      trigger: ev.trigger || "publish",
    });
  } finally {
    if (!useGoogleApi && oldEnv !== undefined) {
      process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT = oldEnv;
    }
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Call this whenever an entity transitions to `published` (or is created
 * directly in published state). All work is fire-and-forget — never await
 * this in a request handler unless you need the result for tests.
 */
export function onEntityPublished(ev: PublishedEvent): void {
  scheduleSitemapRegen(ev.entityType);
  fanOutNotifications(ev).catch(err => {
    console.error(`[PublishHooks] notify failed for ${ev.entityType}#${ev.entityId}:`, err);
  });
}

/**
 * Build the canonical public URL for any entity. Single source of truth so
 * routers don't drift.
 */
export function buildEntityUrl(
  entityType: PublishedEntityType,
  slug: string,
  opts: { categorySlug?: string } = {}
): string {
  switch (entityType) {
    case "article":
      return `${BASE_URL}/${opts.categorySlug || "news"}/${slug}`;
    case "job":         return `${BASE_URL}/jobs/${slug}`;
    case "event":       return `${BASE_URL}/events/${slug}`;
    case "company":     return `${BASE_URL}/companies/${slug}`;
    case "person":      return `${BASE_URL}/people/${slug}`;
    case "investor":    return `${BASE_URL}/investors/${slug}`;
    case "accelerator": return `${BASE_URL}/accelerators/${slug}`;
    case "resource":    return `${BASE_URL}/resources/${slug}`;
    case "research":    return `${BASE_URL}/research/${slug}`;
  }
}

/**
 * Force an immediate sitemap flush. Used by tests and the manual admin
 * endpoint that ships in admin/indexing.router.ts.
 */
export async function flushSitemapsNow(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushSitemaps();
}

/**
 * Full regeneration of every sub-sitemap + index + robots.txt to disk.
 * Replaces the old sitemapGeneratorService.generateAll() which only
 * validated XML in memory and never actually wrote files. Called by:
 *   - scheduler.service.ts on startup + every 5 minutes
 *   - admin SEO router "regenerate all sitemaps" mutation
 *   - scripts/generate-sitemaps.ts at build time (re-uses same logic)
 */
export async function regenerateAllSitemaps(): Promise<{
  filesWritten: string[];
  errors: Array<{ module: string; error: string }>;
}> {
  const filesWritten: string[] = [];
  const errors: Array<{ module: string; error: string }> = [];

  if (TARGET_DIRS.length === 0) {
    console.warn("[PublishHooks] No writable target dirs; regen skipped");
    return { filesWritten, errors };
  }

  // ALL sub-sitemaps known to seoService
  const ALL_MODULES = [
    "articles", "jobs", "people", "investors", "companies",
    "accelerators", "events", "resources", "research",
    "categories", "tags", "authors", "pages",
  ];

  for (const m of ALL_MODULES) {
    try {
      const xml = await seoService.generateSitemap(m);
      await writeSitemapFile(m, xml);
      filesWritten.push(`sitemap-${m}.xml`);
    } catch (err) {
      errors.push({ module: m, error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Google News (last 48 hours)
  try {
    const newsXml = await seoService.generateGoogleNewsSitemap();
    await writeSitemapFile("news", newsXml);
    filesWritten.push("sitemap-news.xml");
  } catch (err) {
    errors.push({ module: "news", error: err instanceof Error ? err.message : String(err) });
  }

  // Image sitemap (P6)
  try {
    const imgXml = await seoService.generateImagesSitemap();
    await writeSitemapFile("images", imgXml);
    filesWritten.push("sitemap-images.xml");
  } catch (err) {
    errors.push({ module: "images", error: err instanceof Error ? err.message : String(err) });
  }

  // Sitemap index — the one file search engines actually fetch, so a
  // failed write here is reported, never swallowed.
  try {
    const indexXml = await seoService.generateSitemapIndex();
    let wrote = 0;
    for (const dir of TARGET_DIRS) {
      try {
        fs.writeFileSync(path.join(dir, "sitemap.xml"), indexXml, "utf-8");
        fs.writeFileSync(path.join(dir, "sitemap-index.xml"), indexXml, "utf-8");
        wrote++;
      } catch (err) {
        console.error(`[PublishHooks] Failed to write sitemap.xml in ${dir}:`, err);
      }
    }
    if (wrote === 0) throw new Error("could not write sitemap.xml to any target dir");
    filesWritten.push("sitemap.xml", "sitemap-index.xml");
  } catch (err) {
    errors.push({ module: "index", error: err instanceof Error ? err.message : String(err) });
  }

  // robots.txt
  try {
    const robots = seoService.generateRobotsTxt();
    let wrote = 0;
    for (const dir of TARGET_DIRS) {
      try {
        fs.writeFileSync(path.join(dir, "robots.txt"), robots, "utf-8");
        wrote++;
      } catch (err) {
        console.error(`[PublishHooks] Failed to write robots.txt in ${dir}:`, err);
      }
    }
    if (wrote === 0) throw new Error("could not write robots.txt to any target dir");
    filesWritten.push("robots.txt");
  } catch (err) {
    errors.push({ module: "robots", error: err instanceof Error ? err.message : String(err) });
  }

  if (errors.length) {
    console.error(
      `[PublishHooks] Sitemap regen: ${filesWritten.length} written, ${errors.length} FAILED —`,
      errors.map(e => `${e.module}: ${e.error}`).join(" | "),
    );
  } else {
    console.log(`[PublishHooks] Regenerated ${filesWritten.length} sitemap files (0 errors)`);
  }
  return { filesWritten, errors };
}

/**
 * Schedule a sitemap regeneration for a single entity type without firing
 * the search-engine notification side. Used by news.router.ts which already
 * has its own notify call site we don't want to duplicate.
 */
export function scheduleSitemapRegenFor(entityType: PublishedEntityType): void {
  scheduleSitemapRegen(entityType);
}

export const publishHooks = {
  onEntityPublished,
  buildEntityUrl,
  flushSitemapsNow,
  scheduleSitemapRegenFor,
  regenerateAllSitemaps,
};
