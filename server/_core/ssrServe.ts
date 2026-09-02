/**
 * Production SSR + static serving.
 * ----------------------------------------------------------------------
 * Everything in this module must stay importable with only production
 * dependencies installed. Dev-only code (the Vite middleware server)
 * lives in ./vite.ts, which is loaded lazily and ONLY in development —
 * importing vite here would crash `pnpm install --prod` deployments
 * with ERR_MODULE_NOT_FOUND at startup.
 */
import express, { Express } from "express";
import path from "path";
import fs from "fs";
import {
  getArticleForSSR,
  generateMetaTags,
  generateJsonLd,
  generatePrerenderedContent,
  injectSSRContent,
  getTagForSSR,
  generateTagMetaTags,
  generateTagJsonLd,
  generateTagPrerenderedContent,
  getCategoryForSSR,
  generateCategoryMetaTags,
  generateCategoryJsonLd,
  // Entity SSR imports
  getCompanyForSSR,
  generateCompanyMetaTags,
  generateCompanyJsonLd,
  getPersonForSSR,
  generatePersonMetaTags,
  generatePersonJsonLd,
  getEventForSSR,
  generateEventMetaTags,
  generateEventJsonLd,
  getJobForSSR,
  generateJobMetaTags,
  generateJobJsonLd,
  getAuthorForSSR,
  generateAuthorMetaTags,
  generateAuthorJsonLd,
  getArticleCanonicalUrl,
  getLivePostForSSR,
} from "../services/ssr.service";
import { generateStaticPageMetaTags } from "./staticPagesSEO";

import { publication, getBaseUrl } from "../../shared/publication";

const BASE_URL = getBaseUrl();
const SITE_NAME = publication.name;
const DEFAULT_OG_IMAGE = `${BASE_URL}${publication.assets.ogImage}`;

// ============================================================
// URL Classification
// ============================================================

// URLs that should NEVER get any SSR processing (API, static assets, etc.)
const skipPrefixPaths = [
  '/api/', '/admin/', '/login', '/signup', '/signin',
  '/profile', '/account', '/settings', '/dashboard',
  '/sitemap', '/robots', '/favicon', '/assets', '/fonts', '/images',
  '/src/', '/@', '/rss', '/feed', '/subscribe', '/homepage',
  '/404', '/claimed-profiles', '/go/',
  '/legacy-storage/', // retired asset mount path — kept in the skip list so stale URLs 404 fast
];

// Static-asset extensions must NEVER reach the SSR pipeline. A missing
// image used to fall through to runSSR, firing 4-6 DB queries per dead
// asset URL — pages with several stale media links crawled because of it.
const STATIC_ASSET_RE = /\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|map|woff2?|ttf|otf|eot|mp4|webm|mp3|pdf)$/i;

export function isStaticAssetPath(url: string): boolean {
  const clean = url.split('?')[0].split('#')[0];
  return STATIC_ASSET_RE.test(clean);
}

/**
 * Check if a URL should completely skip SSR processing.
 * Returns true for system routes, static assets, and authenticated pages.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSystemUrl(url: string): boolean {
  if (url.endsWith('.xml') || url.endsWith('.txt') || url.endsWith('.json')) return true;
  if (isStaticAssetPath(url)) return true;
  if (skipPrefixPaths.some(p => url.startsWith(p))) return true;
  return false;
}

/**
 * Known valid single-segment routes that exist as real pages.
 * These get canonical injection but NOT entity/article SSR.
 * 
 * IMPORTANT: All parent category slugs are included here so they get
 * proper meta tags and index,follow robots directive instead of noindex.
 */
export const knownStaticPages = new Set([
  // Core pages
  '/', '/news', '/jobs', '/companies', '/people',
  '/events', '/about', '/contact', '/advertise', '/newsletter',
  '/terms', '/privacy',
  // Search page - should be noindex but still a real page (handled separately)
  '/search',
  // Parent category pages (all 34 parent categories)
  '/ai-data', '/ai-ml', '/climate-energy', '/cloud-infra-data-centers',
  '/cybersecurity', '/design', '/ecommerce-retail-tech', '/engineering',
  '/enterprise-saas', '/events-conferences', '/fintech', '/funding-vc',
  '/govtech-defense-space', '/hardware-robotics-iot', '/healthtech',
  '/jobs-talent', '/marketing', '/markets-ipo-ma', '/media-gaming-creator-economy',
  '/mobility-logistics', '/operations', '/partnerships-deals', '/people-leadership',
  '/press-editorial', '/product', '/proptech-real-estate', '/regtech-compliance',
  '/retail-hospitality-tech', '/startups', '/telecom-connectivity', '/web3-blockchain',
  '/powerlist', '/jobs-and-talent',
]);

/**
 * Pages that should explicitly get noindex (real pages but not for indexing)
 */
export const noindexPages = new Set([
  '/search', '/forgot-password', '/reset-password', '/verify-email',
]);

// ============================================================
// Canonical URL Injection
// ============================================================

/**
 * Create a 404-safe HTML response with noindex and correct canonical.
 * Used by all SSR handlers when content is not found.
 */
function inject404Response(template: string, url: string): string {
  let html = injectCanonical(template, url);
  if (/<meta[^>]*name="robots"[^>]*>/i.test(html)) {
    html = html.replace(
      /<meta[^>]*name="robots"[^>]*>/gi,
      '<meta name="robots" content="noindex, follow" />'
    );
  } else {
    // The shell template carries no robots meta of its own — append the
    // noindex directive instead of silently doing nothing (entity-miss
    // 404 pages used to ship with no robots directive at all).
    html = html.replace(
      /<\/head>/i,
      '  <meta name="robots" content="noindex, follow" />\n  </head>'
    );
  }
  return html;
}

export function injectCanonical(template: string, url: string): string {
  // Strip query params and hash for canonical
  const cleanPath = url.split('?')[0].split('#')[0];
  const canonicalUrl = cleanPath === '/' ? BASE_URL + '/' : BASE_URL + cleanPath;

  // Replace the default canonical with the correct one
  let result = template.replace(
    /<link[^>]*rel="canonical"[^>]*>/gi,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // Also fix the og:url to match canonical (always override to prevent homepage fallback)
  result = result.replace(
    /<meta[^>]*property="og:url"[^>]*>/gi,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );

  // Fix twitter:url to match canonical too
  result = result.replace(
    /<meta[^>]*name="twitter:url"[^>]*>/gi,
    `<meta name="twitter:url" content="${canonicalUrl}" />`
  );

  // Inject per-page WebPage JSON-LD into the placeholder slot. Without this,
  // every page would lack a WebPage entity (we removed the homepage-pinned
  // global one because it was claiming every URL was the homepage).
  result = result.replace(
    /<!--SSR_WEBPAGE_PLACEHOLDER-->/,
    buildWebPageJsonLd(canonicalUrl)
  );

  return result;
}

/**
 * Build a self-referential WebPage JSON-LD for the given canonical URL.
 * Anchored to the site-wide WebSite + Organization @ids declared in
 * client/index.html so the graph stays connected.
 */
function buildWebPageJsonLd(canonicalUrl: string): string {
  const isHome = canonicalUrl === BASE_URL + "/" || canonicalUrl === BASE_URL;
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    "url": canonicalUrl,
    "isPartOf": { "@id": `${BASE_URL}/#website` },
    "inLanguage": "en-US",
  };
  if (isHome) {
    obj["about"] = { "@id": `${BASE_URL}/#organization` };
    obj["primaryImageOfPage"] = {
      "@type": "ImageObject",
      "url": DEFAULT_OG_IMAGE,
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
}

// ============================================================
// Entity SSR route patterns: /entities/:idOrSlug
// ============================================================

interface EntitySSRConfig {
  prefix: string;
  getFn: (idOrSlug: string) => Promise<any>;
  metaFn: (data: any) => string;
  jsonLdFn: (data: any) => string;
  noscriptFn: (data: any) => string;
}

const entitySSRConfigs: EntitySSRConfig[] = [
  {
    prefix: '/companies/',
    getFn: getCompanyForSSR,
    metaFn: generateCompanyMetaTags,
    jsonLdFn: generateCompanyJsonLd,
    noscriptFn: (c) => {
      const desc = c.shortDescription || c.tagline || c.description?.substring(0, 300) || `${c.name} - Company profile on ${SITE_NAME}`;
      const details = [
        c.industry ? `Industry: ${c.industry}` : null,
        c.location ? `Location: ${c.location}` : null,
        c.foundedYear ? `Founded: ${c.foundedYear}` : null,
      ].filter(Boolean).join(' | ');
      return `<noscript><div><h1>${c.name}</h1><p>${desc}</p>${details ? `<p>${details}</p>` : ''}</div></noscript>`;
    },
  },
  {
    prefix: '/people/',
    getFn: getPersonForSSR,
    metaFn: generatePersonMetaTags,
    jsonLdFn: generatePersonJsonLd,
    noscriptFn: (p) => {
      const desc = p.shortBio || p.bio?.substring(0, 300) || `${p.name} - Professional profile on ${SITE_NAME}`;
      const details = [
        p.title ? `Title: ${p.title}` : null,
        p.company ? `Company: ${p.company}` : null,
        p.location ? `Location: ${p.location}` : null,
      ].filter(Boolean).join(' | ');
      return `<noscript><div><h1>${p.name}</h1><p>${desc}</p>${details ? `<p>${details}</p>` : ''}</div></noscript>`;
    },
  },
  {
    prefix: '/events/',
    getFn: getEventForSSR,
    metaFn: generateEventMetaTags,
    jsonLdFn: generateEventJsonLd,
    noscriptFn: (e) => {
      const desc = e.shortDescription || e.description?.substring(0, 300) || `${e.title} - Event on ${SITE_NAME}`;
      const details = [
        e.location ? `Location: ${e.location}` : null,
        e.eventDate ? `Date: ${new Date(e.eventDate).toLocaleDateString()}` : null,
      ].filter(Boolean).join(' | ');
      return `<noscript><div><h1>${e.title}</h1><p>${desc}</p>${details ? `<p>${details}</p>` : ''}</div></noscript>`;
    },
  },
  {
    prefix: '/jobs/',
    getFn: getJobForSSR,
    metaFn: generateJobMetaTags,
    jsonLdFn: generateJobJsonLd,
    noscriptFn: (j) => {
      const desc = j.description?.substring(0, 300) || `${j.title} position at ${j.companyName}`;
      const details = [
        j.jobType ? `Type: ${j.jobType}` : null,
        j.location ? `Location: ${j.location}` : null,
        j.salaryMin && j.salaryMax ? `Salary: ${j.salaryMin} - ${j.salaryMax}` : null,
      ].filter(Boolean).join(' | ');
      return `<noscript><div><h1>${j.title} at ${j.companyName}</h1><p>${desc}</p>${details ? `<p>${details}</p>` : ''}</div></noscript>`;
    },
  },
  {
    prefix: '/author/',
    getFn: getAuthorForSSR,
    metaFn: generateAuthorMetaTags,
    jsonLdFn: generateAuthorJsonLd,
    noscriptFn: (a) => {
      const desc = a.authorBio || a.bio?.substring(0, 300) || `${a.name} - Author at ${SITE_NAME}`;
      const details = [
        a.jobTitle ? `Role: ${a.jobTitle}` : null,
        a.articleCount ? `Articles: ${a.articleCount}` : null,
      ].filter(Boolean).join(' | ');
      return `<noscript><div><h1>${a.name}</h1><p>${desc}</p>${details ? `<p>${details}</p>` : ''}</div></noscript>`;
    },
  },
];

/**
 * Try SSR for entity detail pages: /companies/:id, /investors/:id, etc.
 */
async function tryEntitySSR(url: string, template: string): Promise<{ html: string; status: number } | null> {
  for (const config of entitySSRConfigs) {
    if (!url.startsWith(config.prefix)) continue;
    
    const idOrSlug = url.slice(config.prefix.length).split('?')[0].split('#')[0];
    if (!idOrSlug || idOrSlug.includes('/')) continue; // Skip sub-paths like /companies/123/edit
    
    try {
      const data = await config.getFn(idOrSlug);
      if (data) {
        const metaTags = config.metaFn(data);
        const jsonLd = config.jsonLdFn(data);
        const prerendered = config.noscriptFn(data);
        const html = injectSSRContent(template, metaTags, jsonLd, prerendered);
        return { html, status: 200 };
      }
    } catch (error) {
      console.error(`[SSR] Error rendering ${config.prefix} page:`, error);
    }
    
    // Entity prefix matched but data not found - return 404 with noindex
    return { html: inject404Response(template, url), status: 404 };
  }
  
  return null;
}

/**
 * Try SSR for tag page: /tag/:slug
 */
async function tryTagSSR(url: string, template: string): Promise<{ html: string; status: number } | null> {
  const match = url.match(/^\/tag\/([^/?#]+)$/);
  if (!match) return null;
  
  const tagSlug = match[1];
  try {
    const tag = await getTagForSSR(tagSlug);
    if (tag) {
      const metaTags = generateTagMetaTags(tag);
      const jsonLd = generateTagJsonLd(tag);
      const prerendered = generateTagPrerenderedContent(tag);
      const html = injectSSRContent(template, metaTags, jsonLd, prerendered);
      return { html, status: 200 };
    } else {
      return { html: inject404Response(template, url), status: 404 };
    }
  } catch (error) {
    console.error('[SSR] Error rendering tag page:', error);
    return { html: inject404Response(template, url), status: 404 };
  }
}

/**
 * Try SSR for category page: /:slug (bare category slug) or /category/:slug
 * Also handles subcategory pages: /parentSlug/childSlug
 * Categories use bare slugs like /ai-data, /fintech, /funding-vc
 */
async function tryCategorySSR(url: string, template: string): Promise<{ html: string; status: number } | null> {
  // Match /category/:slug pattern
  let match = url.match(/^\/category\/([^/?#]+)$/);
  let categorySlug: string | null = null;
  
  if (match) {
    categorySlug = match[1];
  } else {
    // Match bare /:slug pattern for single-segment URLs
    const bareMatch = url.match(/^\/([^/?#]+)$/);
    if (bareMatch) {
      const slug = bareMatch[1];
      // Skip known static pages and entity prefixes
      if (knownStaticPages.has('/' + slug)) {
        // It's a known static page - but still try category SSR for category pages
        // Only skip if it's a non-category static page
        const nonCategoryStatics = new Set([
          'news', 'jobs', 'companies', 'people',
          'events', 'about', 'contact',
          'advertise', 'newsletter', 'terms', 'privacy', 'search',
          'forgot-password', 'reset-password', 'verify-email',
        ]);
        if (nonCategoryStatics.has(slug)) return null;
      }
      if (['company', 'investor', 'person', 'event', 'job', 'accelerator', 'tag'].includes(slug)) return null;
      categorySlug = slug;
    }
  }
  
  if (!categorySlug) return null;
  
  try {
    const category = await getCategoryForSSR(categorySlug);
    if (category) {
      const metaTags = generateCategoryMetaTags(category);
      const jsonLd = generateCategoryJsonLd(category);
      const articlesList = category.recentArticles && category.recentArticles.length > 0
        ? `<ul>${category.recentArticles.map(a => `<li><a href="${BASE_URL}/${a.categorySlug}/${a.slug}">${escapeHtml(a.title)}</a></li>`).join('')}</ul>`
        : '';
      const prerendered = `<noscript><div><h1>${category.name} News</h1><p>${category.description || ''}</p>${articlesList}</div></noscript>`;
      const html = injectSSRContent(template, metaTags, jsonLd, prerendered);
      return { html, status: 200 };
    } else {
      // Category not found - return null to let tryBareArticleSSR handle it
      return null;
    }
  } catch (error) {
    console.error('[SSR] Error rendering category page:', error);
    return null;
  }
}

/**
 * Try SSR for subcategory page: /parentSlug/childSlug
 * These are two-segment URLs where both segments are category slugs (not article slugs)
 */
async function trySubcategorySSR(url: string, template: string): Promise<{ html: string; status: number } | null> {
  const urlParts = url.split('/').filter(Boolean);
  if (urlParts.length !== 2) return null;
  
  const [parentSlug, childSlug] = urlParts;
  
  // Skip entity prefixes - these are handled by tryEntitySSR and tryArticleSSR
  const entityPrefixes = new Set(['companies', 'investors', 'people', 'events', 'jobs', 'accelerators', 'tag', 'category', 'resources', 'research']);
  if (entityPrefixes.has(parentSlug)) return null;
  
  // Try to find the child category by slug
  try {
    const category = await getCategoryForSSR(childSlug);
    if (category) {
      // Use the full URL path as canonical (e.g. /retail-hospitality-tech/restauranttech)
      // not just the bare child slug (/restauranttech)
      const categoryWithFullUrl = { ...category, url: `${BASE_URL}/${parentSlug}/${childSlug}` };
      const metaTags = generateCategoryMetaTags(categoryWithFullUrl);
      const jsonLd = generateCategoryJsonLd(categoryWithFullUrl);
      const articlesList = category.recentArticles && category.recentArticles.length > 0
        ? `<ul>${category.recentArticles.map(a => `<li><a href="${BASE_URL}/${a.categorySlug}/${a.slug}">${escapeHtml(a.title)}</a></li>`).join('')}</ul>`
        : '';
      const prerendered = `<noscript><div><h1>${category.name} News</h1><p>${category.description || ''}</p>${articlesList}</div></noscript>`;
      const html = injectSSRContent(template, metaTags, jsonLd, prerendered);
      return { html, status: 200 };
    }
  } catch (error) {
    console.error('[SSR] Error rendering subcategory page:', error);
  }
  
  return null; // Not a subcategory - let tryArticleSSR handle it
}

/**
 * Try SSR for article page: /:category/:slug
 * The category can be either a parent or child category slug.
 * Also accepts /news/:slug as a universal prefix.
 */
async function tryArticleSSR(url: string, template: string): Promise<{ html: string; status: number } | null> {
  const urlParts = url.split('/').filter(Boolean);
  if (urlParts.length !== 2) return null;
  
  const [categorySlug, articleSlug] = urlParts;
  console.log('[SSR] Attempting article SSR:', { categorySlug, articleSlug, url });
  try {
    const article = await getArticleForSSR(categorySlug, articleSlug);
    console.log('[SSR] Article found:', !!article, article?.title);
    if (article) {
      // Serve every article at exactly ONE URL. /news/:slug and
      // secondary-category paths used to return 200 duplicates, which
      // Google flagged as duplicate clusters — 301 them to the
      // canonical /{primaryCategory}/{slug} instead.
      const canonicalUrl = await getArticleCanonicalUrl(articleSlug);
      const requestedUrl = `${BASE_URL}${url.split('?')[0].split('#')[0].replace(/\/$/, '')}`;
      if (canonicalUrl && canonicalUrl !== requestedUrl) {
        const redirectHtml = template.replace(
          '</head>',
          `<meta http-equiv="refresh" content="0; url=${canonicalUrl}" /><link rel="canonical" href="${canonicalUrl}" /></head>`
        );
        return { html: redirectHtml, status: 301 };
      }
      const metaTags = generateMetaTags(article);
      const jsonLd = generateJsonLd(article);
      const prerenderedContent = generatePrerenderedContent(article);
      const html = injectSSRContent(template, metaTags, jsonLd, prerenderedContent);
      return { html, status: 200 };
    } else {
      // Return 404 with noindex to prevent thin content indexing
      return { html: inject404Response(template, url), status: 404 };
    }
  } catch (error) {
    console.error('[SSR] Error rendering article:', error);
    return { html: inject404Response(template, url), status: 404 };
  }
}

/**
 * Try SSR for 3-segment article URLs: /parentCat/childCat/articleSlug
 * e.g. /technology/health-tech/article-slug, /news/press-release/article-slug
 */
async function tryThreeSegmentArticleSSR(url: string, template: string): Promise<{ html: string; status: number } | null> {
  const urlParts = url.split('/').filter(Boolean);
  if (urlParts.length !== 3) return null;
  
  const [parentSlug, childSlug, articleSlug] = urlParts;
  
  // Skip entity prefixes
  const entityPrefixes = new Set(['companies', 'investors', 'people', 'events', 'jobs', 'accelerators', 'resources', 'admin', 'dashboard']);
  if (entityPrefixes.has(parentSlug)) return null;
  
  // Try to find the article using the child category slug
  try {
    const canonical3 = await getArticleCanonicalUrl(articleSlug);
    if (canonical3) {
      // Canonical article URLs are 2-segment; every 3-segment variant
      // is a duplicate — permanent-redirect it.
      const redirectHtml = template.replace(
        '</head>',
        `<meta http-equiv="refresh" content="0; url=${canonical3}" /><link rel="canonical" href="${canonical3}" /></head>`
      );
      return { html: redirectHtml, status: 301 };
    }
    const article = await getArticleForSSR(childSlug, articleSlug);
    if (article) {
      const metaTags = generateMetaTags(article);
      const jsonLd = generateJsonLd(article);
      const prerenderedContent = generatePrerenderedContent(article);
      const html = injectSSRContent(template, metaTags, jsonLd, prerenderedContent);
      return { html, status: 200 };
    }
    
    // Also try with the parent slug (some articles have parent as primary category)
    const articleByParent = await getArticleForSSR(parentSlug, articleSlug);
    if (articleByParent) {
      const metaTags = generateMetaTags(articleByParent);
      const jsonLd = generateJsonLd(articleByParent);
      const prerenderedContent = generatePrerenderedContent(articleByParent);
      const html = injectSSRContent(template, metaTags, jsonLd, prerenderedContent);
      return { html, status: 200 };
    }
    
    // Also try with 'news' as universal prefix
    const articleByNews = await getArticleForSSR('news', articleSlug);
    if (articleByNews) {
      const metaTags = generateMetaTags(articleByNews);
      const jsonLd = generateJsonLd(articleByNews);
      const prerenderedContent = generatePrerenderedContent(articleByNews);
      const html = injectSSRContent(template, metaTags, jsonLd, prerenderedContent);
      return { html, status: 200 };
    }
  } catch (error) {
    console.error('[SSR] Error rendering 3-segment article:', error);
  }
  
  // 3-segment path but no article found - check if it's a subcategory page
  // e.g. /powerlist/incubators (2-segment subcategory that got 3rd segment appended)
  return null;
}

/**
 * Try SSR for bare article slug: /:articleSlug
 * Handles old URLs like /neobanks-in-mena-... that should redirect to /catSlug/neobanks-in-mena-...
 * These appear in GSC as 404s - redirect to canonical URL
 */
async function tryBareArticleSSR(url: string, template: string): Promise<{ html: string; status: number } | null> {
  const urlParts = url.split('/').filter(Boolean);
  if (urlParts.length !== 1) return null;
  
  const [slug] = urlParts;
  // Skip known static pages
  if (knownStaticPages.has('/' + slug)) return null;
  
  try {
    const canonicalUrl = await getArticleCanonicalUrl(slug);
    if (canonicalUrl) {
      // Return 301 redirect to canonical URL
      const redirectHtml = template.replace(
        '</head>',
        `<meta http-equiv="refresh" content="0; url=${canonicalUrl}" /><link rel="canonical" href="${canonicalUrl}" /></head>`
      );
      return { html: redirectHtml, status: 301 };
    }
  } catch (error) {
    console.error('[SSR] Error in tryBareArticleSSR:', error);
  }
  
  return null;
}

/**
 * Run all SSR handlers in priority order
 */
/**
 * Legacy alias: /article/:slug (and /articles/:slug). The canonical URL
 * is /{categorySlug}/{articleSlug}; the SPA renders the alias client-side
 * but the server used to 404 it — so Google indexed nothing. 301 to the
 * canonical URL instead.
 */
async function tryLegacyArticleAlias(url: string, template: string): Promise<{ html: string; status: number } | null> {
  const m = url.match(/^\/articles?\/([^/?#]+)\/?$/);
  if (!m) return null;
  try {
    const canonicalUrl = await getArticleCanonicalUrl(m[1]);
    if (canonicalUrl) {
      const redirectHtml = template.replace(
        '</head>',
        `<meta http-equiv="refresh" content="0; url=${canonicalUrl}" /><link rel="canonical" href="${canonicalUrl}" /></head>`
      );
      return { html: redirectHtml, status: 301 };
    }
  } catch (error) {
    console.error('[SSR] Error in tryLegacyArticleAlias:', error);
  }
  return { html: inject404Response(template, url), status: 404 };
}

/**
 * Live coverage pages: /events/:slug/live and /events/:slug/live/:postId.
 * Serve the event's SSR meta (title/og/image) so shared links unfurl,
 * with the canonical pinned to the exact live URL. Per-post permalinks
 * prefer the post's own headline/image when available.
 */
async function tryEventLiveSSR(url: string, template: string): Promise<{ html: string; status: number } | null> {
  const m = url.match(/^\/events\/([^/?#]+)\/live(?:\/(\d+))?\/?$/);
  if (!m) return null;
  try {
    const event = await getEventForSSR(m[1]);
    if (!event) return { html: inject404Response(template, url), status: 404 };

    const post = m[2] ? await getLivePostForSSR(Number(m[2])) : null;
    const title = post?.headline
      ? `${post.headline} — LIVE: ${event.title}`
      : `LIVE: ${event.title} — Live Coverage | ${SITE_NAME}`;
    const description = (post?.body ?? `Live updates, photos and breaking news from ${event.title}.`)
      .replace(/<[^>]+>/g, '').slice(0, 200);
    const image = post?.imageUrl || event.featuredImage || DEFAULT_OG_IMAGE;

    let html = template
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta[^>]*name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
      .replace(/<meta[^>]*property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`)
      .replace(/<meta[^>]*property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`)
      .replace(/<meta[^>]*property="og:image"[^>]*>/i, `<meta property="og:image" content="${escapeHtml(image)}" />`);
    html = injectCanonical(html, url);
    return { html, status: 200 };
  } catch (error) {
    console.error('[SSR] Error in tryEventLiveSSR:', error);
    return null;
  }
}

export async function runSSR(url: string, template: string): Promise<{ html: string; status: number } | null> {
  // A language is a path prefix, so /ar/construction/big-5-opens has to
  // resolve to the same article as /construction/big-5-opens. Strip it
  // before routing, or every route below reads "ar" as a category and the
  // whole non-default language 404s.
  const path = url.split("?")[0];
  const query = url.slice(path.length);
  let routed = url;
  try {
    const { listLocales } = await import("../services/translation.service");
    const { splitLocalePath } = await import("../services/locale.service");
    const active = await listLocales({ activeOnly: true });
    const { code, basePath } = splitLocalePath(path, active.map(l => l.code));
    if (code) routed = basePath + query;
  } catch {
    // No locale table yet — serve the URL as written.
  }

  const result = await routeSSR(routed, template);
  if (!result) return null;
  // Language head, applied once for every route rather than in each of the
  // eleven meta-tag generators: <html lang dir>, the canonical for THIS
  // language, and the reciprocal hreflang set.
  try {
    const { applyLocaleHead } = await import("../services/hreflang.service");
    return { ...result, html: await applyLocaleHead(result.html, path) };
  } catch (err) {
    // A language lookup must never cost us a rendered page.
    console.error("[SSR] locale head failed:", (err as Error).message);
    return result;
  }
}

async function routeSSR(url: string, template: string): Promise<{ html: string; status: number } | null> {
  // 0a. Live coverage pages (/events/:slug/live[/:postId])
  const liveResult = await tryEventLiveSSR(url, template);
  if (liveResult) return liveResult;

  // 0b. Legacy /article/:slug alias — 301 to the canonical category URL
  const aliasResult = await tryLegacyArticleAlias(url, template);
  if (aliasResult) return aliasResult;

  // 1. Entity detail pages (highest priority - exact prefix match)
  const entityResult = await tryEntitySSR(url, template);
  if (entityResult) return entityResult;
  
  // 2. Tag pages
  const tagResult = await tryTagSSR(url, template);
  if (tagResult) return tagResult;
  
  // 3. Category pages (single segment)
  const catResult = await tryCategorySSR(url, template);
  if (catResult) return catResult;
  
  // 4. Subcategory pages (/parent/child) - try before article SSR
  const subcatResult = await trySubcategorySSR(url, template);
  if (subcatResult) return subcatResult;
  
  // 5. Article pages (catch-all for /:cat/:slug - must be last)
  const articleResult = await tryArticleSSR(url, template);
  if (articleResult) return articleResult;
  
  // 6. 3-segment article URLs: /parentCat/childCat/articleSlug
  const threeSegResult = await tryThreeSegmentArticleSSR(url, template);
  if (threeSegResult) return threeSegResult;
  
  // 7. Bare article slug: /:articleSlug (old URLs without category prefix)
  const bareArticleResult = await tryBareArticleSSR(url, template);
  if (bareArticleResult) return bareArticleResult;
  
  return null;
}

/**
 * Locate the built client.
 *
 * The server runs from two very different layouts — the esbuild bundle at
 * dist/index.js, and the TypeScript source under server/_core/ via tsx —
 * so probe for the build rather than branching on NODE_ENV. Branching was
 * how a stray NODE_ENV=development produced
 * "ENOENT: stat '/dist/public/index.html'" in production: resolving
 * "../../../dist/public" from /app/dist walks past the filesystem root and
 * lands on /dist/public. An environment variable should not be able to
 * decide where files are on disk.
 */
function findClientBuild(): string {
  const candidates = [
    // Bundle: dist/index.js -> dist/public
    path.resolve(import.meta.dirname, "public"),
    // Source via tsx: server/_core -> dist/public
    path.resolve(import.meta.dirname, "..", "..", "dist", "public"),
    // Started from the repo root by some other runner.
    path.resolve(process.cwd(), "dist", "public"),
  ];
  const found = candidates.find(c => fs.existsSync(path.join(c, "index.html")));
  if (found) return found;

  console.error(
    `Could not find the built client. Looked in:\n  ${candidates.join("\n  ")}\n` +
      `Run "pnpm build" before starting the server.`,
  );
  return candidates[0];
}

export function serveStatic(app: Express) {
  const distPath = findClientBuild();

  console.log(`[SSR] serveStatic initialized with distPath: ${distPath}`);

  app.use(express.static(distPath));

  // SSR for all content pages
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    console.log(`[SSR] serveStatic middleware handling URL: ${url}`);
    
    // Static assets that reached this point don't exist on disk
    // (express.static already had first shot) — 404 immediately rather
    // than serving the SPA shell as a fake image.
    if (isStaticAssetPath(url)) {
      res.status(404).type("text/plain").send("Not Found");
      return;
    }

    // System URLs - serve raw template
    if (isSystemUrl(url)) {
      const indexPath = path.resolve(distPath, "index.html");
      res.sendFile(indexPath);
      return;
    }
    
    try {
      const indexPath = path.resolve(distPath, "index.html");
      let template = await fs.promises.readFile(indexPath, "utf-8");
      
      // Try full SSR for content pages
      const ssrResult = await runSSR(url, template);
      if (ssrResult) {
        // Redirect results carry their target in a meta-refresh tag —
        // surface it as a real Location header (a 301 without one is
        // useless to crawlers).
        if (ssrResult.status === 301 || ssrResult.status === 302) {
          const locationMatch = ssrResult.html.match(/url=([^"\s]+)/);
          if (locationMatch) {
            res.redirect(ssrResult.status, locationMatch[1]);
            return;
          }
        }
        console.log(`[SSR] Successfully rendered ${url} with status ${ssrResult.status}`);
        res.status(ssrResult.status).set({ "Content-Type": "text/html" } as any).end(ssrResult.html);
        return;
      }
      console.log(`[SSR] runSSR returned null for ${url}, falling back to static page meta tags`);
      
      // For known static pages: inject SEO meta tags
      const cleanPath = url.split('?')[0].split('#')[0];
      const isKnownPage = knownStaticPages.has(cleanPath);
      
      // Determine HTTP status: 404 for unknown pages, 200 for known pages
      const pageStatus = isKnownPage ? 200 : 404;
      
      const staticPageMetaTags = generateStaticPageMetaTags(cleanPath);
      
      // Remove default meta tags that will be replaced
      let finalTemplate = template
        .replace(/<title>[^<]*<\/title>/g, '')
        .replace(/<meta[^>]*name="description"[^>]*>/gi, '')
        .replace(/<meta[^>]*name="title"[^>]*>/gi, '')
        .replace(/<meta[^>]*name="keywords"[^>]*>/gi, '')
        .replace(/<meta[^>]*property="og:[^"]*"[^>]*>/gi, '')
        .replace(/<meta[^>]*name="twitter:[^"]*"[^>]*>/gi, '')
        .replace(/<link[^>]*rel="canonical"[^>]*>/gi, '');
      
      // Inject new SEO meta tags
      finalTemplate = finalTemplate.replace(
        '</head>',
        `${staticPageMetaTags}\n</head>`
      );
      
      // Also inject correct canonical URL
      finalTemplate = injectCanonical(finalTemplate, url);
      
      // Only add noindex for unknown pages or explicitly-noindex'd
      // pages. Pagination (?page=N) is NOT noindex'd — see the dev
      // path above for the rationale. Canonical handles dedup.
      const isExplicitNoindex = noindexPages.has(cleanPath);
      if (!isKnownPage || isExplicitNoindex) {
        finalTemplate = finalTemplate.replace(
          /<meta[^>]*name="robots"[^>]*>/gi,
          '<meta name="robots" content="noindex, follow" />'
        );
      }
      
      res.status(pageStatus).set({ "Content-Type": "text/html" } as any).end(finalTemplate);
    } catch (error) {
      console.error('[SSR] Error in production SSR:', error);
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}
