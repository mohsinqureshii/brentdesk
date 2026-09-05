/**
 * Article Redirect Middleware
 * Handles 301 redirects for articles accessed via non-primary category URLs
 * 
 * CRITICAL SEO FIX:
 * - Each article must have ONE canonical URL based on its primary category
 * - All other category URLs must 301 redirect to the primary URL
 * - This prevents duplicate content issues and consolidates SEO authority
 */

import { Request, Response, NextFunction } from "express";
import { eq, and, isNotNull } from "drizzle-orm";
import { getDb } from "../db";
import { articles, categories, articleCategories } from "../../drizzle/schema";
import { workflowService } from "../services/workflow.service";
import { getBaseUrl } from "../../shared/publication";

// List of known non-article routes to skip
const SKIP_PREFIXES = [
  '/api', '/admin', '/jobs', '/people', '/investors', '/events', 
  '/companies', '/accelerators', '/resources', '/research', '/news',
  '/sitemap', '/robots', '/rss', '/feed', '/login',
  '/signup', '/profile', '/settings', '/search', '/calculators',
  '/about', '/contact', '/privacy', '/terms', '/cookies', '/404', '/assets',
  '/fonts', '/@', '/src', '/node_modules', '/_'
];

// List of known category slugs (will be populated dynamically)
let categorySlugCache: Set<string> = new Set();
let cacheLastUpdated = 0;
const CACHE_TTL = 60000; // 1 minute

async function refreshCategoryCache() {
  const now = Date.now();
  if (now - cacheLastUpdated < CACHE_TTL && categorySlugCache.size > 0) {
    return;
  }
  
  try {
    const db = await getDb();
    if (!db) return;
    
    const cats = await db.select({ slug: categories.slug }).from(categories);
    categorySlugCache = new Set(cats.map(c => c.slug));
    cacheLastUpdated = now;
  } catch (error) {
    console.error("Error refreshing category cache:", error);
  }
}

/**
 * Middleware to handle article URL redirects
 *
 * Patterns handled:
 *   /:category/:articleSlug              (2-segment)
 *   /:parentCat/:childCat/:articleSlug   (3-segment, redirects to 2-segment canonical)
 *
 * If the URL doesn't match the article's primary-category-based canonical,
 * we issue a 301. Previously only the 2-segment case was handled at the
 * server; 3-segment URLs were redirected client-side via React, which
 * Google sees as 200 OK + JS replace — not a real redirect — so subcategory
 * articles got indexed at duplicate URLs and showed up in GSC as
 * "Duplicate, Google chose different canonical than user".
 */
export async function articleRedirectMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  // Skip if this looks like a non-article route
  if (SKIP_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return next();
  }

  // Parse the path to extract category and article slug
  const parts = path.split('/').filter(Boolean);

  // Only 2- or 3-segment URLs are candidates for an article-redirect rewrite
  if (parts.length !== 2 && parts.length !== 3) {
    return next();
  }

  // For 3-segment URLs we treat the LAST segment as the article slug — this
  // matches the ThreeSegmentRoute client-side fallback and the existing
  // canonical strategy of /{primaryCategorySlug}/{articleSlug}.
  const articleSlug = parts[parts.length - 1];
  const category = parts[0]; // first segment, used for category-validity check below
  
  // Skip if there's a file extension (static files)
  if (articleSlug.includes('.')) {
    return next();
  }
  
  // Refresh category cache
  await refreshCategoryCache();

  // The first segment must be a known category for any of these patterns
  // to be a valid article URL. (For 3-segment URLs, the second segment
  // should also be a category, but we don't strictly enforce it here —
  // if the article exists by slug we'll redirect regardless.)
  if (!categorySlugCache.has(category)) {
    return next();
  }
  
  try {
    const db = await getDb();
    if (!db) return next();
    
    // Find the article by slug - must be published (has publishedAt date)
    const articleResult = await db.select({
      id: articles.id,
      slug: articles.slug,
      primaryCategoryId: articles.primaryCategoryId,
      publishedAt: articles.publishedAt,
      canonicalUrl: articles.canonicalUrl,
    })
      .from(articles)
      .where(and(
        eq(articles.slug, articleSlug),
        isNotNull(articles.publishedAt)
      ))
      .limit(1);
    
    if (!articleResult[0]) {
      // Article not found, let the SPA handle 404
      return next();
    }
    
    const article = articleResult[0];
    
    // Get the primary category slug
    let primaryCategorySlug: string | null = null;
    
    if (article.primaryCategoryId) {
      const primaryCat = await db.select({ slug: categories.slug })
        .from(categories)
        .where(eq(categories.id, article.primaryCategoryId))
        .limit(1);
      
      primaryCategorySlug = primaryCat[0]?.slug || null;
    }
    
    // If no primary category, get the first assigned category
    if (!primaryCategorySlug) {
      const firstCat = await db.select({ slug: categories.slug })
        .from(articleCategories)
        .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
        .where(eq(articleCategories.articleId, article.id))
        .limit(1);
      
      primaryCategorySlug = firstCat[0]?.slug || null;
    }
    
    // If still no category, use 'news' as fallback
    if (!primaryCategorySlug) {
      primaryCategorySlug = 'news';
    }
    
    let correctUrl = `/${primaryCategorySlug}/${article.slug}`;
    if (article.canonicalUrl) {
      try {
        const candidate = new URL(article.canonicalUrl, getBaseUrl());
        if (candidate.origin === new URL(getBaseUrl()).origin) {
          correctUrl = candidate.pathname;
        }
      } catch { /* use the generated canonical */ }
    }

    // 3-segment URLs are NEVER canonical — even if the first or second
    // segment matches the primary category, the canonical form is the
    // 2-segment `/category/slug`. Always redirect.
    if (parts.length === 3) {
      console.log(`[SEO] 301 Redirect (3-seg): ${path} -> ${correctUrl}`);
      return res.redirect(301, correctUrl);
    }

    // 2-segment: redirect only when the URL category disagrees with primary
    if (path !== correctUrl) {
      console.log(`[SEO] 301 Redirect: ${path} -> ${correctUrl}`);
      return res.redirect(301, correctUrl);
    }

    // Category matches, let the SPA handle rendering
    return next();
    
  } catch (error) {
    console.error("Error in article redirect middleware:", error);
    return next();
  }
}

export default articleRedirectMiddleware;
