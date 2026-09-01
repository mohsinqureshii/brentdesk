import { drizzle } from 'drizzle-orm/mysql2';
import { isNull } from 'drizzle-orm';
import * as schema from '../drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

async function main() {
  const cats = await db.select({
    id: schema.categories.id,
    name: schema.categories.name,
    slug: schema.categories.slug
  }).from(schema.categories).where(isNull(schema.categories.parentId));
  
  console.log("=== EXISTING CATEGORIES (Main Categories) ===");
  for (const cat of cats) {
    console.log(`ID: ${cat.id}, Name: "${cat.name}", Slug: "${cat.slug}"`);
  }
  console.log(`\nTotal: ${cats.length} main categories`);
  
  // Output slugs for comparison
  console.log("\n=== SLUGS LIST ===");
  const slugs = cats.map(c => c.slug);
  console.log(JSON.stringify(slugs));
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
