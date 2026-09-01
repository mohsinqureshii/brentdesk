import { getDb } from "./server/db.ts";
import { articles, categories } from "./drizzle/schema.ts";
import { isNotNull, and } from "drizzle-orm";

const db = await getDb();

// Get a sample of articles from the sitemap
const sitemapArticles = await db.select({
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  publishedAt: articles.publishedAt,
  primaryCategoryId: articles.primaryCategoryId
}).from(articles)
  .where(and(isNotNull(articles.publishedAt), isNotNull(articles.primaryCategoryId)))
  .limit(5);

console.log("Sample of articles in sitemap (with both publishedAt and primaryCategoryId):");
console.log(JSON.stringify(sitemapArticles, null, 2));

// Get articles that have publishedAt but NO primaryCategoryId
const missingCategory = await db.select({
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  publishedAt: articles.publishedAt,
  primaryCategoryId: articles.primaryCategoryId
}).from(articles)
  .where(and(isNotNull(articles.publishedAt), isNotNull(articles.primaryCategoryId) === false))
  .limit(5);

console.log("\nArticles with publishedAt but NO primaryCategoryId:");
console.log(JSON.stringify(missingCategory, null, 2));

process.exit(0);
