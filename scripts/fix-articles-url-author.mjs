import { drizzle } from 'drizzle-orm/mysql2';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';
import fs from 'fs';

// Author mapping from Excel to database
const authorMapping = {
  'Noura Khalid': 'Noura Khalid',
  'Emily Carter': 'Emily Carter',
  'James Whitemore': 'James Whitemore',
  'Omar Rahman': 'Omar Rahman',
  'Mohsin': 'Mo',
  'Raza Rizvi': 'Raza',
};

async function main() {
  console.log('Starting article URL and author fix...\n');
  
  // Connect to database
  const db = drizzle(process.env.DATABASE_URL);
  
  // Step 1: Get all users for author mapping
  console.log('Step 1: Fetching users for author mapping...');
  const allUsers = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users);
  console.log(`Found ${allUsers.length} users`);
  
  // Create a map of user names to IDs (case-insensitive)
  const userNameToId = {};
  for (const user of allUsers) {
    if (user.name) {
      userNameToId[user.name.toLowerCase()] = user.id;
    }
  }
  console.log('User name mapping:', Object.keys(userNameToId));
  
  // Step 2: Read Excel data to get author mappings
  console.log('\nStep 2: Reading Excel data for author mappings...');
  const excelData = JSON.parse(fs.readFileSync('/home/ubuntu/excel_data.json', 'utf-8'));
  console.log(`Loaded ${excelData.length} articles from Excel`);
  
  // Step 3: Get all categories
  console.log('\nStep 3: Fetching categories...');
  const allCategories = await db.select({ id: schema.categories.id, slug: schema.categories.slug, name: schema.categories.name }).from(schema.categories);
  const categorySlugToId = {};
  for (const cat of allCategories) {
    categorySlugToId[cat.slug] = cat.id;
  }
  console.log(`Found ${allCategories.length} categories`);
  console.log('Category slugs:', Object.keys(categorySlugToId));
  
  // Step 4: Process each article
  console.log('\nStep 4: Processing articles...');
  let updatedCount = 0;
  let primaryCategoryUpdated = 0;
  let authorUpdated = 0;
  let errors = [];
  
  for (const row of excelData) {
    const slug = row.slug;
    const excelAuthor = row.author;
    const categorySlug = row.category_slug;
    
    if (!slug) continue;
    
    // Find the article
    const [article] = await db.select({ id: schema.articles.id, authorId: schema.articles.authorId, primaryCategoryId: schema.articles.primaryCategoryId })
      .from(schema.articles)
      .where(eq(schema.articles.slug, slug))
      .limit(1);
    
    if (!article) {
      errors.push({ slug, error: 'Article not found' });
      continue;
    }
    
    const updates = {};
    
    // Update primary category if we have a category slug
    if (categorySlug && categorySlugToId[categorySlug]) {
      const categoryId = categorySlugToId[categorySlug];
      if (article.primaryCategoryId !== categoryId) {
        updates.primaryCategoryId = categoryId;
        primaryCategoryUpdated++;
      }
    }
    
    // Update author if we have an author name
    if (excelAuthor) {
      // Map Excel author name to database user name
      const dbUserName = authorMapping[excelAuthor] || excelAuthor;
      const userId = userNameToId[dbUserName.toLowerCase()];
      
      if (userId && article.authorId !== userId) {
        updates.authorId = userId;
        authorUpdated++;
      } else if (!userId) {
        errors.push({ slug, error: `Author not found: ${excelAuthor} -> ${dbUserName}` });
      }
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await db.update(schema.articles).set(updates).where(eq(schema.articles.id, article.id));
      updatedCount++;
    }
  }
  
  // Step 5: For articles without primary category, set it from article_categories
  console.log('\nStep 5: Setting primary category for remaining articles...');
  const articlesWithoutPrimary = await db.execute(sql`
    SELECT a.id, MIN(ac.categoryId) as categoryId
    FROM articles a
    JOIN article_categories ac ON a.id = ac.articleId
    WHERE a.primaryCategoryId IS NULL
    GROUP BY a.id
  `);
  
  let additionalPrimaryUpdates = 0;
  const rows = articlesWithoutPrimary[0] || [];
  for (const row of rows) {
    await db.update(schema.articles)
      .set({ primaryCategoryId: row.categoryId })
      .where(eq(schema.articles.id, row.id));
    additionalPrimaryUpdates++;
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total articles processed: ${excelData.length}`);
  console.log(`Articles updated: ${updatedCount}`);
  console.log(`Primary categories updated: ${primaryCategoryUpdated}`);
  console.log(`Authors updated: ${authorUpdated}`);
  console.log(`Additional primary categories set: ${additionalPrimaryUpdates}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.slice(0, 10).forEach(e => console.log(`  - ${e.slug}: ${e.error}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
  }
  
  // Save report
  const report = {
    totalProcessed: excelData.length,
    articlesUpdated: updatedCount,
    primaryCategoriesUpdated: primaryCategoryUpdated,
    authorsUpdated: authorUpdated,
    additionalPrimaryCategoriesSet: additionalPrimaryUpdates,
    errors: errors,
  };
  
  fs.writeFileSync('/home/ubuntu/article_url_author_report.json', JSON.stringify(report, null, 2));
  console.log('\nReport saved to /home/ubuntu/article_url_author_report.json');
  
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
