/**
 * Centralized SEO Service v2.1.0 - Feb 15, 2026
 * Handles meta generation, JSON-LD schemas, sitemaps, and RSS feeds
 * 
 * IMPORTANT: All timestamps from Drizzle come as STRINGS (mode: 'string')
 * We use toDateStr() helper to safely convert string|Date to ISO date strings
 * 
 * Sitemap format: sitemapindex with 12 sub-sitemaps (articles, news, jobs, people, etc.)
 */

import { publication, getBaseUrl } from "../../shared/publication";
import { eq, and, isNotNull, desc, sql, count, or } from "drizzle-orm";
import { getDb } from "../db";
import { seoMeta, articles, jobs, people, investors, events, resources, research, redirects, categories, companies, accelerators, tags, articleTags, workflowStatuses, users, media } from "../../drizzle/schema";
import { toDbDate } from "../_core/dbValues";
import { listLocales } from "./translation.service";
import { sitemapAlternates } from "./hreflang.service";

// ============================================================
// TYPES
// ============================================================

export interface SeoMetaInput {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robotsDirective?: string;
  structuredDataOverride?: Record<string, unknown>;
}

export interface SeoMetaOutput {
  title: string;
  description: string;
  og: {
    title: string;
    description: string;
    image: string;
    type: string;
    url: string;
  };
  canonical: string;
  robots: string;
  jsonLd: Record<string, unknown>;
}

export interface EntitySeoConfig {
  entityType: string;
  getDefaultTitle: (entity: Record<string, unknown>) => string;
  getDefaultDescription: (entity: Record<string, unknown>) => string;
  getDefaultImage: (entity: Record<string, unknown>) => string;
  getCanonicalPath: (entity: Record<string, unknown>) => string;
  getJsonLd: (entity: Record<string, unknown>, baseUrl: string) => Record<string, unknown>;
}

// ============================================================
// DATE HELPERS
// Drizzle with mode: 'string' returns timestamps as strings like "2026-02-14T16:44:43.000Z"
// These helpers safely handle both string and Date inputs
// ============================================================

/**
 * Convert a string or Date timestamp to YYYY-MM-DD format for sitemaps
 * Returns today's date if input is null/undefined
 */
function toDateStr(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString().split('T')[0];
  if (typeof d === 'string') {
    // Already a string - extract date portion
    if (d.includes('T')) return d.split('T')[0];
    if (d.includes(' ')) return d.split(' ')[0];
    return d.substring(0, 10);
  }
  // It's a Date object
  return d.toISOString().split('T')[0];
}

/**
 * Convert a string or Date timestamp to full ISO string
 */
function toISOStr(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  if (typeof d === 'string') {
    // If it's already an ISO string, return as-is
    if (d.includes('T')) return d;
    // Otherwise try to parse it
    return new Date(d).toISOString();
  }
  return d.toISOString();
}

/**
 * Convert a string or Date timestamp to RFC 2822 format for RSS feeds
 */
function toRFC2822(d: string | Date | null | undefined): string {
  if (!d) return new Date().toUTCString();
  if (typeof d === 'string') {
    return new Date(d).toUTCString();
  }
  return d.toUTCString();
}

/**
 * Parse a string or Date to a Date object for comparison
 */
function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  if (typeof d === 'string') return new Date(d);
  return d;
}

// ============================================================
// JSON-LD SCHEMA GENERATORS
// ============================================================

const jsonLdGenerators: Record<string, (entity: Record<string, unknown>, baseUrl: string) => Record<string, unknown>> = {
  article: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": entity.title,
    "description": entity.excerpt || entity.metaDescription,
    "image": entity.featuredImage || entity.ogImage,
    "datePublished": toISOStr(entity.publishedAt as string),
    "dateModified": toISOStr(entity.updatedAt as string),
    "author": {
      "@type": "Person",
      "name": entity.authorName || `${publication.name} Editorial`
    },
    "publisher": {
      "@type": "Organization",
      "name": publication.name,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}${publication.assets.icon512}`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      // Must match the runtime canonical route `/{categorySlug}/{slug}`
      // — a mismatched @id is a strong duplicate-canonical signal to Google.
      "@id": entity.primaryCategorySlug
        ? `${baseUrl}/${entity.primaryCategorySlug}/${entity.slug}`
        : `${baseUrl}/news/${entity.slug}`,
    }
  }),

  job: (entity, baseUrl) => {
    // Mirror the JobPosting payload that JobDetail.tsx renders so
    // the API SEO surface stays in sync. GSC was flagging missing
    // validThrough, baseSalary, and PostalAddress sub-fields — we
    // populate everything we have and fall back where reasonable
    // (90-day shelf life for validThrough, salaryPeriod-aware unitText
    // for baseSalary, structured PostalAddress when city/country/region
    // are on the row).
    const datePosted = toISOStr(entity.publishedAt as string);
    const validThroughDefault = datePosted
      ? new Date(new Date(datePosted).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    const periodMap: Record<string, string> = {
      hourly: "HOUR",
      monthly: "MONTH",
      yearly: "YEAR",
    };
    const unitText = periodMap[(entity.salaryPeriod as string) || "yearly"] || "YEAR";

    return {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "title": entity.title,
      "description": entity.description,
      "datePosted": datePosted,
      "validThrough": entity.expiresAt
        ? toISOStr(entity.expiresAt as string)
        : validThroughDefault,
      "employmentType": mapEmploymentType(entity.roleType as string),
      "hiringOrganization": {
        "@type": "Organization",
        "name": entity.companyName,
        "logo": entity.companyLogo,
        "sameAs": entity.companyWebsite,
      },
      "jobLocation": entity.isRemote ? {
        "@type": "VirtualLocation",
      } : (entity.cityName || entity.countryName || entity.location ? {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": entity.location || undefined,
          "addressLocality": entity.cityName || undefined,
          "addressRegion": entity.regionName || undefined,
          "addressCountry": entity.countryName || entity.countryIso2 || undefined,
        },
      } : undefined),
      "baseSalary": entity.salaryMin ? {
        "@type": "MonetaryAmount",
        "currency": entity.salaryCurrency || "USD",
        "value": {
          "@type": "QuantitativeValue",
          "minValue": entity.salaryMin,
          "maxValue": entity.salaryMax,
          "unitText": unitText,
        },
      } : undefined,
    };
  },

  person: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": "Person",
    "name": entity.name,
    "jobTitle": entity.title,
    "worksFor": entity.company ? {
      "@type": "Organization",
      "name": entity.company
    } : undefined,
    "description": entity.bio || entity.shortBio,
    "image": entity.avatar,
    "url": `${baseUrl}/people/${entity.slug}`,
    "sameAs": [
      entity.linkedIn,
      entity.twitter,
      entity.website
    ].filter(Boolean)
  }),

  investor: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": entity.name,
    "description": entity.description || entity.shortDescription,
    "logo": entity.logo,
    "url": entity.website || `${baseUrl}/investors/${entity.slug}`,
    "foundingDate": entity.foundedYear,
    "address": entity.headquarters,
    "sameAs": [
      entity.linkedIn,
      entity.twitter,
      entity.website
    ].filter(Boolean)
  }),

  event: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    "name": entity.title,
    "description": entity.description || entity.shortDescription,
    "image": entity.featuredImage,
    "startDate": toISOStr(entity.startDate as string),
    "endDate": entity.endDate ? toISOStr(entity.endDate as string) : undefined,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": mapAttendanceMode(entity.format as string),
    "location": entity.format === "virtual" ? {
      "@type": "VirtualLocation",
      "url": entity.virtualUrl
    } : (entity.venue || entity.address) ? {
      "@type": "Place",
      "name": entity.venue || undefined,
      "address": entity.address || undefined
    } : undefined,
    "organizer": entity.organizerName ? {
      "@type": "Organization",
      "name": entity.organizerName,
      ...(entity.organizerWebsite ? { "url": entity.organizerWebsite } : {})
    } : undefined,
    "offers": (entity.ticketPrice && !entity.isFree) ? {
      "@type": "Offer",
      "price": entity.ticketPrice,
      "priceCurrency": entity.ticketCurrency || "USD",
      "url": entity.registrationUrl
    } : undefined
  }),

  resource: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": entity.title,
    "description": entity.description || entity.shortDescription,
    "image": entity.featuredImage,
    "datePublished": toISOStr(entity.publishedAt as string),
    "provider": entity.provider ? {
      "@type": "Organization",
      "name": entity.provider,
      "logo": entity.providerLogo,
      "url": entity.providerWebsite
    } : undefined,
    "url": `${baseUrl}/resources/${entity.slug}`
  }),

  research: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": "Report",
    "name": entity.title,
    "description": entity.abstract,
    "image": entity.featuredImage,
    "datePublished": toISOStr(entity.publishedAt as string),
    "author": {
      "@type": "Organization",
      "name": `${publication.name} Research`
    },
    "url": `${baseUrl}/research/${entity.slug}`,
    "isAccessibleForFree": entity.isPremium ? false : true
  }),

  perk: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": "Offer",
    "name": entity.title,
    "description": entity.description || entity.shortDescription,
    "seller": entity.providerName ? {
      "@type": "Organization",
      "name": entity.providerName,
      "logo": entity.providerLogo
    } : undefined,
    "price": entity.valueDisplay || "Free",
    "priceCurrency": "USD",
    "url": `${baseUrl}/resources/perks/${entity.slug}`,
    "validFrom": toISOStr(entity.publishedAt as string),
    "validThrough": entity.expiresAt ? toISOStr(entity.expiresAt as string) : undefined
  }),

  template: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    "name": entity.title,
    "description": entity.description || entity.shortDescription,
    "fileFormat": entity.fileFormat,
    "url": `${baseUrl}/resources/templates/${entity.slug}`,
    "datePublished": toISOStr(entity.publishedAt as string),
    "provider": {
      "@type": "Organization",
      "name": publication.name
    }
  }),

  playbook: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": ["Article", "HowTo"],
    "name": entity.title,
    "headline": entity.title,
    "description": entity.description || entity.shortDescription,
    "image": entity.featuredImage,
    "datePublished": toISOStr(entity.publishedAt as string),
    "author": entity.authorName ? {
      "@type": "Person",
      "name": entity.authorName
    } : {
      "@type": "Organization",
      "name": publication.name
    },
    "url": `${baseUrl}/resources/playbooks/${entity.slug}`,
    "estimatedCost": entity.isPremium ? "Paid" : "Free"
  }),

  calculator: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": entity.title,
    "description": entity.description,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "url": `${baseUrl}/resources/calculators/${entity.slug}`,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  }),

  regulation: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": ["Article", "FAQPage"],
    "name": entity.title,
    "headline": entity.title,
    "description": entity.description || entity.shortDescription,
    "datePublished": toISOStr(entity.publishedAt as string),
    "dateModified": toISOStr(entity.updatedAt as string),
    "author": {
      "@type": "Organization",
      "name": publication.name
    },
    "url": `${baseUrl}/resources/regulations/${entity.country}/${entity.slug}`,
    "about": {
      "@type": "Country",
      "name": entity.country
    }
  }),

  company: (entity, baseUrl) => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": entity.name,
    "description": entity.description || entity.shortDescription,
    "logo": entity.logo,
    "url": entity.website || `${baseUrl}/companies/${entity.slug}`,
    "foundingDate": entity.foundedYear,
    "address": entity.headquarters,
    "sameAs": [
      entity.linkedIn,
      entity.twitter,
      entity.website
    ].filter(Boolean)
  })
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function mapEmploymentType(roleType: string): string {
  const mapping: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
    freelance: "TEMPORARY"
  };
  return mapping[roleType] || "FULL_TIME";
}

function mapAttendanceMode(format: string): string {
  const mapping: Record<string, string> = {
    in_person: "https://schema.org/OfflineEventAttendanceMode",
    virtual: "https://schema.org/OnlineEventAttendanceMode",
    hybrid: "https://schema.org/MixedEventAttendanceMode"
  };
  return mapping[format] || "https://schema.org/OfflineEventAttendanceMode";
}

// ============================================================
// SEO SERVICE CLASS
// ============================================================

export class SeoService {
  private baseUrl: string;

  constructor(baseUrl: string = getBaseUrl()) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get or generate SEO meta for an entity
   */
  async getSeoMeta(entityType: string, entityId: number, entity: Record<string, unknown>): Promise<SeoMetaOutput> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Try to get custom SEO meta
    const customMeta = await db.select()
      .from(seoMeta)
      .where(and(
        eq(seoMeta.entityType, entityType),
        eq(seoMeta.entityId, entityId)
      ))
      .limit(1);

    const meta = customMeta[0];
    const generator = jsonLdGenerators[entityType];

    // For articles, enrich the entity with the primary category slug so
    // the canonical URL and JSON-LD mainEntityOfPage match the runtime
    // route `/{categorySlug}/{articleSlug}`. Without this we'd emit
    // `/news/{slug}` as a fallback, which Google then sees as a
    // conflicting canonical against the actually-rendered page.
    if (entityType === "article" && entity.primaryCategoryId && !entity.primaryCategorySlug) {
      const cat = await db.select({ slug: categories.slug })
        .from(categories)
        .where(eq(categories.id, entity.primaryCategoryId as number))
        .limit(1);
      if (cat[0]?.slug) entity.primaryCategorySlug = cat[0].slug;
    }

    // Generate defaults based on entity type
    const defaults = this.getDefaults(entityType, entity);

    return {
      title: meta?.metaTitle || defaults.title,
      description: meta?.metaDescription || defaults.description,
      og: {
        title: meta?.ogTitle || meta?.metaTitle || defaults.title,
        description: meta?.ogDescription || meta?.metaDescription || defaults.description,
        image: meta?.ogImage || defaults.image,
        type: this.getOgType(entityType),
        url: meta?.canonicalUrl || `${this.baseUrl}${defaults.canonicalPath}`
      },
      canonical: meta?.canonicalUrl || `${this.baseUrl}${defaults.canonicalPath}`,
      robots: meta?.robotsDirective || "index,follow",
      jsonLd: meta?.structuredDataOverride as Record<string, unknown> || 
              (generator ? generator(entity, this.baseUrl) : {})
    };
  }

  /**
   * Save or update SEO meta for an entity
   */
  async saveSeoMeta(entityType: string, entityId: number, input: SeoMetaInput): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const existing = await db.select()
      .from(seoMeta)
      .where(and(
        eq(seoMeta.entityType, entityType),
        eq(seoMeta.entityId, entityId)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.update(seoMeta)
        .set({
          ...input,
          updatedAt: toDbDate(new Date())
        } as any)
        .where(eq(seoMeta.id, existing[0].id));
    } else {
      await db.insert(seoMeta).values({
        entityType,
        entityId,
        ...input
      } as any);
    }
  }

  /**
   * Generate Google News sitemap (last 48 hours only)
   * Per Google News requirements, only include articles from last 48 hours
   */
  async generateGoogleNewsSitemap(): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get articles from last 48 hours
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 48);

    const recentArticles = await db.select({
      slug: articles.slug,
      title: articles.title,
      publishedAt: articles.publishedAt,
        eventDate: articles.eventDate,
      primaryCategoryId: articles.primaryCategoryId
    }).from(articles)
      .where(isNotNull(articles.publishedAt))
      .orderBy(desc(articles.publishedAt));

    // Filter in JS for last 48 hours - handle string dates properly
    const filteredArticles = recentArticles.filter(a => {
      if (!a.publishedAt) return false;
      const pubDate = toDate(a.publishedAt as unknown as string);
      return pubDate && pubDate >= cutoffDate;
    });

    // Get all categories for mapping
    const allCategories = await db.select({
      id: categories.id,
      slug: categories.slug
    }).from(categories);
    
    const categoryMap = new Map(allCategories.map(c => [c.id, c.slug]));

    const newsItems = filteredArticles.map(a => {
      const categorySlug = a.primaryCategoryId ? categoryMap.get(a.primaryCategoryId) || 'news' : 'news';
      return {
        loc: `${this.baseUrl}/${categorySlug}/${a.slug}`,
        title: a.title,
        publicationDate: toISOStr(a.publishedAt as unknown as string)
      };
    });

    return this.buildGoogleNewsSitemapXml(newsItems);
  }

  /**
   * Build Google News sitemap XML format
   */
  private buildGoogleNewsSitemapXml(items: Array<{ loc: string; title: string; publicationDate: string }>): string {
    const urlEntries = items.map(item => `
  <url>
    <loc>${this.escapeXml(item.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${publication.name}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${item.publicationDate}</news:publication_date>
      <news:title><![CDATA[${item.title}]]></news:title>
    </news:news>
  </url>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urlEntries}
</urlset>`;
  }

  /**
   * Dedicated images sitemap (P6).
   * Lists every featured image of every published article. Companion to
   * sitemap-articles.xml which uses image extensions inline. Some teams
   * prefer one or the other; we ship both for maximum image-search coverage.
   */
  async generateImagesSitemap(): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Explicitly require featuredImageId IS NOT NULL: prevents Drizzle from
    // generating a JOIN that would produce NULL media rows for articles with
    // no featured image (which would crash escapeXml on r.mediaUrl).
    const rows = await db
      .select({
        slug: articles.slug,
        title: articles.title,
        primaryCategoryId: articles.primaryCategoryId,
        mediaUrl: media.url,
        mediaAlt: media.alt,
      })
      .from(articles)
      .innerJoin(media, eq(media.id, articles.featuredImageId))
      .where(and(
        isNotNull(articles.publishedAt),
        isNotNull(articles.primaryCategoryId),
        isNotNull(articles.featuredImageId),
      ))
      .orderBy(desc(articles.publishedAt));

    const cats = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
    const catMap = new Map(cats.map(c => [c.id, c.slug]));

    const entries = rows
      .filter((r: any) => r.mediaUrl && r.slug) // belt-and-suspenders against any partial rows
      .map((r: any) => {
        const catSlug = r.primaryCategoryId ? catMap.get(r.primaryCategoryId) || "news" : "news";
        const pageUrl = `${this.baseUrl}/${catSlug}/${r.slug}`;
        const titleXml = (r.title || "").replace(/]]>/g, "]]]]><![CDATA[>");
        const altXml = (r.mediaAlt || "").replace(/]]>/g, "]]]]><![CDATA[>");
        return `
  <url>
    <loc>${this.escapeXml(pageUrl)}</loc>
    <image:image>
      <image:loc>${this.escapeXml(r.mediaUrl)}</image:loc>
      <image:title><![CDATA[${titleXml}]]></image:title>${altXml ? `
      <image:caption><![CDATA[${altXml}]]></image:caption>` : ""}
    </image:image>
  </url>`;
      }).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries}
</urlset>`;
  }

  /**
   * Generate sitemap for a specific module
   * All timestamps are handled as strings (Drizzle mode: 'string')
   */
  async generateSitemap(module: string): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let urls: Array<{
      loc: string;
      lastmod: string;
      priority: string;
      images?: Array<{ loc: string; title?: string | null; caption?: string | null }>;
    }> = [];

    switch (module) {
      case "articles":
      case "news":
        // Use statusId matching published workflow status (same as public articles page)
        const [publishedArticleStatus] = await db.select({ id: workflowStatuses.id })
          .from(workflowStatuses)
          .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial')));

        // Single LEFT JOIN: pulls featured image URL + alt for image-extension entries.
        const articleList = await db
          .select({
            slug: articles.slug,
            canonicalUrl: articles.canonicalUrl,
            title: articles.title,
            excerpt: articles.excerpt,
            updatedAt: articles.updatedAt,
            primaryCategoryId: articles.primaryCategoryId,
            mediaUrl: media.url,
            mediaAlt: media.alt,
          })
          .from(articles)
          .leftJoin(media, eq(media.id, articles.featuredImageId))
          .where(and(isNotNull(articles.publishedAt), isNotNull(articles.primaryCategoryId)))
          .orderBy(desc(articles.publishedAt));

        const allCategories = await db.select({
          id: categories.id,
          slug: categories.slug,
        }).from(categories);
        const categoryMap = new Map(allCategories.map(c => [c.id, c.slug]));

        // Resolve operator-managed slug changes before emitting URLs. These
        // redirects run ahead of SSR, so their source paths must not remain in
        // the sitemap even when the article row itself has no canonicalUrl.
        let redirectMap = new Map<string, string>();
        try {
          const activeRedirects = await db.select({
            fromPath: redirects.fromPath,
            toPath: redirects.toPath,
          }).from(redirects).where(eq(redirects.isActive, 1));
          redirectMap = new Map(activeRedirects.map(r => [r.fromPath, r.toPath]));
        } catch {
          // A missing legacy redirects table must not take down all sitemaps.
        }
        const resolveRedirect = (path: string): string => {
          const visited = new Set<string>();
          let current = path;
          while (redirectMap.has(current) && !visited.has(current) && visited.size < 10) {
            visited.add(current);
            current = redirectMap.get(current)!;
          }
          return current;
        };

        urls = articleList.flatMap((a: any) => {
          const categorySlug = a.primaryCategoryId ? categoryMap.get(a.primaryCategoryId) || 'news' : 'news';
          const generatedPath = `/${categorySlug}/${a.slug}`;
          let canonical = `${this.baseUrl}${resolveRedirect(generatedPath)}`;
          if (a.canonicalUrl) {
            try {
              const candidate = new URL(a.canonicalUrl, this.baseUrl);
              if (candidate.origin !== new URL(this.baseUrl).origin) return [];
              canonical = `${candidate.origin}${candidate.pathname}`.replace(/\/$/, "");
            } catch {
              return [];
            }
          }
          const images = a.mediaUrl
            ? [{
                loc: a.mediaUrl as string,
                title: a.title,
                caption: a.mediaAlt || a.excerpt || null,
              }]
            : undefined;
          return [{
            loc: canonical,
            lastmod: toDateStr(a.updatedAt),
            priority: "0.8",
            images,
          }];
        });
        urls = Array.from(new Map(urls.map(entry => [entry.loc, entry])).values());
        break;

      case "jobs":
        // Use statusId matching published workflow status (same as public jobs page)
        // Many jobs have publishedAt=NULL but correct statusId
        const [publishedJobStatus] = await db.select({ id: workflowStatuses.id })
          .from(workflowStatuses)
          .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial')));
        const jobList = await db.select({
          slug: jobs.slug,
          updatedAt: jobs.updatedAt
        }).from(jobs)
          .where(
            publishedJobStatus
              ? or(eq(jobs.statusId, publishedJobStatus.id), isNotNull(jobs.publishedAt))
              : isNotNull(jobs.publishedAt)
          )
          .orderBy(desc(jobs.updatedAt));
        
        urls = jobList.map(j => ({
          loc: `${this.baseUrl}/jobs/${j.slug}`,
          lastmod: toDateStr(j.updatedAt),
          priority: "0.7"
        }));
        break;

      case "people":
        // Use statusId matching published workflow status (same as public people page)
        const [publishedPeopleStatus] = await db.select({ id: workflowStatuses.id })
          .from(workflowStatuses)
          .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial')));
        const peopleList = await db.select({
          slug: people.slug,
          updatedAt: people.updatedAt
        }).from(people)
          .where(
            publishedPeopleStatus
              ? or(eq(people.statusId, publishedPeopleStatus.id), isNotNull(people.publishedAt))
              : isNotNull(people.publishedAt)
          )
          .orderBy(desc(people.updatedAt));
        
        urls = peopleList.map(p => ({
          loc: `${this.baseUrl}/people/${p.slug}`,
          lastmod: toDateStr(p.updatedAt),
          priority: "0.6"
        }));
        break;

      case "investors":
        // Use statusId matching published workflow status (same as public investors page)
        const [publishedInvestorStatus] = await db.select({ id: workflowStatuses.id })
          .from(workflowStatuses)
          .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial')));
        const investorList = await db.select({
          slug: investors.slug,
          updatedAt: investors.updatedAt
        }).from(investors)
          .where(
            publishedInvestorStatus
              ? or(eq(investors.statusId, publishedInvestorStatus.id), isNotNull(investors.publishedAt))
              : isNotNull(investors.publishedAt)
          )
          .orderBy(desc(investors.updatedAt));
        
        urls = investorList.map(i => ({
          loc: `${this.baseUrl}/investors/${i.slug}`,
          lastmod: toDateStr(i.updatedAt),
          priority: "0.6"
        }));
        break;

      case "events":
        // Use statusId matching published workflow status (same as public events page)
        // Many events have publishedAt=NULL but correct statusId from before auto-set was added
        const [publishedEventStatus] = await db.select({ id: workflowStatuses.id })
          .from(workflowStatuses)
          .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial')));
        const eventList = await db.select({
          slug: events.slug,
          updatedAt: events.updatedAt
        }).from(events)
          .where(
            publishedEventStatus
              ? or(eq(events.statusId, publishedEventStatus.id), isNotNull(events.publishedAt))
              : isNotNull(events.publishedAt)
          )
          .orderBy(desc(events.startDate));
        
        urls = eventList.map(e => ({
          loc: `${this.baseUrl}/events/${e.slug}`,
          lastmod: toDateStr(e.updatedAt),
          priority: "0.7"
        }));
        break;

      case "resources":
        const resourceList = await db.select({
          slug: resources.slug,
          updatedAt: resources.updatedAt
        }).from(resources)
          .where(isNotNull(resources.publishedAt))
          .orderBy(desc(resources.publishedAt));
        
        urls = resourceList.map(r => ({
          loc: `${this.baseUrl}/resources/${r.slug}`,
          lastmod: toDateStr(r.updatedAt),
          priority: "0.6"
        }));
        break;

      case "research":
        const researchList = await db.select({
          slug: research.slug,
          updatedAt: research.updatedAt
        }).from(research)
          .where(isNotNull(research.publishedAt))
          .orderBy(desc(research.publishedAt));
        
        urls = researchList.map(r => ({
          loc: `${this.baseUrl}/research/${r.slug}`,
          lastmod: toDateStr(r.updatedAt),
          priority: "0.7"
        }));
        break;

      case "categories":
        // Import articleCategories for counting
        const { articleCategories } = await import("../../drizzle/schema");
        
        // Get categories with article counts to filter out empty ones
        const categoriesWithCounts = await db.select({
          id: categories.id,
          slug: categories.slug,
          parentId: categories.parentId,
          updatedAt: categories.updatedAt,
          articleCount: count(articleCategories.articleId)
        })
          .from(categories)
          .leftJoin(articleCategories, eq(categories.id, articleCategories.categoryId))
          .groupBy(categories.id)
          .orderBy(categories.sortOrder);
        
        // Filter to only include categories with at least 1 article
        const nonEmptyCategories = categoriesWithCounts.filter(c => c.articleCount > 0);
        
        // Separate parent and child categories
        const parentCats = nonEmptyCategories.filter(c => c.parentId === null);
        const childCats = nonEmptyCategories.filter(c => c.parentId !== null);
        
        // Build parent category URLs
        const parentUrls = parentCats.map(c => ({
          loc: `${this.baseUrl}/${c.slug}`,
          lastmod: toDateStr(c.updatedAt),
          priority: "0.7"
        }));
        
        // Build child category URLs with parent/child format
        const childUrls = childCats.map(c => {
          const parent = categoriesWithCounts.find(p => p.id === c.parentId);
          const parentSlug = parent?.slug || 'category';
          return {
            loc: `${this.baseUrl}/${parentSlug}/${c.slug}`,
            lastmod: toDateStr(c.updatedAt),
            priority: "0.6"
          };
        });
        
        urls = [...parentUrls, ...childUrls];
        break;

      case "companies":
        // Use statusId matching published workflow status (same as public companies page)
        const [publishedCompanyStatus] = await db.select({ id: workflowStatuses.id })
          .from(workflowStatuses)
          .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial')));
        const companyList = await db.select({
          slug: companies.slug,
          updatedAt: companies.updatedAt
        }).from(companies)
          .where(
            publishedCompanyStatus
              ? or(eq(companies.statusId, publishedCompanyStatus.id), isNotNull(companies.publishedAt))
              : isNotNull(companies.publishedAt)
          )
          .orderBy(desc(companies.updatedAt));
        
        urls = companyList.map(c => ({
          loc: `${this.baseUrl}/companies/${c.slug}`,
          lastmod: toDateStr(c.updatedAt),
          priority: "0.6"
        }));
        break;

      case "accelerators":
        const acceleratorList = await db.select({
          slug: accelerators.slug,
          updatedAt: accelerators.updatedAt
        }).from(accelerators)
          .where(sql`1=1`)
          .orderBy(desc(accelerators.createdAt));

        urls = acceleratorList.map(a => ({
          loc: `${this.baseUrl}/accelerators/${a.slug}`,
          lastmod: toDateStr(a.updatedAt),
          priority: "0.6"
        }));
        break;

      case "authors":
        // Authors sitemap — only users who have written at least one published
        // article. Filters out plain-role users so we don't expose accounts.
        const indexableRoles = ['author', 'editor', 'senior_editor', 'admin'];
        const authorRows = await db
          .select({
            id: users.id,
            username: users.username,
            updatedAt: users.updatedAt,
            articleCount: count(articles.id),
          })
          .from(users)
          .innerJoin(articles, and(
            eq(articles.authorId, users.id),
            isNotNull(articles.publishedAt),
          ))
          .groupBy(users.id);

        urls = authorRows
          .filter((a: any) => a.articleCount > 0)
          .map((a: any) => ({
            loc: `${this.baseUrl}/author/${a.username || a.id}`,
            lastmod: toDateStr(a.updatedAt),
            priority: "0.5",
          }));
        break;

      case "tags":
        // Tags sitemap - active tags with at least 1 PUBLISHED article
        // Must join through articles table and check statusId (same pattern as other sitemaps)
        const [publishedTagArticleStatus] = await db.select({ id: workflowStatuses.id })
          .from(workflowStatuses)
          .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial')));
        const tagsList = await db.select({
          slug: tags.slug,
          updatedAt: tags.updatedAt,
          articleCount: count(articleTags.articleId)
        })
          .from(tags)
          .leftJoin(articleTags, eq(tags.id, articleTags.tagId))
          .leftJoin(articles, eq(articleTags.articleId, articles.id))
          .where(
            and(
              eq(tags.isActive, 1),
              // Only count articles that are actually published
              publishedTagArticleStatus
                ? or(eq(articles.statusId, publishedTagArticleStatus.id), isNotNull(articles.publishedAt))
                : isNotNull(articles.publishedAt)
            )
          )
          .groupBy(tags.id)
          .orderBy(desc(tags.updatedAt));
        
        // Only include tags with at least 1 published article
        urls = tagsList
          .filter(t => t.articleCount > 0)
          .map(t => ({
            loc: `${this.baseUrl}/tag/${t.slug}`,
            lastmod: toDateStr(t.updatedAt),
            priority: "0.5"
          }));
        break;

      case "pages":
        // Static pages sitemap - ONLY public pages, NO authenticated/admin pages
        const staticPages = [
          { path: "/", priority: "1.0" },
          { path: "/news", priority: "0.9" },
          { path: "/jobs", priority: "0.8" },
          { path: "/companies", priority: "0.8" },
          { path: "/people", priority: "0.7" },
          { path: "/events", priority: "0.7" },
          { path: "/about", priority: "0.5" },
          { path: "/contact", priority: "0.5" },
          { path: "/advertise", priority: "0.4" },
          { path: "/newsletter", priority: "0.4" },
          { path: "/terms", priority: "0.3" },
          { path: "/privacy", priority: "0.3" },
          // NOTE: /login, /signup, /profile, /account, /admin/*, /dashboard/* are intentionally excluded
        ];
        const todayStr = new Date().toISOString().split('T')[0];
        urls = staticPages.map(p => ({
          loc: `${this.baseUrl}${p.path}`,
          lastmod: todayStr,
          priority: p.priority
        }));
        break;
    }

    // Every URL exists in every configured language — the read layer overlays
    // the translation and falls back to English per field — so each entry
    // carries the full reciprocal alternate set.
    //
    // hreflang is an enhancement; the URL list is the sitemap's actual job.
    // If the locale read fails, serve the sitemap without alternates rather
    // than 500 on it and leave the archive undiscoverable in every language.
    let activeLocales: Array<{ code: string; isDefault: boolean }> = [];
    try {
      activeLocales = await listLocales({ activeOnly: true });
    } catch (e) {
      console.error(`[Sitemap] locales unavailable, omitting hreflang: ${(e as Error).message}`);
    }
    return this.buildSitemapXml(urls, activeLocales);
  }

  /**
   * Generate sitemap index (master sitemap)
   * Lists all module sitemaps for Google to crawl
   * Uses actual last modified dates from each module for better SEO
   * 
   * IMPORTANT: Only lists sitemaps that have corresponding route handlers
   * Removed: playbooks, regulations (no separate routes - they're part of resources)
   */
  async generateSitemapIndex(): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // A failing module (missing table, bad column, partial migration)
    // must degrade to "no content for that module", never 500 the whole
    // index — one broken table used to take down /sitemap.xml entirely.
    const safe = async <T>(label: string, fn: () => Promise<T[]>): Promise<T | undefined> => {
      try {
        return (await fn())[0];
      } catch (err) {
        console.warn(`[SitemapIndex] ${label} lookup failed, module skipped: ${(err as Error).message}`);
        return undefined;
      }
    };

    // Get actual last modified dates from each module
    const latestArticle = await safe("articles", () => db.select({ updatedAt: articles.updatedAt })
      .from(articles).where(isNotNull(articles.publishedAt)).orderBy(desc(articles.updatedAt)).limit(1));
    // For jobs/people/investors/companies: use statusId OR publishedAt (same logic as sitemap generation)
    const pubStatus = await safe("workflow_statuses", () => db.select({ id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial'))));
    const pubFilter = (table: any) => pubStatus
      ? or(eq(table.statusId, pubStatus.id), isNotNull(table.publishedAt))
      : isNotNull(table.publishedAt);
    const latestJob = await safe("jobs", () => db.select({ updatedAt: jobs.updatedAt })
      .from(jobs).where(pubFilter(jobs)).orderBy(desc(jobs.updatedAt)).limit(1));
    const latestPerson = await safe("people", () => db.select({ updatedAt: people.updatedAt })
      .from(people).where(pubFilter(people)).orderBy(desc(people.updatedAt)).limit(1));
    const latestCompany = await safe("companies", () => db.select({ updatedAt: companies.updatedAt })
      .from(companies).where(pubFilter(companies)).orderBy(desc(companies.updatedAt)).limit(1));
    // For events: use statusId OR publishedAt to match the sitemap generation logic
    const latestEvent = await safe("events", () => db.select({ updatedAt: events.updatedAt })
      .from(events)
      .where(
        pubStatus
          ? or(eq(events.statusId, pubStatus.id), isNotNull(events.publishedAt))
          : isNotNull(events.publishedAt)
      )
      .orderBy(desc(events.updatedAt)).limit(1));
    const latestCategory = await safe("categories", () => db.select({ updatedAt: categories.updatedAt })
      .from(categories).orderBy(desc(categories.updatedAt)).limit(1));

    const today = new Date().toISOString().split('T')[0];

    // All module sitemaps - ONLY those with actual route handlers in sitemaps.ts
    // hasContent flag tracks whether the DB query returned any published items
    const modules = [
      { name: "articles", lastmod: toDateStr(latestArticle?.updatedAt), hasContent: !!latestArticle },
      { name: "news", lastmod: toDateStr(latestArticle?.updatedAt), hasContent: !!latestArticle }, // Google News sitemap
      { name: "jobs", lastmod: toDateStr(latestJob?.updatedAt), hasContent: !!latestJob },
      { name: "people", lastmod: toDateStr(latestPerson?.updatedAt), hasContent: !!latestPerson },
      { name: "companies", lastmod: toDateStr(latestCompany?.updatedAt), hasContent: !!latestCompany },
      { name: "events", lastmod: toDateStr(latestEvent?.updatedAt), hasContent: !!latestEvent },
      { name: "categories", lastmod: toDateStr(latestCategory?.updatedAt), hasContent: !!latestCategory },
      { name: "tags", lastmod: today, hasContent: true }, // Tags with articles
      { name: "authors", lastmod: today, hasContent: !!latestArticle }, // Authors with at least one published article
      { name: "images", lastmod: today, hasContent: !!latestArticle }, // Image sitemap (P6)
      { name: "pages", lastmod: today, hasContent: true }, // Static pages always have content
    ];

    // Filter out modules with no published content
    const activeModules = modules.filter(m => m.hasContent);

    const sitemaps = activeModules.map(m => `
  <sitemap>
    <loc>${this.baseUrl}/sitemap-${m.name}.xml</loc>
    <lastmod>${m.lastmod}</lastmod>
  </sitemap>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemaps}
</sitemapindex>`;
  }

  /**
   * Generate RSS feed for news
   * Uses category-based URLs for articles (not /news/ prefix)
   */
  async generateNewsFeed(): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const articleList = await db.select({
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      publishedAt: articles.publishedAt,
        eventDate: articles.eventDate,
      primaryCategoryId: articles.primaryCategoryId,
    })
      .from(articles)
      .where(isNotNull(articles.publishedAt))
      .orderBy(desc(articles.publishedAt))
      .limit(50);

    // Get categories for URL generation
    const allCategories = await db.select({
      id: categories.id,
      slug: categories.slug
    }).from(categories);
    const categoryMap = new Map(allCategories.map(c => [c.id, c.slug]));

    const items = articleList.map(a => {
      const categorySlug = a.primaryCategoryId ? categoryMap.get(a.primaryCategoryId) || 'news' : 'news';
      const articleUrl = `${this.baseUrl}/${categorySlug}/${a.slug}`;
      return `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${articleUrl}</link>
      <description><![CDATA[${a.excerpt || ''}]]></description>
      <pubDate>${toRFC2822(a.publishedAt)}</pubDate>
      <guid isPermaLink="true">${articleUrl}</guid>
    </item>`;
    }).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${publication.name} News</title>
    <link>${this.baseUrl}</link>
    <description>${publication.description}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${this.baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>${items}
  </channel>
</rss>`;
  }

  /**
   * Generate RSS feed for jobs
   */
  async generateJobsFeed(): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const jobList = await db.select({
      title: jobs.title,
      slug: jobs.slug,
      description: jobs.description,
      publishedAt: jobs.publishedAt,
      companyName: jobs.companyName,
    })
      .from(jobs)
      .where(isNotNull(jobs.publishedAt))
      .orderBy(desc(jobs.publishedAt))
      .limit(50);

    const items = jobList.map(j => `
    <item>
      <title><![CDATA[${j.title} at ${j.companyName}]]></title>
      <link>${this.baseUrl}/jobs/${j.slug}</link>
      <description><![CDATA[${j.description || ''}]]></description>
      <pubDate>${toRFC2822(j.publishedAt)}</pubDate>
      <guid isPermaLink="true">${this.baseUrl}/jobs/${j.slug}</guid>
    </item>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${publication.name} Jobs</title>
    <link>${this.baseUrl}/jobs</link>
    <description>Latest industry job opportunities from ${publication.name}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${this.baseUrl}/jobs/rss.xml" rel="self" type="application/rss+xml"/>${items}
  </channel>
</rss>`;
  }

  /**
   * Generate robots.txt
   * Properly blocks admin, API, dashboard, and auth pages
   * Allows all public content pages
   */
  generateRobotsTxt(): string {
    const b = this.baseUrl;
    return `User-agent: *
Allow: /

# Primary sitemap index
Sitemap: ${b}/sitemap.xml

# Sub-sitemaps (apex URLs)
Sitemap: ${b}/sitemap-articles.xml
Sitemap: ${b}/sitemap-news.xml
Sitemap: ${b}/sitemap-jobs.xml
Sitemap: ${b}/sitemap-people.xml
Sitemap: ${b}/sitemap-companies.xml
Sitemap: ${b}/sitemap-events.xml
Sitemap: ${b}/sitemap-categories.xml
Sitemap: ${b}/sitemap-tags.xml
Sitemap: ${b}/sitemap-authors.xml
Sitemap: ${b}/sitemap-images.xml
Sitemap: ${b}/sitemap-pages.xml

# /api/ mirrors — never intercepted by platform edge; safe fallback for GSC.
Sitemap: ${b}/api/sitemap.xml
Sitemap: ${b}/api/sitemap-articles.xml
Sitemap: ${b}/api/sitemap-companies.xml
Sitemap: ${b}/api/sitemap-jobs.xml

# Block admin, auth, and personalised paths
Disallow: /admin/
Disallow: /api/trpc/
Disallow: /api/oauth/
Disallow: /dashboard/
Disallow: /go/
Disallow: /login
Disallow: /signin
Disallow: /signup
Disallow: /claim/
Disallow: /profile
Disallow: /account
Disallow: /settings
Disallow: /search

# Retired public sections (no longer part of the publication)
Disallow: /investors
Disallow: /accelerators
Disallow: /funding
Disallow: /resources
Disallow: /submit-startup

# Block faceted/filter/UTM URLs (duplicate-content prevention)
Disallow: /*?sort=
Disallow: /*?filter=
Disallow: /*?category=
Disallow: /*?q=
Disallow: /*?tag=
Disallow: /*?topic=
Disallow: /*?page=
Disallow: /*?utm_*
Disallow: /*?ref=

# Legacy WordPress patterns (also 410/301 at Express layer)
Disallow: /wp-admin/
Disallow: /wp-content/
Disallow: /wp-includes/
Disallow: /xmlrpc.php
Disallow: /tag/*/feed
Disallow: /tags/*/feed

Disallow: /_next/
Disallow: /src/
Disallow: /@

Allow: /ads.txt
Allow: /robots.txt
Allow: /sitemap*.xml
Allow: /rss.xml
Allow: /feed.xml

Crawl-delay: 1

User-agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /api/trpc/
Disallow: /api/oauth/
Disallow: /dashboard/
Disallow: /go/
Disallow: /login
Disallow: /signin
Disallow: /signup
Disallow: /claim/
Disallow: /profile
Disallow: /account
Disallow: /settings
Disallow: /search
Crawl-delay: 0

User-agent: Googlebot-News
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /login
Disallow: /signin
Disallow: /signup
Disallow: /profile
Disallow: /search
Crawl-delay: 0

User-agent: Googlebot-Image
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /login
Disallow: /signin
Disallow: /signup
Disallow: /profile
Crawl-delay: 0
`;
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private getDefaults(entityType: string, entity: Record<string, unknown>): {
    title: string;
    description: string;
    image: string;
    canonicalPath: string;
  } {
    const defaults: Record<string, () => { title: string; description: string; image: string; canonicalPath: string }> = {
      article: () => ({
        title: `${entity.title} | ${publication.name}`,
        description: (entity.excerpt as string)?.substring(0, 160) || "",
        image: entity.featuredImage as string || "",
        // Match the runtime route emitted by Article.tsx and prerender.ts:
        // `/{primaryCategorySlug}/{slug}`. Falling back to /news/{slug}
        // historically caused 619 GSC "duplicate, Google chose different
        // canonical" errors because the rendered HTML disagreed with this
        // server-computed canonical.
        canonicalPath: entity.primaryCategorySlug
          ? `/${entity.primaryCategorySlug}/${entity.slug}`
          : `/news/${entity.slug}`,
      }),
      job: () => ({
        title: `${entity.title} at ${entity.companyName} | ${publication.name} Jobs`,
        description: `${entity.title} - ${entity.roleType} position at ${entity.companyName}. ${entity.location || 'Remote'}`,
        image: entity.companyLogo as string || "",
        canonicalPath: `/jobs/${entity.slug}`
      }),
      person: () => ({
        title: `${entity.name}${entity.title ? ` - ${entity.title}` : ""} | ${publication.name} People`,
        description: (entity.shortBio as string)?.substring(0, 160) || `${entity.name} profile on ${publication.name}`,
        image: entity.avatar as string || "",
        canonicalPath: `/people/${entity.slug}`
      }),
      investor: () => ({
        title: `${entity.name} | ${publication.name} Investors`,
        description: (entity.shortDescription as string)?.substring(0, 160) || `${entity.name} investor profile on ${publication.name}`,
        image: entity.logo as string || "",
        canonicalPath: `/investors/${entity.slug}`
      }),
      event: () => ({
        title: `${entity.title} | ${publication.name} Events`,
        description: (entity.shortDescription as string)?.substring(0, 160) || `${entity.title} - ${entity.type} event`,
        image: entity.featuredImage as string || "",
        canonicalPath: `/events/${entity.slug}`
      }),
      resource: () => ({
        title: `${entity.title} | ${publication.name} Resources`,
        description: (entity.shortDescription as string)?.substring(0, 160) || `${entity.title} - ${entity.type}`,
        image: entity.featuredImage as string || "",
        canonicalPath: `/resources/${entity.slug}`
      }),
      research: () => ({
        title: `${entity.title} | ${publication.name} Research`,
        description: (entity.abstract as string)?.substring(0, 160) || `${entity.title} - Research report`,
        image: entity.featuredImage as string || "",
        canonicalPath: `/research/${entity.slug}`
      })
    };

    return defaults[entityType]?.() || {
      title: publication.name,
      description: "Tech news, jobs, and insights",
      image: "",
      canonicalPath: "/"
    };
  }

  private getOgType(entityType: string): string {
    const types: Record<string, string> = {
      article: "article",
      job: "website",
      person: "profile",
      investor: "business.business",
      event: "website",
      resource: "website",
      research: "article"
    };
    return types[entityType] || "website";
  }

  /**
   * Escape special XML characters in URLs
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private buildSitemapXml(urls: Array<{
    loc: string;
    lastmod: string;
    priority: string;
    images?: Array<{ loc: string; title?: string | null; caption?: string | null }>;
  }>, locales: Array<{ code: string; isDefault: boolean }> = []): string {
    const hasImages = urls.some(u => u.images && u.images.length > 0);
    const hasAlternates = locales.length > 1;

    const urlEntries = urls.map(u => {
      const imageBlocks = (u.images || []).map(img => `
    <image:image>
      <image:loc>${this.escapeXml(img.loc)}</image:loc>${img.title ? `
      <image:title><![CDATA[${img.title}]]></image:title>` : ''}${img.caption ? `
      <image:caption><![CDATA[${img.caption}]]></image:caption>` : ''}
    </image:image>`).join("");
      const alternates = hasAlternates
        ? sitemapAlternates(u.loc, this.baseUrl, locales)
        : "";
      return `
  <url>
    <loc>${this.escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>${alternates}${imageBlocks}
  </url>`;
    }).join("");

    // Namespaces are declared only when used: an unused xmlns is harmless but
    // a missing one makes the whole document invalid, and a single-language
    // site should produce byte-for-byte the sitemap it produced before.
    const ns = [
      'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      hasImages ? 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : "",
      hasAlternates ? 'xmlns:xhtml="http://www.w3.org/1999/xhtml"' : "",
    ].filter(Boolean).join(" ");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${ns}>${urlEntries}
</urlset>`;
  }

  // ============================================================
  // SITEMAP STATS & REGENERATION
  // ============================================================

  /**
   * Get URL counts for all sitemaps
   */
  async getSitemapStats(): Promise<{
    sitemaps: Array<{
      name: string;
      description: string;
      urlCount: number;
      path: string;
    }>;
    totalUrls: number;
    lastRegenerated: string;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Count URLs for each module using proper COUNT(*)
    // Articles must have BOTH publishedAt AND primaryCategoryId (same as sitemap generation)
    const [articleCount] = await db.select({ count: count() }).from(articles).where(and(isNotNull(articles.publishedAt), isNotNull(articles.primaryCategoryId)));
    // For jobs/people/investors: use statusId OR publishedAt (same logic as sitemap generation)
    const [statsPubStatus] = await db.select({ id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial')));
    const statsFilter = (table: any) => statsPubStatus
      ? or(eq(table.statusId, statsPubStatus.id), isNotNull(table.publishedAt))
      : isNotNull(table.publishedAt);
    const [jobCount] = await db.select({ count: count() }).from(jobs).where(statsFilter(jobs));
    const [peopleCount] = await db.select({ count: count() }).from(people).where(statsFilter(people));
    // Events: use statusId OR publishedAt (same logic as sitemap generation)
    const [evtPubStatus] = await db.select({ id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial')));
    const [eventCount] = await db.select({ count: count() }).from(events)
      .where(
        evtPubStatus
          ? or(eq(events.statusId, evtPubStatus.id), isNotNull(events.publishedAt))
          : isNotNull(events.publishedAt)
      );
    const [categoryCount] = await db.select({ count: count() }).from(categories);
    const [companyCount] = await db.select({ count: count() }).from(companies).where(statsFilter(companies));

    // Count Google News (last 48 hours)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 48);
    const recentArticles = await db.select({ id: articles.id, publishedAt: articles.publishedAt })
      .from(articles)
      .where(isNotNull(articles.publishedAt));
    const newsCount = recentArticles.filter(a => {
      const pubDate = toDate(a.publishedAt as unknown as string);
      return pubDate && pubDate >= cutoffDate;
    }).length;

    // Static pages count - matches the actual list in generateSitemap("pages")
    const staticPagesCount = 12;

    const sitemaps = [
      { name: "articles", description: "All articles (full archive)", urlCount: Number(articleCount?.count) || 0, path: "/sitemap-articles.xml" },
      { name: "news", description: "Google News (last 48 hours)", urlCount: newsCount, path: "/sitemap-news.xml" },
      { name: "jobs", description: "Job listings", urlCount: Number(jobCount?.count) || 0, path: "/sitemap-jobs.xml" },
      { name: "people", description: "People profiles", urlCount: Number(peopleCount?.count) || 0, path: "/sitemap-people.xml" },
      { name: "companies", description: "Company profiles", urlCount: Number(companyCount?.count) || 0, path: "/sitemap-companies.xml" },
      { name: "events", description: "Events", urlCount: Number(eventCount?.count) || 0, path: "/sitemap-events.xml" },
      { name: "categories", description: "Category pages", urlCount: Number(categoryCount?.count) || 0, path: "/sitemap-categories.xml" },
      { name: "pages", description: "Static pages", urlCount: staticPagesCount, path: "/sitemap-pages.xml" }
    ];

    const totalUrls = sitemaps.reduce((sum, s) => sum + s.urlCount, 0);

    return {
      sitemaps,
      totalUrls,
      lastRegenerated: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const seoService = new SeoService();
