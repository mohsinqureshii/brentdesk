import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

// Check the category for the sample article
const cat = await db.execute(sql`
  SELECT c.id, c.slug, c.name FROM categories c WHERE c.id = 90002
`);
console.log('Category 90002:', cat[0]);

// Check if the URL would be correct
const articleWithCat = await db.execute(sql`
  SELECT a.slug as article_slug, c.slug as category_slug
  FROM articles a
  JOIN categories c ON a.primaryCategoryId = c.id
  WHERE a.slug = 'uae-fintech-mal-raises-230m-to-launch-ai-native-islamic-digital-bank-in-2026'
`);
console.log('Article with category:', articleWithCat[0]);
if (articleWithCat[0] && articleWithCat[0][0]) {
  console.log('Expected URL: /' + articleWithCat[0][0].category_slug + '/' + articleWithCat[0][0].article_slug);
}
process.exit(0);
