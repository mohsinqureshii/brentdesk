import { getDb } from "./server/db.ts";
import { articles } from "./drizzle/schema.ts";
import { isNotNull, or, eq, and, desc } from "drizzle-orm";

const db = await getDb();

// Get articles with publishedAt but no primaryCategoryId
const missingCategoryArticles = await db.select({
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  publishedAt: articles.publishedAt,
  primaryCategoryId: articles.primaryCategoryId
}).from(articles)
  .where(
    and(
      isNotNull(articles.publishedAt),
      or(
        isNotNull(articles.primaryCategoryId) === false,
        eq(articles.primaryCategoryId, 0)
      )
    )
  )
  .orderBy(desc(articles.publishedAt));

console.log('Published articles WITHOUT primaryCategoryId:\n');
missingCategoryArticles.forEach((a, i) => {
  console.log(`${i + 1}. ID: ${a.id}`);
  console.log(`   Title: ${a.title}`);
  console.log(`   Slug: ${a.slug}`);
  console.log(`   Published: ${a.publishedAt}`);
  console.log();
});

console.log(`Total: ${missingCategoryArticles.length} articles`);

process.exit(0);
