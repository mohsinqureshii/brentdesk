import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Count all articles
const [allArticles] = await connection.execute('SELECT COUNT(*) as count FROM articles');
console.log('Total articles:', allArticles[0].count);

// Count published articles
const [publishedArticles] = await connection.execute(`
  SELECT COUNT(*) as count FROM articles 
  WHERE publishedAt IS NOT NULL OR statusId IN (
    SELECT id FROM workflow_statuses WHERE slug = 'published' AND workflowType = 'editorial'
  )
`);
console.log('Published articles:', publishedArticles[0].count);

// Check for articles with missing categories
const [missingCat] = await connection.execute(`
  SELECT COUNT(*) as count FROM articles 
  WHERE primaryCategoryId IS NULL AND (publishedAt IS NOT NULL OR statusId IN (
    SELECT id FROM workflow_statuses WHERE slug = 'published' AND workflowType = 'editorial'
  ))
`);
console.log('Published articles with missing category:', missingCat[0].count);

// Check for articles with invalid categories
const [invalidCat] = await connection.execute(`
  SELECT COUNT(DISTINCT a.id) as count FROM articles a
  LEFT JOIN categories c ON a.primaryCategoryId = c.id
  WHERE c.id IS NULL AND a.primaryCategoryId IS NOT NULL AND (a.publishedAt IS NOT NULL OR a.statusId IN (
    SELECT id FROM workflow_statuses WHERE slug = 'published' AND workflowType = 'editorial'
  ))
`);
console.log('Published articles with invalid category:', invalidCat[0].count);

connection.end();
