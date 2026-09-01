import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { homepageSections, categories } from '../drizzle/schema';
import { eq, asc } from 'drizzle-orm';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  
  const sections = await db.select({
    id: homepageSections.id,
    name: homepageSections.name,
    categoryId: homepageSections.categoryId,
    categoryName: categories.name,
    isActive: homepageSections.isActive,
    position: homepageSections.position,
    sectionType: homepageSections.sectionType,
  })
    .from(homepageSections)
    .leftJoin(categories, eq(homepageSections.categoryId, categories.id))
    .where(eq(homepageSections.sectionType, 'category'))
    .orderBy(asc(homepageSections.sortOrder));
  
  console.log('Category Sections:');
  sections.forEach(s => {
    console.log(`  ${s.id}: ${s.name} -> Category: ${s.categoryName || 'NOT SET'} (ID: ${s.categoryId}) | Active: ${s.isActive} | Position: ${s.position}`);
  });
  
  await conn.end();
}

main().catch(console.error);
