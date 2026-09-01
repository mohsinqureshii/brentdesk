import { db } from './server/db.ts';
import { articles, workflowStatuses } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Get all statuses
const allStatuses = await db.select({
  id: workflowStatuses.id,
  slug: workflowStatuses.slug,
  name: workflowStatuses.name
}).from(workflowStatuses)
  .where(eq(workflowStatuses.workflowType, 'editorial'));

console.log('Workflow statuses:');
allStatuses.forEach(s => console.log(`  ${s.id}: ${s.slug} (${s.name})`));

// Count articles by status
console.log('\nArticles by status:');
for (const status of allStatuses) {
  const count = await db.select({ count: db.sql`COUNT(*)` })
    .from(articles)
    .where(eq(articles.statusId, status.id));
  console.log(`  ${status.slug}: ${count[0].count}`);
}

// Total articles
const total = await db.select({ count: db.sql`COUNT(*)` }).from(articles);
console.log(`\nTotal articles: ${total[0].count}`);
