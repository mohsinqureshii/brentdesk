/**
 * Helper to resolve article IDs to their full public URLs and metadata.
 * Separated from the main service to keep DB imports isolated.
 */

import { getBaseUrl } from "../../shared/publication";
import { getDb } from "../db";
import { articles, categories } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

const BASE_URL = process.env.BASE_URL && process.env.BASE_URL.startsWith("http")
  ? process.env.BASE_URL
  : getBaseUrl();

export interface ArticleUrlInfo {
  url: string;
  articleId: number;
  articleTitle: string;
  articleSlug: string;
}

/**
 * Resolve the full public URL and metadata for an article by its ID.
 * URL format: <base url>/{categorySlug}/{articleSlug}
 */
export async function resolveArticleUrl(articleId: number): Promise<string | null> {
  const info = await resolveArticleInfo(articleId);
  return info?.url || null;
}

/**
 * Resolve the full public URL and metadata for an article by its ID.
 */
export async function resolveArticleInfo(articleId: number): Promise<ArticleUrlInfo | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      primaryCategoryId: articles.primaryCategoryId,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!result[0]) return null;

  const categorySlug = await getCategorySlug(result[0].primaryCategoryId);
  return {
    url: `${BASE_URL}/${categorySlug}/${result[0].slug}`,
    articleId: result[0].id,
    articleTitle: result[0].title,
    articleSlug: result[0].slug,
  };
}

/**
 * Resolve full public URLs for multiple article IDs.
 */
export async function resolveArticleUrls(articleIds: number[]): Promise<string[]> {
  const infos = await resolveArticleInfos(articleIds);
  return infos.map(i => i.url);
}

/**
 * Resolve full public URLs and metadata for multiple article IDs.
 */
export async function resolveArticleInfos(articleIds: number[]): Promise<ArticleUrlInfo[]> {
  const db = await getDb();
  if (!db || articleIds.length === 0) return [];

  const result = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      primaryCategoryId: articles.primaryCategoryId,
    })
    .from(articles)
    .where(inArray(articles.id, articleIds));

  const infos: ArticleUrlInfo[] = [];
  for (const article of result) {
    const categorySlug = await getCategorySlug(article.primaryCategoryId);
    infos.push({
      url: `${BASE_URL}/${categorySlug}/${article.slug}`,
      articleId: article.id,
      articleTitle: article.title,
      articleSlug: article.slug,
    });
  }

  return infos;
}

/**
 * Get the category slug for a given category ID, defaulting to "news".
 */
async function getCategorySlug(categoryId: number | null): Promise<string> {
  if (!categoryId) return "news";

  const db = await getDb();
  if (!db) return "news";

  const cat = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  return cat[0]?.slug || "news";
}
