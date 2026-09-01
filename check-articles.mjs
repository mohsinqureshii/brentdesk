import { getDb } from "./server/db.ts";
import { articles } from "./drizzle/schema.ts";
import { isNotNull, and, count } from "drizzle-orm";

const db = getDb();

// Count total articles
const totalCount = await db.select({ cnt: count() }).from(articles);
console.log("Total articles:", totalCount[0]?.cnt || 0);

// Count articles with publishedAt
const withPublishedAt = await db.select({ cnt: count() }).from(articles).where(isNotNull(articles.publishedAt));
console.log("Articles with publishedAt:", withPublishedAt[0]?.cnt || 0);

// Count articles with primaryCategoryId
const withCategory = await db.select({ cnt: count() }).from(articles).where(isNotNull(articles.primaryCategoryId));
console.log("Articles with primaryCategoryId:", withCategory[0]?.cnt || 0);

// Count articles with BOTH publishedAt AND primaryCategoryId
const withBoth = await db.select({ cnt: count() }).from(articles).where(and(isNotNull(articles.publishedAt), isNotNull(articles.primaryCategoryId)));
console.log("Articles with BOTH publishedAt AND primaryCategoryId:", withBoth[0]?.cnt || 0);

process.exit(0);
