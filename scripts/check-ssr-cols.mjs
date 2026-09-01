import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [cols] = await conn.query('SHOW COLUMNS FROM articles');
const colNames = cols.map(c => c.Field);

const ssrCols = ['id', 'title', 'slug', 'excerpt', 'content', 'featuredImageId', 'publishedAt', 'updatedAt', 'primaryCategoryId', 'authorId', 'seoTitle', 'seoDescription', 'seoKeywords', 'canonicalUrl'];

console.log('Missing columns in DB:');
ssrCols.forEach(c => {
  if (colNames.indexOf(c) === -1) {
    console.log('  MISSING:', c);
  }
});

// Check media table
const [mediaCols] = await conn.query('SHOW COLUMNS FROM media');
const mediaColNames = mediaCols.map(c => c.Field);
console.log('\nMedia columns:', mediaColNames);

// Check categories table
const [catCols] = await conn.query('SHOW COLUMNS FROM categories');
const catColNames = catCols.map(c => c.Field);
console.log('\nCategories columns:', catColNames);

// Check users table
const [userCols] = await conn.query('SHOW COLUMNS FROM users');
const userColNames = userCols.map(c => c.Field);
console.log('\nUsers columns:', userColNames);

// Now test the EXACT query the SSR uses
try {
  const [result] = await conn.query(
    `SELECT id, title, slug, excerpt, content, featuredImageId, publishedAt, updatedAt, primaryCategoryId, authorId, seoTitle, seoDescription, seoKeywords, canonicalUrl FROM articles WHERE slug = ? AND publishedAt IS NOT NULL LIMIT 1`,
    ['youtube-s-deepfake-shield-comes-too-late-for-mena-journalists-already-under-digital-siege']
  );
  console.log('\nSSR query result:', result.length > 0 ? 'Found article' : 'No article found');
  if (result[0]) {
    console.log('  Title:', result[0].title);
    console.log('  featuredImageId:', result[0].featuredImageId);
    console.log('  primaryCategoryId:', result[0].primaryCategoryId);
  }
} catch (e) {
  console.log('\nSSR query FAILED:', e.message);
}

await conn.end();
