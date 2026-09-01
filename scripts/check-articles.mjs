import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

const result = await db.execute(sql`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN primaryCategoryId IS NOT NULL THEN 1 ELSE 0 END) as with_primary,
    SUM(CASE WHEN authorId IS NOT NULL THEN 1 ELSE 0 END) as with_author
  FROM articles
`);
console.log('Article stats:', result[0]);

const article = await db.execute(sql`
  SELECT id, slug, primaryCategoryId, authorId FROM articles WHERE slug = 'uae-fintech-mal-raises-230m-to-launch-ai-native-islamic-digital-bank-in-2026' LIMIT 1
`);
console.log('Sample article:', article[0]);
process.exit(0);
