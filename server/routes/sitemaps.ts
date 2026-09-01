/**
 * Sitemap Routes
 * Serves XML sitemaps for search engines
 * 
 * IMPORTANT: These dynamic routes MUST be registered before express.static()
 * to take priority over any static sitemap files in client/public/ or dist/public/.
 * 
 * Cache headers are set to short TTL (1 hour) to ensure sitemaps stay fresh
 * after new articles are published. The static file generator still runs as a
 * fallback, but these dynamic routes should always win.
 */

import { Router } from "express";
import { seoService } from "../services/seo.service";

const router = Router();

/**
 * Wrap a sitemap generator with proper error logging. Without this, route
 * handlers swallowed exceptions into a generic "Error generating sitemap"
 * 500 with no stack trace, which is what hid the media.altText vs media.alt
 * column typo for an entire deploy cycle.
 */
function logSitemapError(name: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[Sitemap:${name}] ${err.message}`);
  if (err.stack) console.error(err.stack);
  // Log column/SQL errors with extra context (Drizzle wraps SQL errors)
  const code = (err as any).code;
  const sqlState = (err as any).sqlState;
  const sqlMessage = (err as any).sqlMessage;
  if (code || sqlState || sqlMessage) {
    console.error(`[Sitemap:${name}] sqlCode=${code} sqlState=${sqlState} sqlMessage=${sqlMessage}`);
  }
}

// Common headers for all sitemap responses
function setSitemapHeaders(res: any) {
  res.set("Content-Type", "application/xml; charset=utf-8");
  // Short cache to ensure fresh content after publishing new articles.
  // stale-while-revalidate keeps Google happy even mid-rebuild.
  res.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
  );
  // Prevent Cloudflare/Manus from applying their default 90-day immutable cache.
  res.set("CDN-Cache-Control", "max-age=3600");
  res.set("Cloudflare-CDN-Cache-Control", "max-age=3600");
  // X-Robots-Tag MUST be index,follow on sitemaps; Manus default sometimes
  // injects noindex on .xml — override explicitly.
  res.set("X-Robots-Tag", "noarchive");
  // Disable platform/CDN HTML-rewriting that can corrupt XML.
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Vary", "Accept-Encoding");
}

/**
 * Sitemap Index - /sitemap.xml and /sitemap-index.xml
 * Lists all available sitemaps
 */
router.get(["/sitemap.xml", "/sitemap-index.xml"], async (req, res) => {
  try {
    const xml = await seoService.generateSitemapIndex();
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("index", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Articles Sitemap - /api/sitemap-articles.xml
 * Full archive of all articles
 * NOTE: Using /api/ prefix to bypass Manus platform edge routing
 */
router.get("/sitemap-articles.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("articles");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("articles", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Google News Sitemap - /api/sitemap-news.xml
 * Only includes articles from last 48 hours per Google News requirements
 * NOTE: Using /api/ prefix to bypass Manus platform edge routing
 */
router.get("/sitemap-news.xml", async (req, res) => {
  try {
    const xml = await seoService.generateGoogleNewsSitemap();
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("news", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Jobs Sitemap - /api/sitemap-jobs.xml
 * NOTE: Using /api/ prefix to bypass Manus platform edge routing
 */
router.get("/sitemap-jobs.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("jobs");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("jobs", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * People Sitemap - /api/sitemap-people.xml
 * NOTE: Using /api/ prefix to bypass Manus platform edge routing
 */
router.get("/sitemap-people.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("people");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("people", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Investors Sitemap - /sitemap-investors.xml
 */
router.get("/sitemap-investors.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("investors");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("investors", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Events Sitemap - /sitemap-events.xml
 */
router.get("/sitemap-events.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("events");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("events", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Resources Sitemap - /sitemap-resources.xml
 */
router.get("/sitemap-resources.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("resources");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("resources", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Research Sitemap - /sitemap-research.xml
 */
router.get("/sitemap-research.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("research");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("research", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Categories Sitemap - /sitemap-categories.xml
 */
router.get("/sitemap-categories.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("categories");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("categories", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Companies Sitemap - /sitemap-companies.xml
 */
router.get("/sitemap-companies.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("companies");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("companies", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Accelerators Sitemap - /sitemap-accelerators.xml
 */
router.get("/sitemap-accelerators.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("accelerators");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("accelerators", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Tags Sitemap - /sitemap-tags.xml
 */
router.get("/sitemap-tags.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("tags");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("tags", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Authors Sitemap - /sitemap-authors.xml
 * Editorial authors (writers, editors) with at least one published article.
 */
router.get("/sitemap-authors.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("authors");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("authors", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Images Sitemap - /sitemap-images.xml
 * One <url> per article with featured image, listed under image: namespace.
 * Article sitemap also embeds image extensions inline; this dedicated file
 * gives Google Image Search a single fast lane to crawl.
 */
router.get("/sitemap-images.xml", async (req, res) => {
  try {
    const xml = await seoService.generateImagesSitemap();
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("images", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Pages Sitemap - /sitemap-pages.xml
 * Static pages like homepage, about, contact, etc.
 */
router.get("/sitemap-pages.xml", async (req, res) => {
  try {
    const xml = await seoService.generateSitemap("pages");
    setSitemapHeaders(res);
    res.send(xml);
  } catch (error) {
    logSitemapError("pages", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * Robots.txt - /robots.txt
 */
router.get("/robots.txt", (req, res) => {
  try {
    const txt = seoService.generateRobotsTxt();
    res.set("Content-Type", "text/plain");
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.set("CDN-Cache-Control", "max-age=3600");
    res.set("Cloudflare-CDN-Cache-Control", "max-age=3600");
    res.send(txt);
  } catch (error) {
    logSitemapError("robots", error);
    res.status(500).send("Error generating robots.txt");
  }
});

/**
 * RSS Feed - /rss.xml or /feed.xml
 */
router.get(["/rss.xml", "/feed.xml"], async (req, res) => {
  try {
    const xml = await seoService.generateNewsFeed();
    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.set("CDN-Cache-Control", "max-age=3600");
    res.set("Cloudflare-CDN-Cache-Control", "max-age=3600");
    res.send(xml);
  } catch (error) {
    logSitemapError("rss", error);
    res.status(500).send("Error generating RSS feed");
  }
});

/**
 * Jobs RSS Feed - /jobs-feed.xml
 */
router.get("/jobs-feed.xml", async (req, res) => {
  try {
    const xml = await seoService.generateJobsFeed();
    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.set("CDN-Cache-Control", "max-age=3600");
    res.set("Cloudflare-CDN-Cache-Control", "max-age=3600");
    res.send(xml);
  } catch (error) {
    logSitemapError("jobs-rss", error);
    res.status(500).send("Error generating jobs RSS feed");
  }
});

export default router;
