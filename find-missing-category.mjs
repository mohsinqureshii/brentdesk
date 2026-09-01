import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'techscoop'
});

try {
  // Find published articles without primaryCategoryId
  const [rows] = await connection.execute(
    `SELECT id, slug, title, primaryCategoryId, publishedAt, statusId 
     FROM articles 
     WHERE publishedAt IS NOT NULL 
     AND (primaryCategoryId IS NULL OR primaryCategoryId = 0)
     LIMIT 10`
  );
  
  console.log('Published articles WITHOUT primaryCategoryId:');
  console.log(JSON.stringify(rows, null, 2));
  console.log(`\nTotal count: ${rows.length}`);
  
  // Count all published articles with and without category
  const [counts] = await connection.execute(
    `SELECT 
      COUNT(*) as total_published,
      SUM(CASE WHEN primaryCategoryId IS NOT NULL AND primaryCategoryId != 0 THEN 1 ELSE 0 END) as with_category,
      SUM(CASE WHEN primaryCategoryId IS NULL OR primaryCategoryId = 0 THEN 1 ELSE 0 END) as without_category
     FROM articles 
     WHERE publishedAt IS NOT NULL`
  );
  
  console.log('\nPublished articles summary:');
  console.log(JSON.stringify(counts[0], null, 2));
  
} finally {
  await connection.end();
}
