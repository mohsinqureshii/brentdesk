import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const [rows] = await conn.execute(
  `SELECT id, slug, title FROM articles WHERE publishedAt IS NOT NULL AND (primaryCategoryId IS NULL OR primaryCategoryId = 0) ORDER BY publishedAt DESC`
);

console.log('\n=== PUBLISHED ARTICLES WITHOUT PRIMARY CATEGORY ===\n');
rows.forEach((r, i) => {
  console.log(`${i + 1}. ${r.title}`);
  console.log(`   Slug: ${r.slug}`);
  console.log(`   ID: ${r.id}\n`);
});
console.log(`Total: ${rows.length} articles\n`);

await conn.end();
