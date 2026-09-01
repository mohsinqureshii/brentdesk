/**
 * Fix duplicate article_categories entries
 * This script removes duplicate entries from the article_categories junction table
 * while preserving one entry per unique articleId-categoryId pair.
 * 
 * NOTE: This does NOT affect article slugs/URLs which are based on primaryCategoryId
 * stored directly in the articles table.
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('Checking for duplicate article_categories entries...');
    
    // Find all duplicates
    const [duplicates] = await connection.execute(`
      SELECT articleId, categoryId, COUNT(*) as cnt 
      FROM article_categories 
      GROUP BY articleId, categoryId 
      HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${duplicates.length} article-category pairs with duplicates`);
    
    if (duplicates.length === 0) {
      console.log('No duplicates found. Exiting.');
      return;
    }
    
    // For each duplicate pair, delete all but one entry
    let totalDeleted = 0;
    
    for (const dup of duplicates) {
      const { articleId, categoryId, cnt } = dup;
      const toDelete = cnt - 1; // Keep one, delete the rest
      
      // Delete duplicates (keeping one)
      const [result] = await connection.execute(`
        DELETE FROM article_categories 
        WHERE articleId = ? AND categoryId = ? 
        LIMIT ?
      `, [articleId, categoryId, toDelete]);
      
      totalDeleted += result.affectedRows;
      console.log(`Article ${articleId}, Category ${categoryId}: deleted ${result.affectedRows} duplicates`);
    }
    
    console.log(`\nTotal duplicates removed: ${totalDeleted}`);
    
    // Verify no more duplicates
    const [remaining] = await connection.execute(`
      SELECT COUNT(*) as cnt FROM (
        SELECT articleId, categoryId 
        FROM article_categories 
        GROUP BY articleId, categoryId 
        HAVING COUNT(*) > 1
      ) as dupes
    `);
    
    console.log(`Remaining duplicates: ${remaining[0].cnt}`);
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
