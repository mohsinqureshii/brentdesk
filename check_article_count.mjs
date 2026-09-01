import { getDb } from "./server/db.ts";
import { articles } from "./drizzle/schema.ts";
import { isNotNull } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("Database not available");
  process.exit(1);
}

// Get total published articles
const publishedArticles = await db.select({
  id: articles.id,
  slug: articles.slug,
  publishedAt: articles.publishedAt,
  updatedAt: articles.updatedAt
}).from(articles)
  .where(isNotNull(articles.publishedAt));

console.log(`Total published articles: ${publishedArticles.length}`);

// Count by date
const byDate = {};
publishedArticles.forEach(a => {
  const date = a.publishedAt ? new Date(a.publishedAt).toISOString().split('T')[0] : 'null';
  byDate[date] = (byDate[date] || 0) + 1;
});

const sorted = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 20);
console.log("\nTop 20 dates by count:");
sorted.forEach(([date, count]) => {
  console.log(`  ${date}: ${count} articles`);
});

process.exit(0);
