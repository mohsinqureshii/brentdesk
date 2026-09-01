/**
 * Image Search Service
 * Searches for relevant images from the media library, external APIs, and AI generation
 * Priority: Media Library → Unsplash → Pexels → AI Generation
 */
import { ENV } from "../../_core/env";
import { storagePut } from "../../storage";

// ============================================================
// TYPES
// ============================================================

export interface ImageSearchResult {
  url: string;
  thumbnailUrl?: string;
  title: string;
  source: string;
  width?: number;
  height?: number;
  license?: string;
  mediaId?: number; // If from media library
}

export interface ImageSearchOptions {
  query: string;
  count?: number;
  page?: number;
  safeSearch?: boolean;
  aspectRatio?: "wide" | "square" | "tall";
  size?: "small" | "medium" | "large";
}

export interface SelectedImage {
  originalUrl: string;
  storedUrl: string;
  fileKey: string;
  title: string;
  source: string;
  alt: string;
  caption: string;
}

// ============================================================
// MEDIA LIBRARY SEARCH (Priority 1)
// ============================================================

/**
 * Search the internal media library for matching images
 */
async function searchMediaLibrary(options: ImageSearchOptions): Promise<ImageSearchResult[]> {
  try {
    const { getDb } = await import("../../db");
    const { media, articles } = await import("../../../drizzle/schema");
    const { like, or, sql, desc, eq, isNotNull } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return [];

    const count = options.count || 12;
    const page = options.page || 1;
    const offset = (page - 1) * count;

    // Split query into keywords for flexible matching
    const keywords = options.query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    if (keywords.length === 0) return [];

    // Strategy 1: Search media directly by filename, alt, caption
    const mediaConditions = keywords.map(kw => {
      const pattern = `%${kw}%`;
      return or(
        like(media.originalFilename, pattern),
        like(media.alt, pattern),
        like(media.caption, pattern),
      );
    });

    const directResults = await db
      .select({
        id: media.id,
        url: media.url,
        originalFilename: media.originalFilename,
        alt: media.alt,
        caption: media.caption,
        width: media.width,
        height: media.height,
      })
      .from(media)
      .where(
        sql`(${media.mimeType} LIKE 'image%') AND (${or(...mediaConditions)})`
      )
      .orderBy(desc(media.createdAt))
      .limit(count)
      .offset(offset);

    const results: ImageSearchResult[] = directResults.map(item => ({
      url: item.url || "",
      thumbnailUrl: item.url || "",
      title: item.alt || item.originalFilename || "Media library image",
      source: "Media Library",
      width: item.width || undefined,
      height: item.height || undefined,
      license: "Owned",
      mediaId: item.id,
    }));

    // Strategy 2: Also search article-linked images by matching article titles
    if (results.length < count) {
      const articleConditions = keywords.map(kw => like(articles.title, `%${kw}%`));
      const seenIds = new Set(results.map(r => r.mediaId));

      const articleImages = await db
        .select({
          id: media.id,
          url: media.url,
          originalFilename: media.originalFilename,
          alt: media.alt,
          width: media.width,
          height: media.height,
          articleTitle: articles.title,
        })
        .from(articles)
        .innerJoin(media, eq(articles.featuredImageId, media.id))
        .where(
          sql`(${or(...articleConditions)}) AND ${isNotNull(articles.featuredImageId)}`
        )
        .orderBy(desc(articles.publishedAt))
        .limit(count - results.length);

      for (const item of articleImages) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push({
            url: item.url || "",
            thumbnailUrl: item.url || "",
            title: item.alt || item.articleTitle || item.originalFilename || "Article image",
            source: "Media Library",
            width: item.width || undefined,
            height: item.height || undefined,
            license: "Owned",
            mediaId: item.id,
          });
        }
      }
    }

    return results;
  } catch (err) {
    console.error("[ImageSearch] Media library search failed:", err);
    return [];
  }
}

/**
 * Browse all media library images (when no specific query)
 */
async function browseMediaLibrary(options: ImageSearchOptions): Promise<ImageSearchResult[]> {
  try {
    const { getDb } = await import("../../db");
    const { media } = await import("../../../drizzle/schema");
    const { like, desc } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return [];

    const count = options.count || 12;
    const page = options.page || 1;
    const offset = (page - 1) * count;

    const results = await db
      .select({
        id: media.id,
        url: media.url,
        originalFilename: media.originalFilename,
        alt: media.alt,
        caption: media.caption,
        width: media.width,
        height: media.height,
      })
      .from(media)
      .where(like(media.mimeType, "image%"))
      .orderBy(desc(media.createdAt))
      .limit(count)
      .offset(offset);

    return results.map(item => ({
      url: item.url || "",
      thumbnailUrl: item.url || "",
      title: item.alt || item.originalFilename || "Media library image",
      source: "Media Library",
      width: item.width || undefined,
      height: item.height || undefined,
      license: "Owned",
      mediaId: item.id,
    }));
  } catch (err) {
    console.error("[ImageSearch] Media library browse failed:", err);
    return [];
  }
}

// ============================================================
// EXTERNAL SEARCH PROVIDERS
// ============================================================

/**
 * Search for images using Unsplash API (free tier)
 */
async function searchViaUnsplash(options: ImageSearchOptions, apiKey: string): Promise<ImageSearchResult[]> {
  try {
    const params = new URLSearchParams({
      query: options.query,
      per_page: String(options.count || 12),
      page: String(options.page || 1),
      orientation: options.aspectRatio === "wide" ? "landscape" : options.aspectRatio === "tall" ? "portrait" : "squarish",
    });

    const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { "Authorization": `Client-ID ${apiKey}` },
    });

    if (!response.ok) throw new Error(`Unsplash API error: ${response.status}`);

    const data = await response.json();
    return (data.results || []).map((item: any) => ({
      url: item.urls?.regular || item.urls?.full,
      thumbnailUrl: item.urls?.thumb || item.urls?.small,
      title: item.description || item.alt_description || "",
      source: `Unsplash / ${item.user?.name || "Unknown"}`,
      width: item.width,
      height: item.height,
      license: "Unsplash License (free)",
    }));
  } catch (err) {
    console.error("[ImageSearch] Unsplash search failed:", err);
    throw err;
  }
}

/**
 * Search for images using Pexels API (free tier)
 */
async function searchViaPexels(options: ImageSearchOptions, apiKey: string): Promise<ImageSearchResult[]> {
  try {
    const params = new URLSearchParams({
      query: options.query,
      per_page: String(options.count || 12),
      page: String(options.page || 1),
      orientation: options.aspectRatio === "wide" ? "landscape" : options.aspectRatio === "tall" ? "portrait" : "landscape",
    });

    const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { "Authorization": apiKey },
    });

    if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);

    const data = await response.json();
    return (data.photos || []).map((item: any) => ({
      url: item.src?.large2x || item.src?.large || item.src?.original,
      thumbnailUrl: item.src?.medium || item.src?.small,
      title: item.alt || "",
      source: `Pexels / ${item.photographer || "Unknown"}`,
      width: item.width,
      height: item.height,
      license: "Pexels License (free)",
    }));
  } catch (err) {
    console.error("[ImageSearch] Pexels search failed:", err);
    throw err;
  }
}

// ============================================================
// AI IMAGE GENERATION
// ============================================================

export async function generateAIImage(prompt: string): Promise<ImageSearchResult> {
  const { generateImage } = await import("../../_core/imageGeneration");
  const result = await generateImage({ prompt });
  return {
    url: result.url ?? "",
    thumbnailUrl: result.url ?? "",
    title: `AI Generated: ${prompt.substring(0, 50)}`,
    source: "AI Generated",
    license: "AI Generated (owned)",
  };
}

// ============================================================
// MAIN SEARCH FUNCTION
// ============================================================

export async function searchImages(options: ImageSearchOptions): Promise<ImageSearchResult[]> {
  const errors: string[] = [];
  const allResults: ImageSearchResult[] = [];

  // 1. Search Media Library first (always available)
  try {
    const mediaResults = options.query.trim()
      ? await searchMediaLibrary(options)
      : await browseMediaLibrary(options);
    if (mediaResults.length > 0) {
      allResults.push(...mediaResults);
    }
  } catch (err: any) {
    errors.push(`Media Library: ${err.message}`);
  }

  // If we have enough results from media library, return them
  const targetCount = options.count || 12;
  if (allResults.length >= targetCount) {
    return allResults.slice(0, targetCount);
  }

  // 2. Try external APIs for additional results
  try {
    const { getDb } = await import("../../db");
    const { settings } = await import("../../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (db) {
      // Try Unsplash
      const [unsplashKey] = await db.select().from(settings).where(eq(settings.key, "ai_unsplash_api_key"));
      if (unsplashKey?.value) {
        try {
          const results = await searchViaUnsplash(options, String(unsplashKey.value));
          allResults.push(...results);
        } catch (err: any) {
          errors.push(`Unsplash: ${err.message}`);
        }
      }

      // Try Pexels
      if (allResults.length < targetCount) {
        const [pexelsKey] = await db.select().from(settings).where(eq(settings.key, "ai_pexels_api_key"));
        if (pexelsKey?.value) {
          try {
            const results = await searchViaPexels(options, String(pexelsKey.value));
            allResults.push(...results);
          } catch (err: any) {
            errors.push(`Pexels: ${err.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    errors.push(`External APIs: ${err.message}`);
  }

  if (allResults.length === 0 && errors.length > 0) {
    console.warn("[ImageSearch] Search issues:", errors.join("; "));
  }

  return allResults.slice(0, targetCount);
}

// ============================================================
// IMAGE DOWNLOAD & STORAGE
// ============================================================

export async function downloadAndStoreImage(
  imageUrl: string,
  articleSlug: string,
  title: string
): Promise<SelectedImage> {
  try {
    // Download the image
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "TechScoop/1.0 (https://techscoop.io)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());

    // Determine file extension
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileKey = `articles/${articleSlug}/featured-${timestamp}-${randomSuffix}.${ext}`;

    // Upload to S3
    const { url: storedUrl } = await storagePut(fileKey, buffer, contentType);

    return {
      originalUrl: imageUrl,
      storedUrl,
      fileKey,
      title: title || "Article featured image",
      source: new URL(imageUrl).hostname,
      alt: title || "Featured image",
      caption: `Image source: ${new URL(imageUrl).hostname}`,
    };
  } catch (err: any) {
    console.error("[ImageSearch] Failed to download and store image:", err);
    throw new Error(`Image download failed: ${err.message}`);
  }
}

// ============================================================
// AI-POWERED IMAGE QUERY GENERATION
// ============================================================

export function generateImageSearchQuery(
  title: string,
  content: string,
  entityNames: string[]
): string {
  const keywords: string[] = [];
  const titleWords = title
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w.toLowerCase()));
  keywords.push(...titleWords.slice(0, 4));
  if (entityNames.length > 0) {
    keywords.push(entityNames[0]);
  }
  keywords.push("technology", "business");
  return keywords.slice(0, 6).join(" ");
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
  "her", "was", "one", "our", "out", "has", "have", "been", "from",
  "this", "that", "with", "they", "will", "each", "make", "like",
  "long", "look", "many", "some", "than", "them", "then", "very",
  "when", "come", "made", "find", "here", "know", "take", "want",
  "does", "into", "just", "over", "such", "also", "back", "after",
  "year", "much", "where", "most", "only", "about", "which", "their",
  "would", "there", "could", "other", "more", "what",
]);
