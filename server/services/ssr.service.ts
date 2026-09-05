import { publication, getBaseUrl } from "../../shared/publication";

const BASE = getBaseUrl();
const SITE = publication.name;
const OG_IMAGE = `${BASE}${publication.assets.ogImage}`;

import { getDb } from "../db";
import { articles, categories, articleCategories, users, media, tags, articleTags, companies, investors, people, events, jobs, accelerators , eventLivePosts } from "../../drizzle/schema";
import { eq, and, desc, isNotNull, count, sql } from "drizzle-orm";
import { localizeArticle, localizeArticles, localizeCategoryLabels, localizeRows } from "./translation.service";

/**
 * Safely convert a string or Date timestamp to ISO string
 * Drizzle with mode: 'string' returns timestamps as strings
 */
function safeISOString(d: string | Date | null | undefined): string {
  if (!d) return '';
  if (typeof d === 'string') {
    // Already a string - if it looks like ISO, return as-is
    if (d.includes('T')) return d;
    return new Date(d).toISOString();
  }
  return d.toISOString();
}

// ============================================================
// SERVER-SIDE RENDERING SERVICE
// Pre-renders article pages with meta tags and JSON-LD for SEO
// Deployment trigger: Force production redeployment with SSR fixes (Feb 26, 2026)
// ============================================================

interface ArticleSSRData {
  title: string;
  description: string;
  image: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  imageMimeType: string | null;
  url: string;
  publishedAt: string | Date | null;
  updatedAt: string | Date | null;
  author: {
    name: string;
    url: string;
    image: string | null;
  } | null;
  category: {
    name: string;
    slug: string;
  } | null;
  content: string;
  // Custom SEO fields (override defaults when set)
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrlOverride: string | null;
  // Internal-linking signals: rendered into <noscript> so Googlebot's
  // first-pass crawler picks up the link graph without waiting for JS hydration.
  related?: Array<{ title: string; url: string }>;
}

/**
 * Fetch article data for SSR
 * Returns null if article not found OR if the URL category doesn't match the article's primary category
 * (non-primary category URLs should 301 redirect, not render)
 */
/**
 * The article a crawler and a no-JS reader are served.
 *
 * `locale` is what makes /ar/construction/big-5-opens an Arabic page rather
 * than an English page with an Arabic `lang` attribute. Without it the head
 * said "ar" and every word under it was English — which is worse than not
 * translating at all, because it asks Google to index two URLs carrying the
 * same text as if they were different languages.
 */
export async function getArticleForSSR(
  categorySlug: string, articleSlug: string,
  locale?: { code: string; isDefault: boolean },
): Promise<ArticleSSRData | null> {
  const db = await getDb();
  if (!db) return null;

  // Single query: article + primary category + author + featured image via LEFT JOINs
  const aliasParent = categories;
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      content: articles.content,
      publishedAt: articles.publishedAt,
        eventDate: articles.eventDate,
      updatedAt: articles.updatedAt,
      primaryCategoryId: articles.primaryCategoryId,
      canonicalUrl: articles.canonicalUrl,
      seoTitle: articles.seoTitle,
      seoDescription: articles.seoDescription,
      seoKeywords: articles.seoKeywords,
      catName: categories.name,
      catSlug: categories.slug,
      catParentId: categories.parentId,
      authorId: users.id,
      authorName: users.name,
      authorUsername: users.username,
      authorAvatar: users.avatar,
      mediaUrl: media.url,
      mediaWidth: media.width,
      mediaHeight: media.height,
      mediaMimeType: media.mimeType,
    })
    .from(articles)
    .leftJoin(categories, eq(categories.id, articles.primaryCategoryId))
    .leftJoin(users, eq(users.id, articles.authorId))
    .leftJoin(media, eq(media.id, articles.featuredImageId))
    .where(and(eq(articles.slug, articleSlug), isNotNull(articles.publishedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    console.log(`[SSR] Article not found: slug=${articleSlug}`);
    return null;
  }

  let category: { name: string; slug: string } | null = row.catName
    ? { name: row.catName, slug: row.catSlug! }
    : null;

  // Fallback: first articleCategories entry (one extra query only when primaryCategoryId is null)
  if (!category) {
    const firstCat = await db
      .select({ name: categories.name, slug: categories.slug })
      .from(articleCategories)
      .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
      .where(eq(articleCategories.articleId, row.id))
      .limit(1)
      .then((r: any[]) => r[0]);
    if (firstCat) category = firstCat;
  }

  // The section name is a category's field on the article's row, so the
  // article overlay below cannot reach it; without this the Arabic page's
  // breadcrumb and articleSection said "Construction".
  if (category && locale && !locale.isDefault && row.primaryCategoryId) {
    try {
      const [loc] = await localizeCategoryLabels(locale,
        [{ categoryId: row.primaryCategoryId, categoryName: category.name }]);
      if (loc?.categoryName) category = { ...category, name: loc.categoryName };
    } catch (err) {
      console.error('[SSR] category label localisation failed:', err);
    }
  }

  const expectedCategorySlug = category?.slug || 'news';

  // Check parent category match (one extra query only when URL slug differs from article category)
  let isParentCategory = false;
  if (category && categorySlug !== expectedCategorySlug && categorySlug !== 'news') {
    if (row.catParentId) {
      const parentCatRow = await db
        .select({ slug: categories.slug })
        .from(categories)
        .where(eq(categories.id, row.catParentId))
        .limit(1)
        .then((r: any[]) => r[0]);
      isParentCategory = parentCatRow?.slug === categorySlug;
    }
  }

  const isValidCategory = categorySlug === expectedCategorySlug || categorySlug === 'news' || isParentCategory;
  console.log(`[SSR] Category validation: URL=${categorySlug}, Expected=${expectedCategorySlug}, isParent=${isParentCategory}, Match=${isValidCategory}`);
  if (!isValidCategory) {
    console.log(`[SSR] Category mismatch - returning null (URL=${categorySlug}, Expected=${expectedCategorySlug})`);
    return null;
  }

  const author = row.authorName
    ? {
        name: row.authorName || `${SITE} Staff`,
        // Bylines link to /author/<username> (the editorial-author page).
        // /people/* is for tracked tech-people profiles, not staff writers.
        url: `${BASE}/author/${row.authorUsername || row.authorId || 'staff'}`,
        image: row.authorAvatar,
      }
    : null;

  console.log(`[SSR] Featured image URL: ${row.mediaUrl}`);

  const canonicalUrl = category
    ? `${BASE}/${category.slug}/${row.slug}`
    : `${BASE}/news/${row.slug}`;

  // Internal-linking: pull up to 5 sibling articles in the same primary category.
  // Falls back to most-recent published if there's only one in the category.
  let related: Array<{ title: string; url: string }> = [];
  try {
    if (category) {
      const sibs = await db
        .select({ id: articles.id, title: articles.title, slug: articles.slug })
        .from(articles)
        .where(and(
          eq(articles.primaryCategoryId, row.primaryCategoryId!),
          isNotNull(articles.publishedAt),
        ))
        .orderBy(desc(articles.publishedAt))
        .limit(8);
      const siblings = await localizeArticles(
        locale,
        sibs.filter((s: any) => s.slug !== row.slug).slice(0, 5),
      );
      related = siblings.map((s: any) => ({
        title: s.title,
        url: `${BASE}/${category.slug}/${s.slug}`,
      }));
    }
  } catch (err) {
    console.error('[SSR] related-article fetch failed:', err);
  }

  // The overlay, applied once to the row this page is built from. Every
  // generator below — meta tags, JSON-LD, the prerendered body — reads these
  // fields, so doing it here localizes the whole page instead of each of them
  // growing its own copy. A no-op on the default language.
  const a = await localizeArticle(locale, row as any) as typeof row;

  return {
    title: a.title,
    description: a.excerpt || publication.description,
    image: row.mediaUrl || null,
    imageWidth: row.mediaWidth || null,
    imageHeight: row.mediaHeight || null,
    imageMimeType: row.mediaMimeType || null,
    url: row.canonicalUrl || canonicalUrl,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    author,
    category,
    content: a.content || '',
    seoTitle: a.seoTitle,
    seoDescription: a.seoDescription,
    seoKeywords: row.seoKeywords,
    canonicalUrlOverride: row.canonicalUrl,
    related,
  };
}

/**
 * Build a BreadcrumbList JSON-LD script for any detail page.
 * Pass an array of {name, url} in left-to-right order.
 */
function breadcrumbJsonLd(items: Array<{ name: string; url: string }>): string {
  const list = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(list)}</script>`;
}

const BREADCRUMB_BASE = BASE;

/**
 * Generate meta tags HTML for article
 */
export function generateMetaTags(article: ArticleSSRData): string {
  // Use custom SEO fields if set, otherwise fall back to defaults
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.description || publication.description;
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const publishedTime = safeISOString(article.publishedAt) || '';
  const modifiedTime = safeISOString(article.updatedAt) || publishedTime;

  // Build image meta tags with dimensions for WhatsApp/social media compatibility
  // An article without a featured image still needs a share card: with no
  // og:image at all, a summary_large_image card renders blank and a crawler
  // falls back to whatever it finds first on the page.
  let imageMetaTags = '';
  if (!article.image) {
    imageMetaTags = `
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:image:secure_url" content="${OG_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="${escapeHtml(SITE)}" />`;
  }
  if (article.image) {
    // Detect MIME type from URL extension to fix mismatches (e.g. stored as image/png but URL ends in .jpg)
    const inferMimeTypeFromUrl = (url: string, storedType: string | null): string => {
      const lower = url.toLowerCase().split('?')[0];
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
      if (lower.endsWith('.png')) return 'image/png';
      if (lower.endsWith('.webp')) return 'image/webp';
      if (lower.endsWith('.gif')) return 'image/gif';
      return storedType || 'image/jpeg';
    };
    const resolvedMimeType = inferMimeTypeFromUrl(article.image, article.imageMimeType);
    imageMetaTags = `
    <meta property="og:image" content="${article.image}" />
    <meta property="og:image:secure_url" content="${article.image}" />
    ${article.imageWidth ? `<meta property="og:image:width" content="${article.imageWidth}" />` : '<meta property="og:image:width" content="1200" />'}
    ${article.imageHeight ? `<meta property="og:image:height" content="${article.imageHeight}" />` : '<meta property="og:image:height" content="630" />'}
    <meta property="og:image:type" content="${resolvedMimeType}" />
    <meta property="og:image:alt" content="${escapedTitle}" />`;
  }

  let metaTags = `
    <title>${escapedTitle} | ${SITE}</title>
    <meta name="description" content="${escapedDescription}" />
    ${article.seoKeywords ? `<meta name="keywords" content="${escapeHtml(article.seoKeywords)}" />` : ''}
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${article.url}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:site_name" content="${SITE}" />
    <meta property="og:locale" content="en_US" />
    ${imageMetaTags}
    ${publishedTime ? `<meta property="article:published_time" content="${publishedTime}" />` : ''}
    ${modifiedTime ? `<meta property="article:modified_time" content="${modifiedTime}" />` : ''}
    ${article.category ? `<meta property="article:section" content="${escapeHtml(article.category.name)}" />` : ''}
    <meta property="article:publisher" content="${BASE}" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="${publication.xHandle}" />
    <meta name="twitter:url" content="${article.url}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:image" content="${article.image || OG_IMAGE}" />
    <meta name="twitter:image:alt" content="${article.image ? escapedTitle : escapeHtml(SITE)}" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${article.url}" />
  `;

  return metaTags;
}

/**
 * Generate JSON-LD structured data for article
 */
export function generateJsonLd(article: ArticleSSRData): string {
  const newsArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.description,
    url: article.url,
    image: article.image || OG_IMAGE,
    datePublished: safeISOString(article.publishedAt),
    dateModified: safeISOString(article.updatedAt) || safeISOString(article.publishedAt),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
    author: article.author ? {
      '@type': 'Person',
      name: article.author.name,
      url: article.author.url,
      image: article.author.image || undefined,
    } : {
      '@type': 'Organization',
      name: SITE,
      url: BASE,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE,
      url: BASE,
      logo: {
        '@type': 'ImageObject',
        url: OG_IMAGE,
      },
    },
    articleSection: article.category?.name,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    // SpeakableSpecification — eligible for Google Assistant audio results.
    // Targets the article H1 and the first paragraph block of the body.
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'article p:first-of-type', 'article [class*="excerpt"]'],
    },
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: BASE,
      },
      article.category ? {
        '@type': 'ListItem',
        position: 2,
        name: article.category.name,
        item: `${BASE}/${article.category.slug}`,
      } : null,
      {
        '@type': 'ListItem',
        position: article.category ? 3 : 2,
        name: article.title,
        item: article.url,
      },
    ].filter(Boolean),
  };

  return `
    <script type="application/ld+json">${JSON.stringify(newsArticleSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  `;
}

/**
 * Generate pre-rendered content for article (visible to crawlers)
 * This content is hidden from users but visible to search engines
 */
/**
 * Reduce article HTML to a small safe subset for the crawler block.
 *
 * This used to strip every tag and escape the result, which meant the
 * crawler-visible body was plain text: every contextual link in the prose —
 * internal cross-references and primary-source citations alike — was
 * invisible to anything that does not execute JavaScript. Those links are
 * the point of the internal linking, so they have to survive.
 *
 * Everything outside the whitelist is escaped rather than trusted, and an
 * href must be a site-relative path or an http(s) URL, which rules out
 * javascript: and data: payloads reaching the served page.
 */
function sanitizeForCrawler(html: string): string {
  const ALLOWED = new Set(["p", "a", "strong", "em", "br"]);
  let out = "";
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) { out += escapeHtml(html.slice(i)); break; }
    out += escapeHtml(html.slice(i, lt));
    const gt = html.indexOf(">", lt);
    if (gt === -1) { out += escapeHtml(html.slice(lt)); break; }

    const raw = html.slice(lt + 1, gt).trim();
    const closing = raw.startsWith("/");
    const name = (closing ? raw.slice(1) : raw).split(/[\s/]/)[0].toLowerCase();

    if (ALLOWED.has(name)) {
      if (closing) {
        out += `</${name}>`;
      } else if (name === "a") {
        const href = /href\s*=\s*"([^"]*)"/i.exec(raw)?.[1] ?? "";
        const safe = /^\/[^/\\]/.test(href) || /^https?:\/\//i.test(href);
        out += safe ? `<a href="${escapeHtml(href)}">` : "<a>";
      } else {
        out += name === "br" ? "<br/>" : `<${name}>`;
      }
    }
    // Anything else is dropped, not emitted as escaped markup — a stray
    // <script> should leave no trace in the crawler block.
    i = gt + 1;
  }
  return out.replace(/[ \t]+/g, " ").replace(/(\s*\n\s*)+/g, "\n").trim();
}

export function generatePrerenderedContent(article: ArticleSSRData): string {
  // Keep the prose's links: they are the internal-linking and citation
  // signal, and stripping them made the crawler block link-free.
  const plainContent = sanitizeForCrawler(article.content).substring(0, 8000);

  const relatedHtml = (article.related && article.related.length > 0)
    ? `<aside><h2>Related</h2><ul>${
        article.related.map(r => `<li><a href="${escapeHtml(r.url)}">${escapeHtml(r.title)}</a></li>`).join("")
      }</ul></aside>`
    : "";

  return `
    <noscript>
      <article>
        <h1>${escapeHtml(article.title)}</h1>
        ${article.category ? `<p>Category: <a href="${BASE}/${escapeHtml(article.category.slug)}">${escapeHtml(article.category.name)}</a></p>` : ''}
        ${article.author ? `<p>By <a href="${escapeHtml(article.author.url)}">${escapeHtml(article.author.name)}</a></p>` : ''}
        ${article.publishedAt ? `<p>Published: ${safeISOString(article.publishedAt)}</p>` : ''}
        <p>${escapeHtml(article.description)}</p>
        <div>${plainContent}</div>
        ${relatedHtml}
      </article>
    </noscript>
  `;
}

// ============================================================
// TAG PAGE SSR
// ============================================================

interface TagSSRData {
  name: string;
  slug: string;
  description: string | null;
  tagType: string | null;
  articleCount: number;
  url: string;
}

/**
 * Fetch tag data for SSR
 */
export async function getTagForSSR(tagSlug: string): Promise<TagSSRData | null> {
  const db = await getDb();
  if (!db) return null;

  const tag = await db.select({
    id: tags.id,
    name: tags.name,
    slug: tags.slug,
    description: tags.description,
    tagType: tags.tagType,
  })
    .from(tags)
    .where(eq(tags.slug, tagSlug))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (!tag) return null;

  // Count articles with this tag
  const countResult = await db.select({ count: count() })
    .from(articleTags)
    .innerJoin(articles, eq(articleTags.articleId, articles.id))
    .where(and(
      eq(articleTags.tagId, tag.id),
      isNotNull(articles.publishedAt)
    ));

  const articleCount = countResult[0]?.count || 0;

  return {
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    tagType: tag.tagType,
    articleCount,
    url: `${BASE}/tag/${tag.slug}`,
  };
}

/**
 * Generate meta tags for tag page
 */
export function generateTagMetaTags(tag: TagSSRData): string {
  const title = `${tag.name} News & Articles`;
  const description = tag.description || `Latest ${tag.name} news, analysis, and insights from the MENA tech ecosystem. ${tag.articleCount} articles covering ${tag.name}.`;
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);

  return `
    <title>${escapedTitle} | ${SITE}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta name="keywords" content="${escapeHtml(tag.name)}, MENA tech, startup news, technology" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${tag.url}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:site_name" content="${SITE}" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:url" content="${tag.url}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${tag.url}" />
  `;
}

/**
 * Generate JSON-LD for tag page
 */
export function generateTagJsonLd(tag: TagSSRData): string {
  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${tag.name} News & Articles`,
    description: tag.description || `Latest ${tag.name} news and articles from ${SITE}`,
    url: tag.url,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE,
      url: BASE,
    },
    numberOfItems: tag.articleCount,
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: BASE,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Tags',
        item: `${BASE}/tags`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tag.name,
        item: tag.url,
      },
    ],
  };

  return `
    <script type="application/ld+json">${JSON.stringify(collectionPage)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
  `;
}

/**
 * Generate pre-rendered content for tag page
 */
export function generateTagPrerenderedContent(tag: TagSSRData): string {
  return `
    <noscript>
      <div>
        <h1>${escapeHtml(tag.name)} News & Articles</h1>
        <p>${escapeHtml(tag.description || `Browse ${tag.articleCount} articles about ${tag.name} on ${SITE}`)}</p>
        <p>Category: ${escapeHtml(tag.tagType || 'General')}</p>
        <a href="${BASE}">Back to ${SITE}</a>
      </div>
    </noscript>
  `;
}

// ============================================================
// CATEGORY PAGE SSR
// ============================================================

interface CategorySSRData {
  name: string;
  slug: string;
  description: string | null;
  url: string;
  recentArticles?: Array<{ title: string; slug: string; categorySlug: string }>;
}

/**
 * Fetch category data for SSR
 */
export async function getCategoryForSSR(categorySlug: string): Promise<CategorySSRData | null> {
  const db = await getDb();
  if (!db) return null;

  const category = await db.select({
    id: categories.id,
    name: categories.name,
    slug: categories.slug,
    description: categories.description,
  })
    .from(categories)
    .where(eq(categories.slug, categorySlug))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (!category) return null;

  // Fetch recent 8 articles in this category
  const recentArticles = await db.select({
    title: articles.title,
    slug: articles.slug,
    categorySlug: categories.slug,
  })
    .from(articles)
    .innerJoin(categories, eq(articles.primaryCategoryId, categories.id))
    .where(
      and(
        eq(categories.id, category.id),
        isNotNull(articles.publishedAt)
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(8);

  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    url: `${BASE}/${category.slug}`,
    recentArticles: recentArticles.map(a => ({
      title: a.title,
      slug: a.slug,
      categorySlug: a.categorySlug,
    })),
  };
}

/**
 * Generate meta tags for category page
 */
export function generateCategoryMetaTags(cat: CategorySSRData): string {
  const title = `${cat.name} News & Updates`;
  const description = cat.description || `Latest ${cat.name} news, projects and analysis on ${SITE}.`;
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);

  return `
    <title>${escapedTitle} | ${SITE}</title>
    <meta name="description" content="${escapedDescription}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${cat.url}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:site_name" content="${SITE}" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:url" content="${cat.url}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${cat.url}" />
  `;
}

/**
 * Generate JSON-LD for category page
 */
export function generateCategoryJsonLd(cat: CategorySSRData): string {
  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${cat.name} News & Updates`,
    description: cat.description || `Latest ${cat.name} news from ${SITE}`,
    url: cat.url,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE,
      url: BASE,
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: cat.name, item: cat.url },
    ],
  };

  return `
    <script type="application/ld+json">${JSON.stringify(collectionPage)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
  `;
}

// ============================================================
// COMPANY PAGE SSR
// ============================================================

interface CompanySSRData {
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  shortDescription: string | null;
  logo: string | null;
  industry: string | null;
  location: string | null;
  foundedYear: number | null;
  totalFunding: string | null;
  url: string;
}

export async function getCompanyForSSR(idOrSlug: string): Promise<CompanySSRData | null> {
  const db = await getDb();
  if (!db) return null;

  const isNumeric = /^\d+$/.test(idOrSlug);
  const company = await db.select({
    name: companies.name,
    slug: companies.slug,
    tagline: companies.tagline,
    description: companies.description,
    shortDescription: companies.shortDescription,
    logo: companies.logo,
    industry: companies.industry,
    location: companies.location,
    foundedYear: companies.foundedYear,
    totalFunding: companies.totalFunding,
  })
    .from(companies)
    .where(isNumeric ? eq(companies.id, parseInt(idOrSlug)) : eq(companies.slug, idOrSlug))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (!company) return null;

  return {
    ...company,
    url: `${BASE}/companies/${company.slug || idOrSlug}`,
  };
}

export function generateCompanyMetaTags(c: CompanySSRData): string {
  const title = c.name;
  const rawDesc = c.shortDescription || c.tagline || c.description?.substring(0, 300) || `${c.name} - Company profile on ${SITE}`;
  const desc = stripHtml(rawDesc).substring(0, 160);
  const t = escapeHtml(title);
  const d = escapeHtml(desc);

  return `
    <title>${t} | ${SITE}</title>
    <meta name="description" content="${d}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${c.url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:site_name" content="${SITE}" />
    <meta property="og:locale" content="en_US" />
    ${c.logo ? `<meta property="og:image" content="${c.logo}" />\n    <meta property="og:image:alt" content="${t} logo" />` : ''}
    <meta name="twitter:card" content="${c.logo ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:site" content="${publication.xHandle}" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    ${c.logo ? `<meta name="twitter:image" content="${c.logo}" />` : ''}
    <link rel="canonical" href="${c.url}" />
  `;
}

export function generateCompanyJsonLd(c: CompanySSRData): string {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: c.name,
    description: c.shortDescription || c.description || undefined,
    url: c.url,
    logo: c.logo || undefined,
    foundingDate: c.foundedYear ? `${c.foundedYear}` : undefined,
    address: c.location ? { '@type': 'PostalAddress', addressLocality: c.location } : undefined,
    industry: c.industry || undefined,
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${BREADCRUMB_BASE}/` },
    { name: "Companies", url: `${BREADCRUMB_BASE}/companies` },
    { name: c.name, url: c.url },
  ]);
  return `<script type="application/ld+json">${JSON.stringify(org)}</script>\n${breadcrumb}`;
}

// ============================================================
// INVESTOR PAGE SSR
// ============================================================

interface InvestorSSRData {
  name: string;
  slug: string;
  type: string;
  description: string | null;
  shortDescription: string | null;
  logo: string | null;
  headquarters: string | null;
  aum: string | null;
  portfolioCount: number | null;
  url: string;
}

export async function getInvestorForSSR(idOrSlug: string): Promise<InvestorSSRData | null> {
  const db = await getDb();
  if (!db) return null;

  const isNumeric = /^\d+$/.test(idOrSlug);
  const investor = await db.select({
    name: investors.name,
    slug: investors.slug,
    type: investors.type,
    description: investors.description,
    shortDescription: investors.shortDescription,
    logo: investors.logo,
    headquarters: investors.headquarters,
    aum: investors.aum,
    portfolioCount: investors.portfolioCount,
  })
    .from(investors)
    .where(isNumeric ? eq(investors.id, parseInt(idOrSlug)) : eq(investors.slug, idOrSlug))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (!investor) return null;

  return {
    ...investor,
    url: `${BASE}/investors/${investor.slug || idOrSlug}`,
  };
}

export function generateInvestorMetaTags(inv: InvestorSSRData): string {
  const title = inv.name;
  const typeLabel = inv.type?.replace('_', ' ') || 'Investor';
  const rawDesc = inv.shortDescription || inv.description?.substring(0, 300) || `${inv.name} - ${typeLabel} profile on ${SITE}`;
  const desc = stripHtml(rawDesc).substring(0, 160);
  const t = escapeHtml(title);
  const d = escapeHtml(desc);

  return `
    <title>${t} | ${SITE}</title>
    <meta name="description" content="${d}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${inv.url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:site_name" content="${SITE}" />
    <meta property="og:locale" content="en_US" />
    ${inv.logo ? `<meta property="og:image" content="${inv.logo}" />\n    <meta property="og:image:alt" content="${t} logo" />` : ''}
    <meta name="twitter:card" content="${inv.logo ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:site" content="${publication.xHandle}" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    ${inv.logo ? `<meta name="twitter:image" content="${inv.logo}" />` : ''}
    <link rel="canonical" href="${inv.url}" />
  `;
}

export function generateInvestorJsonLd(inv: InvestorSSRData): string {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: inv.name,
    description: inv.shortDescription || inv.description || undefined,
    url: inv.url,
    logo: inv.logo || undefined,
    address: inv.headquarters ? { '@type': 'PostalAddress', addressLocality: inv.headquarters } : undefined,
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${BREADCRUMB_BASE}/` },
    { name: "Investors", url: `${BREADCRUMB_BASE}/investors` },
    { name: inv.name, url: inv.url },
  ]);
  return `<script type="application/ld+json">${JSON.stringify(org)}</script>\n${breadcrumb}`;
}

// ============================================================
// PERSON PAGE SSR
// ============================================================

interface PersonSSRData {
  name: string;
  slug: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  shortBio: string | null;
  avatar: string | null;
  location: string | null;
  url: string;
}

export async function getPersonForSSR(idOrSlug: string): Promise<PersonSSRData | null> {
  const db = await getDb();
  if (!db) return null;

  const isNumeric = /^\d+$/.test(idOrSlug);
  const person = await db.select({
    name: people.name,
    slug: people.slug,
    title: people.title,
    company: people.company,
    bio: people.bio,
    shortBio: people.shortBio,
    avatar: people.avatar,
    location: people.location,
  })
    .from(people)
    .where(isNumeric ? eq(people.id, parseInt(idOrSlug)) : eq(people.slug, idOrSlug))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (!person) return null;

  return {
    ...person,
    url: `${BASE}/people/${person.slug || idOrSlug}`,
  };
}

export function generatePersonMetaTags(p: PersonSSRData): string {
  const title = p.title && p.company ? `${p.name} - ${p.title} at ${p.company}` : p.name;
  const rawDesc = p.shortBio || p.bio?.substring(0, 300) || `${p.name}${p.title ? `, ${p.title}` : ''}${p.company ? ` at ${p.company}` : ''} - Profile on ${SITE}`;
  const desc = stripHtml(rawDesc).substring(0, 160);
  const t = escapeHtml(title);
  const d = escapeHtml(desc);

  return `
    <title>${t} | ${SITE}</title>
    <meta name="description" content="${d}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${p.url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:site_name" content="${SITE}" />
    <meta property="og:locale" content="en_US" />
    ${p.avatar ? `<meta property="og:image" content="${p.avatar}" />\n    <meta property="og:image:alt" content="${escapeHtml(p.name)}" />` : ''}
    <meta name="twitter:card" content="${p.avatar ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:site" content="${publication.xHandle}" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    ${p.avatar ? `<meta name="twitter:image" content="${p.avatar}" />` : ''}
    <link rel="canonical" href="${p.url}" />
  `;
}

export function generatePersonJsonLd(p: PersonSSRData): string {
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    description: p.shortBio || p.bio || undefined,
    url: p.url,
    image: p.avatar || undefined,
    jobTitle: p.title || undefined,
    worksFor: p.company ? { '@type': 'Organization', name: p.company } : undefined,
    address: p.location ? { '@type': 'PostalAddress', addressLocality: p.location } : undefined,
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${BREADCRUMB_BASE}/` },
    { name: "People", url: `${BREADCRUMB_BASE}/people` },
    { name: p.name, url: p.url },
  ]);
  return `<script type="application/ld+json">${JSON.stringify(person)}</script>\n${breadcrumb}`;
}

// ============================================================
// EVENT PAGE SSR
// ============================================================

interface EventSSRData {
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  featuredImage: string | null;
  type: string;
  format: string | null;
  startDate: string | null;
  endDate: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  organizerName: string | null;
  isFree: number | null;
  ticketPrice: string | null;
  ticketCurrency: string | null;
  url: string;
}

export async function getEventForSSR(idOrSlug: string): Promise<EventSSRData | null> {
  const db = await getDb();
  if (!db) return null;

  const isNumeric = /^\d+$/.test(idOrSlug);
  const event = await db.select({
    title: events.title,
    slug: events.slug,
    description: events.description,
    shortDescription: events.shortDescription,
    featuredImage: events.featuredImage,
    type: events.type,
    format: events.format,
    startDate: events.startDate,
    endDate: events.endDate,
    venue: events.venue,
    city: events.city,
    country: events.country,
    organizerName: events.organizerName,
    isFree: events.isFree,
    ticketPrice: events.ticketPrice,
    ticketCurrency: events.ticketCurrency,
  })
    .from(events)
    .where(isNumeric ? eq(events.id, parseInt(idOrSlug)) : eq(events.slug, idOrSlug))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (!event) return null;

  return {
    ...event,
    url: `${BASE}/events/${event.slug || idOrSlug}`,
  };
}

export function generateEventMetaTags(e: EventSSRData): string {
  const title = e.title;
  const locationParts = [e.venue, e.city, e.country].filter(Boolean);
  const locationStr = locationParts.length > 0 ? ` in ${locationParts.join(', ')}` : '';
  const dateStr = e.startDate ? ` on ${new Date(e.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '';
  const rawDesc = e.shortDescription || e.description?.substring(0, 300) || `${e.title}${dateStr}${locationStr} - Event on ${SITE}`;
  const desc = stripHtml(rawDesc).substring(0, 160);
  const t = escapeHtml(title);
  const d = escapeHtml(desc);

  return `
    <title>${t} | ${SITE}</title>
    <meta name="description" content="${d}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${e.url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:site_name" content="${SITE}" />
    <meta property="og:locale" content="en_US" />
    ${e.featuredImage ? `<meta property="og:image" content="${e.featuredImage}" />\n    <meta property="og:image:alt" content="${t}" />` : ''}
    <meta name="twitter:card" content="${e.featuredImage ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:site" content="${publication.xHandle}" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    ${e.featuredImage ? `<meta name="twitter:image" content="${e.featuredImage}" />` : ''}
    <link rel="canonical" href="${e.url}" />
  `;
}

export function generateEventJsonLd(e: EventSSRData): string {
  const event = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.shortDescription || e.description || undefined,
    url: e.url,
    image: e.featuredImage || undefined,
    startDate: e.startDate ? safeISOString(e.startDate) : undefined,
    endDate: e.endDate ? safeISOString(e.endDate) : undefined,
    eventAttendanceMode: e.format === 'virtual' ? 'https://schema.org/OnlineEventAttendanceMode' :
      e.format === 'hybrid' ? 'https://schema.org/MixedEventAttendanceMode' :
      'https://schema.org/OfflineEventAttendanceMode',
    location: e.venue ? {
      '@type': 'Place',
      name: e.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: e.city || undefined,
        addressCountry: e.country || undefined,
      },
    } : undefined,
    organizer: e.organizerName ? {
      '@type': 'Organization',
      name: e.organizerName,
    } : undefined,
    offers: e.isFree ? {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    } : e.ticketPrice ? {
      '@type': 'Offer',
      price: e.ticketPrice,
      priceCurrency: e.ticketCurrency || 'USD',
      availability: 'https://schema.org/InStock',
    } : undefined,
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${BREADCRUMB_BASE}/` },
    { name: "Events", url: `${BREADCRUMB_BASE}/events` },
    { name: e.title, url: e.url },
  ]);
  return `<script type="application/ld+json">${JSON.stringify(event)}</script>\n${breadcrumb}`;
}

// ============================================================
// JOB PAGE SSR
// ============================================================

interface JobSSRData {
  title: string;
  slug: string;
  description: string | null;
  companyName: string;
  companyLogo: string | null;
  location: string | null;
  isRemote: number | null;
  remoteType: string | null;
  roleType: string | null;
  seniority: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  url: string;
}

export async function getJobForSSR(idOrSlug: string): Promise<JobSSRData | null> {
  const db = await getDb();
  if (!db) return null;

  console.log(`[SSR] Fetching job with idOrSlug: ${idOrSlug}`);
  const isNumeric = /^\d+$/.test(idOrSlug);
  console.log(`[SSR] Job isNumeric: ${isNumeric}`);
  const job = await db.select({
    title: jobs.title,
    slug: jobs.slug,
    description: jobs.description,
    companyName: jobs.companyName,
    companyLogo: jobs.companyLogo,
    location: jobs.location,
    isRemote: jobs.isRemote,
    remoteType: jobs.remoteType,
    roleType: jobs.roleType,
    seniority: jobs.seniority,
    salaryMin: jobs.salaryMin,
    salaryMax: jobs.salaryMax,
    salaryCurrency: jobs.salaryCurrency,
    salaryPeriod: jobs.salaryPeriod,
  })
    .from(jobs)
    .where(isNumeric ? eq(jobs.id, parseInt(idOrSlug)) : eq(jobs.slug, idOrSlug))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  console.log(`[SSR] Job found:`, !!job, job?.title);
  if (!job) return null;

  return {
    ...job,
    url: `${BASE}/jobs/${job.slug || idOrSlug}`,
  };
}

export function generateJobMetaTags(j: JobSSRData): string {
  const title = `${j.title} at ${j.companyName}`;
  const locParts: string[] = [];
  if (j.location) locParts.push(j.location);
  if (j.isRemote) locParts.push('Remote');
  const locStr = locParts.length > 0 ? ` - ${locParts.join(', ')}` : '';
  const rawDesc = j.description?.substring(0, 300) || `${j.title} at ${j.companyName}${locStr}. Apply now on ${SITE}.`;
  const desc = stripHtml(rawDesc).substring(0, 160);
  const t = escapeHtml(title);
  const d = escapeHtml(desc);

  return `
    <title>${t} | ${SITE} Jobs</title>
    <meta name="description" content="${d}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${j.url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:site_name" content="${SITE}" />
    <meta property="og:locale" content="en_US" />
    ${j.companyLogo ? `<meta property="og:image" content="${j.companyLogo}" />\n    <meta property="og:image:alt" content="${escapeHtml(j.companyName)} logo" />` : ''}
    <meta name="twitter:card" content="${j.companyLogo ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:site" content="${publication.xHandle}" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    ${j.companyLogo ? `<meta name="twitter:image" content="${j.companyLogo}" />` : ''}
    <link rel="canonical" href="${j.url}" />
  `;
}

export function generateJobJsonLd(j: JobSSRData): string {
  const salarySpec = j.salaryMin && j.salaryMax ? {
    '@type': 'MonetaryAmount',
    currency: j.salaryCurrency || 'USD',
    value: {
      '@type': 'QuantitativeValue',
      minValue: parseFloat(j.salaryMin),
      maxValue: parseFloat(j.salaryMax),
      unitText: j.salaryPeriod === 'yearly' ? 'YEAR' : j.salaryPeriod === 'monthly' ? 'MONTH' : 'HOUR',
    },
  } : undefined;

  const posting = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: j.title,
    description: j.description || undefined,
    url: j.url,
    hiringOrganization: {
      '@type': 'Organization',
      name: j.companyName,
      logo: j.companyLogo || undefined,
    },
    jobLocation: j.location ? {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: j.location },
    } : undefined,
    jobLocationType: j.isRemote ? 'TELECOMMUTE' : undefined,
    employmentType: j.roleType === 'full_time' ? 'FULL_TIME' :
      j.roleType === 'part_time' ? 'PART_TIME' :
      j.roleType === 'contract' ? 'CONTRACTOR' :
      j.roleType === 'internship' ? 'INTERN' : undefined,
    baseSalary: salarySpec,
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${BREADCRUMB_BASE}/` },
    { name: "Jobs", url: `${BREADCRUMB_BASE}/jobs` },
    { name: j.title, url: j.url },
  ]);
  return `<script type="application/ld+json">${JSON.stringify(posting)}</script>\n${breadcrumb}`;
}

// ============================================================
// ACCELERATOR PAGE SSR
// ============================================================

interface AcceleratorSSRData {
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  logo: string | null;
  location: string | null;
  programLength: string | null;
  equity: string | null;
  funding: string | null;
  url: string;
}

export async function getAcceleratorForSSR(idOrSlug: string): Promise<AcceleratorSSRData | null> {
  const db = await getDb();
  if (!db) return null;

  const isNumeric = /^\d+$/.test(idOrSlug);
  const acc = await db.select({
    name: accelerators.name,
    slug: accelerators.slug,
    description: accelerators.description,
    shortDescription: accelerators.shortDescription,
    logo: accelerators.logo,
    location: accelerators.location,
    programLength: accelerators.programLength,
    equity: accelerators.equity,
    funding: accelerators.funding,
  })
    .from(accelerators)
    .where(isNumeric ? eq(accelerators.id, parseInt(idOrSlug)) : eq(accelerators.slug, idOrSlug))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (!acc) return null;

  return {
    ...acc,
    url: `${BASE}/accelerators/${acc.slug || idOrSlug}`,
  };
}

export function generateAcceleratorMetaTags(a: AcceleratorSSRData): string {
  const title = a.name;
  const rawDesc = a.shortDescription || a.description?.substring(0, 300) || `${a.name} - Accelerator program on ${SITE}`;
  const desc = stripHtml(rawDesc).substring(0, 160);
  const t = escapeHtml(title);
  const d = escapeHtml(desc);

  return `
    <title>${t} | ${SITE}</title>
    <meta name="description" content="${d}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${a.url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:site_name" content="${SITE}" />
    <meta property="og:locale" content="en_US" />
    ${a.logo ? `<meta property="og:image" content="${a.logo}" />\n    <meta property="og:image:alt" content="${t} logo" />` : ''}
    <meta name="twitter:card" content="${a.logo ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:site" content="${publication.xHandle}" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    ${a.logo ? `<meta name="twitter:image" content="${a.logo}" />` : ''}
    <link rel="canonical" href="${a.url}" />
  `;
}

export function generateAcceleratorJsonLd(a: AcceleratorSSRData): string {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: a.name,
    description: a.shortDescription || a.description || undefined,
    url: a.url,
    logo: a.logo || undefined,
    address: a.location ? { '@type': 'PostalAddress', addressLocality: a.location } : undefined,
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${BREADCRUMB_BASE}/` },
    { name: "Accelerators", url: `${BREADCRUMB_BASE}/accelerators` },
    { name: a.name, url: a.url },
  ]);
  return `<script type="application/ld+json">${JSON.stringify(org)}</script>\n${breadcrumb}`;
}

// ============================================================
// AUTHOR PAGE SSR (/author/:idOrUsername)
// ============================================================

interface AuthorSSRData {
  id: number;
  name: string;
  username: string | null;
  publicName: string | null;
  jobTitle: string | null;
  authorBio: string | null;
  bio: string | null;
  avatar: string | null;
  twitterHandle: string | null;
  linkedinUrl: string | null;
  url: string;
  articleCount: number;
}

export async function getAuthorForSSR(
  idOrUsername: string,
  locale?: { code: string; isDefault: boolean },
): Promise<AuthorSSRData | null> {
  const db = await getDb();
  if (!db) return null;

  const isNumeric = /^\d+$/.test(idOrUsername);

  const author = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      publicName: users.publicName,
      jobTitle: users.jobTitle,
      authorBio: users.authorBio,
      bio: users.bio,
      avatar: users.avatar,
      twitterHandle: users.twitterHandle,
      linkedinUrl: users.linkedinUrl,
      role: users.role,
    })
    .from(users)
    .where(isNumeric ? eq(users.id, parseInt(idOrUsername)) : eq(users.username, idOrUsername))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (!author) return null;
  // Don't expose plain users — only roles that produce content
  const indexableRoles = new Set(["author", "editor", "senior_editor", "admin"]);
  if (!indexableRoles.has(author.role)) return null;

  // Count published articles for byline display & sitemap eligibility
  const [{ c }] = await db
    .select({ c: count() })
    .from(articles)
    .where(and(eq(articles.authorId, author.id), isNotNull(articles.publishedAt))) as any;

  const slug = author.username || `${author.id}`;
  // Title and biography are editorial copy; serve them in the page's
  // language like the article overlay does.
  const [a] = await localizeRows(locale, "user", [author as any]);
  return {
    id: author.id,
    name: author.publicName || author.name || SITE,
    username: author.username,
    publicName: author.publicName,
    jobTitle: (a as any).jobTitle ?? author.jobTitle,
    authorBio: (a as any).authorBio ?? author.authorBio,
    bio: author.bio,
    avatar: author.avatar,
    twitterHandle: author.twitterHandle,
    linkedinUrl: author.linkedinUrl,
    url: `${BASE}/author/${slug}`,
    articleCount: Number(c) || 0,
  };
}

export function generateAuthorMetaTags(a: AuthorSSRData): string {
  const role = a.jobTitle || "Writer";
  const rawDesc = a.authorBio || a.bio?.substring(0, 300) || `${a.name} - ${role} at ${SITE}. ${a.articleCount} article${a.articleCount === 1 ? "" : "s"} published.`;
  const desc = stripHtml(rawDesc).substring(0, 160);
  const t = escapeHtml(`${a.name}${a.jobTitle ? ` — ${a.jobTitle}` : ""}`);
  const d = escapeHtml(desc);
  return `
    <title>${t} | ${SITE}</title>
    <meta name="description" content="${d}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${a.url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:site_name" content="${SITE}" />
    <meta property="og:locale" content="en_US" />
    ${a.avatar ? `<meta property="og:image" content="${a.avatar}" />\n    <meta property="og:image:alt" content="${escapeHtml(a.name)}" />` : ''}
    <meta name="twitter:card" content="${a.avatar ? "summary" : "summary"}" />
    <meta name="twitter:site" content="${publication.xHandle}" />
    ${a.twitterHandle ? `<meta name="twitter:creator" content="@${a.twitterHandle.replace(/^@/, "")}" />` : ''}
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    ${a.avatar ? `<meta name="twitter:image" content="${a.avatar}" />` : ''}
    <link rel="canonical" href="${a.url}" />
  `;
}

export function generateAuthorJsonLd(a: AuthorSSRData): string {
  const sameAs = [
    a.twitterHandle ? `https://twitter.com/${a.twitterHandle.replace(/^@/, "")}` : null,
    a.linkedinUrl,
  ].filter(Boolean);

  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: a.name,
    description: a.authorBio || a.bio || undefined,
    url: a.url,
    image: a.avatar || undefined,
    jobTitle: a.jobTitle || undefined,
    worksFor: { "@type": "Organization", "@id": "${BASE}/#organization" },
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${BREADCRUMB_BASE}/` },
    { name: "Authors", url: `${BREADCRUMB_BASE}/authors` },
    { name: a.name, url: a.url },
  ]);
  return `<script type="application/ld+json">${JSON.stringify(person)}</script>\n${breadcrumb}`;
}

/**
 * Strip HTML tags from a string (for meta descriptions)
 */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Inject SSR content into HTML template
 */
export function injectSSRContent(
  template: string,
  metaTags: string,
  jsonLd: string,
  prerenderedContent: string
): string {
  let result = template;
  
  // Remove existing default meta tags that we're replacing
  // Remove default <title> tag
  result = result.replace(/<title>[^<]*<\/title>/, '');
  // Remove default meta description
  result = result.replace(/<meta\s+name="description"[^>]*>/, '');
  // Remove default meta title
  result = result.replace(/<meta\s+name="title"[^>]*>/, '');
  // Remove default canonical
  result = result.replace(/<link\s+rel="canonical"[^>]*>/, '');
  // Remove default og: tags
  result = result.replace(/<meta\s+property="og:[^"]*"[^>]*>/g, '');
  // Remove default twitter: tags
  result = result.replace(/<meta\s+property="twitter:[^"]*"[^>]*>/g, '');
  result = result.replace(/<meta\s+name="twitter:[^"]*"[^>]*>/g, '');
  // Remove default keywords
  result = result.replace(/<meta\s+name="keywords"[^>]*>/, '');
  // Remove OG/Twitter comment markers to avoid confusing social media crawlers
  result = result.replace(/<!--\s*Open Graph \/ Facebook\s*-->/g, '');
  result = result.replace(/<!--\s*Twitter\s*-->/g, '');
  result = result.replace(/<!--\s*Primary Meta Tags\s*-->/g, '');
  
  // Inject SSR meta tags before </head>
  result = result.replace(
    '</head>',
    `${metaTags}\n${jsonLd}\n</head>`
  );

  // Inject prerendered content after <div id="root">
  result = result.replace(
    '<div id="root"></div>',
    `<div id="root">${prerenderedContent}</div>`
  );

  return result;
}

/**
 * Get the canonical URL for an article by its slug
 * Used by vite.ts to redirect bare article slugs to their canonical URL
 */
/**
 * Minimal live-post lookup for /events/:slug/live/:postId SSR meta.
 * Approved + non-deleted only, mirroring the public API.
 */
export async function getLivePostForSSR(postId: number): Promise<{
  headline: string | null; body: string; imageUrl: string | null;
} | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      headline: eventLivePosts.headline,
      body: eventLivePosts.body,
      imageUrl: eventLivePosts.imageUrl,
    })
    .from(eventLivePosts)
    .where(and(
      eq(eventLivePosts.id, postId),
      eq(eventLivePosts.isDeleted, 0),
      eq((eventLivePosts as any).approvalStatus, 'approved'),
    ))
    .limit(1);
  return rows[0] ?? null;
}

export async function getArticleCanonicalUrl(articleSlug: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({ catSlug: categories.slug, slug: articles.slug })
    .from(articles)
    .leftJoin(categories, eq(categories.id, articles.primaryCategoryId))
    .where(and(eq(articles.slug, articleSlug), isNotNull(articles.publishedAt)))
    .limit(1)
    .then((rows: any[]) => rows[0]);
  
  if (!result) return null;
  
  const catSlug = result.catSlug || 'news';
  return `${BASE}/${catSlug}/${articleSlug}`;
}
