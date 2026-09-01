import { db } from './server/db.ts';
import { articles, workflowStatuses } from './drizzle/schema.ts';
import { and, eq, or, isNotNull, desc } from 'drizzle-orm';

// Get published status
const [publishedArticleStatus] = await db.select({ id: workflowStatuses.id })
  .from(workflowStatuses)
  .where(and(eq(workflowStatuses.slug, 'published'), eq(workflowStatuses.workflowType, 'editorial')));

console.log('Published status ID:', publishedArticleStatus?.id);

// Get articles using the sitemap query
const articleList = await db.select({
  slug: articles.slug,
  statusId: articles.statusId,
  publishedAt: articles.publishedAt
}).from(articles)
  .where(
    publishedArticleStatus
      ? or(eq(articles.statusId, publishedArticleStatus.id), isNotNull(articles.publishedAt))
      : isNotNull(articles.publishedAt)
  )
  .orderBy(desc(articles.publishedAt));

console.log('Total articles in sitemap query:', articleList.length);

// Check status distribution
const statusCounts = {};
articleList.forEach(a => {
  statusCounts[a.statusId] = (statusCounts[a.statusId] || 0) + 1;
});

console.log('\nStatus distribution:');
Object.entries(statusCounts).forEach(([statusId, count]) => {
  console.log(`  Status ID ${statusId}: ${count} articles`);
});

// Check how many have publishedAt
const withPublishedAt = articleList.filter(a => a.publishedAt).length;
console.log(`\nArticles with publishedAt: ${withPublishedAt}`);
console.log(`Articles without publishedAt: ${articleList.length - withPublishedAt}`);
