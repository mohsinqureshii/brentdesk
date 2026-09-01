import { getDb } from './server/db';
import { resources, calculators, vendors, regulations, founderDeals, starterPacks, workflowStatuses } from './drizzle/schema';
import { sql, eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('Database not available');
    return;
  }

  // Count resources
  const [resourceCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(resources);
  console.log('resources:', resourceCount.count);

  const [calcCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(calculators);
  console.log('calculators:', calcCount.count);

  const [vendorCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(vendors);
  console.log('vendors:', vendorCount.count);

  const [regCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(regulations);
  console.log('regulations:', regCount.count);

  const [dealCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(founderDeals);
  console.log('founder_deals:', dealCount.count);

  const [packCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(starterPacks);
  console.log('starter_packs:', packCount.count);

  // Resources by type
  const byType = await db.select({ 
    type: resources.type, 
    count: sql<number>`COUNT(*)` 
  }).from(resources).groupBy(resources.type);
  console.log('\nResources by type:');
  byType.forEach(r => console.log(`  ${r.type}: ${r.count}`));

  // Published status
  const [published] = await db.select().from(workflowStatuses).where(eq(workflowStatuses.slug, 'published'));
  console.log('\nPublished status ID:', published?.id);

  process.exit(0);
}

main();
