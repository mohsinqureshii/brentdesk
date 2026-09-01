import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

async function main() {
  const db = drizzle(process.env.DATABASE_URL);

  const result = await db.execute(sql`
    SELECT u.name, COUNT(*) as count 
    FROM articles a 
    JOIN users u ON a.authorId = u.id 
    GROUP BY u.name 
    ORDER BY count DESC
  `);
  console.log('Author distribution:');
  result[0].forEach(r => console.log(`  ${r.name}: ${r.count} articles`));
  process.exit(0);
}

main().catch(console.error);
