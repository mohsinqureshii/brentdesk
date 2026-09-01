/**
 * SEO Middleware
 * Handles all SEO-related URL fixes identified from Google Search Console:
 * 
 * 1. Returns 410 Gone for old WordPress URLs
 * 2. Redirects /news?tag=X to /tag/slug (new tag pages)
 * 3. Redirects /news?topic=X to /tag/slug or /category/slug
 * 4. Adds noindex X-Robots-Tag header for admin pages
 * 5. Normalizes trailing slashes (strip trailing slash, redirect)
 * 6. Handles /tag/slug/feed/ URLs (410 Gone - no RSS per tag)
 * 7. Handles old URL patterns that return soft 404s
 * 8. Adds canonical headers for filtered pages
 */

import { publication, getBaseUrl } from "../../shared/publication";
import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNotNull } from "drizzle-orm";
import { getDb } from "../db";
import { tags, categories } from "../../drizzle/schema";

const BASE = getBaseUrl();
const SITE = publication.name;

const router = Router();

// ============================================================
// 1. OLD WORDPRESS URLs → 410 Gone
// ============================================================
router.all(["/wp-admin", "/wp-admin/*", "/wp-content/*", "/wp-includes/*", "/wp-login.php", "/xmlrpc.php", "/wp-cron.php"], (req, res) => {
  res.status(410).set("Content-Type", "text/html").send(`
    <!DOCTYPE html>
    <html><head><title>410 Gone</title><meta name="robots" content="noindex"></head>
    <body><h1>410 Gone</h1><p>This resource has been permanently removed.</p>
    <p><a href="${BASE}">Go to ${SITE}</a></p></body></html>
  `);
});

// ============================================================
// 1b. LEGACY WORDPRESS TAG URLs → 301 to canonical /tag/:slug
// /tags/foo, /tags/foo/, /tags/foo/page/2 all collapse to /tag/foo
// ============================================================
router.get(["/tags", "/tags/"], (_req, res) => {
  res.redirect(301, "/news");
});
router.get(["/tags/:slug/feed", "/tags/:slug/feed/"], (_req, res) => {
  res.status(410).set("Content-Type", "text/html").send(
    `<!DOCTYPE html><html><head><title>410 Gone</title><meta name="robots" content="noindex"></head><body><h1>410 Gone</h1><p><a href="${BASE}/rss.xml">Main RSS</a></p></body></html>`
  );
});
router.get(
  ["/tags/:slug/page/:page", "/tags/:slug/page/:page/", "/tags/:slug", "/tags/:slug/"],
  (req, res) => {
    const slug = String(req.params.slug || "").toLowerCase();
    if (!slug) return res.redirect(301, "/news");
    res.redirect(301, `/tag/${slug}`);
  }
);

// ============================================================
// 2. TAG FEED URLs → 410 Gone (/tag/*/feed/)
// ============================================================
router.get("/tag/:slug/feed", (req, res) => {
  res.status(410).set("Content-Type", "text/html").send(`
    <!DOCTYPE html>
    <html><head><title>410 Gone</title><meta name="robots" content="noindex"></head>
    <body><h1>410 Gone</h1><p>Tag RSS feeds have been removed. Use our main RSS feed instead.</p>
    <p><a href="${BASE}/rss.xml">Main RSS Feed</a> | <a href="${BASE}">Go to ${SITE}</a></p></body></html>
  `);
});

router.get("/tag/:slug/feed/", (req, res) => {
  res.status(410).set("Content-Type", "text/html").send(`
    <!DOCTYPE html>
    <html><head><title>410 Gone</title><meta name="robots" content="noindex"></head>
    <body><h1>410 Gone</h1><p>Tag RSS feeds have been removed. Use our main RSS feed instead.</p>
    <p><a href="${BASE}/rss.xml">Main RSS Feed</a> | <a href="${BASE}">Go to ${SITE}</a></p></body></html>
  `);
});

// ============================================================
// 3. ADMIN PAGES → noindex header
// ============================================================
router.use("/admin", (req: Request, res: Response, next: NextFunction) => {
  res.set("X-Robots-Tag", "noindex, nofollow");
  next();
});

router.use("/login", (req: Request, res: Response, next: NextFunction) => {
  res.set("X-Robots-Tag", "noindex, nofollow");
  next();
});

// ============================================================
// 4. REDIRECT /news?tag=X → /tag/slug
// ============================================================
router.get("/news", async (req: Request, res: Response, next: NextFunction) => {
  const tagParam = req.query.tag as string | undefined;
  const topicParam = req.query.topic as string | undefined;

  if (tagParam) {
    try {
      const db = await getDb();
      if (db) {
        // Try to find the tag by name (case-insensitive match)
        const tagResults = await db.select({ slug: tags.slug })
          .from(tags)
          .where(eq(tags.isActive, 1))
          .limit(500);
        
        const matchedTag = tagResults.find(t => 
          t.slug === tagParam.toLowerCase().replace(/\s+/g, '-') ||
          t.slug === tagParam.toLowerCase()
        );
        
        if (matchedTag) {
          return res.redirect(301, `/tag/${matchedTag.slug}`);
        }
      }
    } catch (error) {
      console.error("[SEO] Error redirecting tag:", error);
    }
    // If tag not found, redirect to news page without params
    return res.redirect(301, `/news`);
  }

  if (topicParam) {
    try {
      const db = await getDb();
      if (db) {
        // Try to find a matching category first
        const catResults = await db.select({ slug: categories.slug })
          .from(categories)
          .limit(100);
        
        const matchedCat = catResults.find(c =>
          c.slug === topicParam.toLowerCase().replace(/\s+/g, '-') ||
          c.slug === topicParam.toLowerCase()
        );
        
        if (matchedCat) {
          // Redirect to bare slug (canonical URL), not /category/ prefix
          return res.redirect(301, `/${matchedCat.slug}`);
        }

        // Try tags as fallback
        const tagResults = await db.select({ slug: tags.slug })
          .from(tags)
          .where(eq(tags.isActive, 1))
          .limit(500);
        
        const matchedTag = tagResults.find(t =>
          t.slug === topicParam.toLowerCase().replace(/\s+/g, '-') ||
          t.slug === topicParam.toLowerCase()
        );
        
        if (matchedTag) {
          return res.redirect(301, `/tag/${matchedTag.slug}`);
        }
      }
    } catch (error) {
      console.error("[SEO] Error redirecting topic:", error);
    }
    // If topic not found, redirect to news page
    return res.redirect(301, `/news`);
  }

  next();
});

// ============================================================
// 5. CANONICAL HEADERS for filtered pages
// ============================================================
router.get("/events", (req: Request, res: Response, next: NextFunction) => {
  // If there's a city filter, add canonical pointing to base /events
  if (req.query.city) {
    res.set("Link", `<${BASE}/events>; rel="canonical"`);
  }
  next();
});

// ============================================================
// 6. OLD URL PATTERNS → Proper redirects or 410
// ============================================================

// /homepage → /
router.get("/homepage", (req, res) => {
  res.redirect(301, "/");
});

// /subscribe/ → /newsletter
router.get("/subscribe", (req, res) => {
  res.redirect(301, "/newsletter");
});
router.get("/subscribe/", (req, res) => {
  res.redirect(301, "/newsletter");
});

// /2025/ → / (year archive pages don't exist)
router.get("/2025", (req, res) => {
  res.redirect(301, "/");
});
router.get("/2025/", (req, res) => {
  res.redirect(301, "/");
});

// /videos → / (no dedicated videos page)
router.get("/videos", (req, res) => {
  res.redirect(301, "/");
});

// /typography/ → 410 (test page)
router.get("/typography", (req, res) => {
  res.status(410).set("Content-Type", "text/html").send(`
    <!DOCTYPE html>
    <html><head><title>410 Gone</title><meta name="robots" content="noindex"></head>
    <body><h1>410 Gone</h1><p>This page has been removed.</p>
    <p><a href="${BASE}">Go to ${SITE}</a></p></body></html>
  `);
});
router.get("/typography/", (req, res) => {
  res.status(410).set("Content-Type", "text/html").send(`
    <!DOCTYPE html>
    <html><head><title>410 Gone</title><meta name="robots" content="noindex"></head>
    <body><h1>410 Gone</h1><p>This page has been removed.</p>
    <p><a href="${BASE}">Go to ${SITE}</a></p></body></html>
  `);
});

// /terms-of-service/ → /terms (normalize)
router.get("/terms-of-service", (req, res) => {
  res.redirect(301, "/terms");
});
router.get("/terms-of-service/", (req, res) => {
  res.redirect(301, "/terms");
});

// Old industry/country URLs → redirect to news
router.get("/industry/:slug", (req, res) => {
  res.redirect(301, "/news");
});
router.get("/industry/:slug/", (req, res) => {
  res.redirect(301, "/news");
});
router.get("/country/:slug", (req, res) => {
  res.redirect(301, "/news");
});
router.get("/country/:slug/", (req, res) => {
  res.redirect(301, "/news");
});

// /contact-us → /contact (soft 404 fix)
router.get("/contact-us", (req, res) => {
  res.redirect(301, "/contact");
});

// /e/:slug → /events/:slug (short URL for share buttons)
// Tweet-friendly redirect e.g. <domain>/e/some-event → /events/some-event.
// We preserve any hash/query the share link carried so deep-links like
// /e/leap-2026#speaker-12 still land on the right element after the 301.
router.get(["/e/:slug", "/e/:slug/"], (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!slug) return res.redirect(301, "/events");
  // Express strips the hash on the server (browser-only) but we still
  // forward the query string so UTM params survive the bounce.
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  return res.redirect(301, `/events/${slug}${qs}`);
});

// /category/:slug → /:slug (canonical URL normalization)
// The canonical URL for category pages is the bare slug, not /category/:slug
// This prevents duplicate content between /category/startups and /startups
router.get("/category/:parentSlug", (req, res) => {
  const { parentSlug } = req.params;
  // Avoid infinite redirect for /category/news (which is a valid route)
  if (parentSlug === 'news') return res.redirect(301, '/news');
  res.redirect(301, `/${parentSlug}`);
});
router.get("/category/:parentSlug/:childSlug", (req, res) => {
  const { parentSlug, childSlug } = req.params;
  res.redirect(301, `/${parentSlug}/${childSlug}`);
});

// ============================================================
// 7. THREE-SEGMENT ARTICLE URL REDIRECT
// /parentCat/childCat/articleSlug → /:primaryCatSlug/:articleSlug
// These URLs appear in GSC as soft 404s - redirect to canonical 2-segment URL
// ============================================================
router.get("/:parentCat/:childCat/:articleSlug", async (req: Request, res: Response, next: NextFunction) => {
  const { parentCat, childCat, articleSlug } = req.params;
  
  // Skip entity prefixes that have their own 3-segment routes
  const entityPrefixes = new Set(['companies', 'investors', 'people', 'events', 'jobs', 'accelerators', 'resources', 'admin', 'dashboard', 'api', 'tag']);
  if (entityPrefixes.has(parentCat) || entityPrefixes.has(childCat)) {
    return next();
  }
  
  // Skip if any segment looks like a file (has extension)
  if (articleSlug.includes('.')) return next();
  
  try {
    // Look up the article's canonical category slug from the DB
    const db = await getDb();
    if (db) {
      const { articles, categories: cats } = await import('../../drizzle/schema');
      const { eq, isNotNull } = await import('drizzle-orm');
      const result = await db
        .select({ catSlug: cats.slug })
        .from(articles)
        .leftJoin(cats, eq(cats.id, articles.primaryCategoryId))
        .where(eq(articles.slug, articleSlug))
        .limit(1)
        .then((rows: any[]) => rows[0]);
      
      if (result?.catSlug) {
        // Redirect to canonical URL: /:primaryCatSlug/:articleSlug
        return res.redirect(301, `/${result.catSlug}/${articleSlug}`);
      }
    }
  } catch (error) {
    console.error('[SEO] Error looking up article canonical:', error);
  }
  
  // Fallback: redirect to /:childCat/:articleSlug
  return res.redirect(301, `/${childCat}/${articleSlug}`);
});

// ============================================================
// 8. TRAILING SLASH NORMALIZATION
// Strip trailing slashes from all URLs (except root /)
// This prevents duplicate content from /path vs /path/
// ============================================================
router.use((req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  
  // Skip root, API routes, and static files
  if (path === '/' || path.startsWith('/api/') || path.includes('.')) {
    return next();
  }
  
  // If path ends with /, redirect to without trailing slash
  if (path.length > 1 && path.endsWith('/')) {
    const query = req.url.slice(req.path.length);
    const cleanPath = path.slice(0, -1);
    return res.redirect(301, cleanPath + query);
  }
  
  next();
});

export default router;
