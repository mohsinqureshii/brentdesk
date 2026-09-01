import { drizzle } from 'drizzle-orm/mysql2';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';
import fs from 'fs';

// Author mapping from Excel to database user names
const authorMapping = {
  'Noura Khalid': 'Noura Khalid',
  'Emily Carter': 'Emily Carter',
  'James Whitemore': 'James Whitemore',
  'Omar Rahman': 'Omar Rahman',
  'Mohsin': 'Mo',
  'Raza Rizvi': 'Raza',
};

async function main() {
  console.log('Starting author update...\n');
  
  // Connect to database
  const db = drizzle(process.env.DATABASE_URL);
  
  // Step 1: Get all users for author mapping
  console.log('Step 1: Fetching users...');
  const allUsers = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users);
  console.log(`Found ${allUsers.length} users:`);
  allUsers.forEach(u => console.log(`  - ID ${u.id}: ${u.name}`));
  
  // Create a map of user names to IDs (case-insensitive)
  const userNameToId = {};
  for (const user of allUsers) {
    if (user.name) {
      userNameToId[user.name.toLowerCase()] = user.id;
    }
  }
  
  // Step 2: Read Excel data
  console.log('\nStep 2: Reading Excel data...');
  const excelData = JSON.parse(fs.readFileSync('/home/ubuntu/excel_data.json', 'utf-8'));
  console.log(`Loaded ${excelData.length} articles from Excel`);
  
  // Step 3: Update authors
  console.log('\nStep 3: Updating authors...');
  let updatedCount = 0;
  let notFoundCount = 0;
  let authorNotFoundCount = 0;
  const errors = [];
  
  for (const row of excelData) {
    const slug = row.slug;
    const excelAuthor = row.author;
    
    if (!slug || !excelAuthor) continue;
    
    // Find the article
    const [article] = await db.select({ id: schema.articles.id, authorId: schema.articles.authorId })
      .from(schema.articles)
      .where(eq(schema.articles.slug, slug))
      .limit(1);
    
    if (!article) {
      notFoundCount++;
      errors.push({ slug, error: 'Article not found' });
      continue;
    }
    
    // Map Excel author name to database user name
    const dbUserName = authorMapping[excelAuthor] || excelAuthor;
    const userId = userNameToId[dbUserName.toLowerCase()];
    
    if (!userId) {
      authorNotFoundCount++;
      errors.push({ slug, error: `Author not found: ${excelAuthor} -> ${dbUserName}` });
      continue;
    }
    
    // Update if different
    if (article.authorId !== userId) {
      await db.update(schema.articles)
        .set({ authorId: userId })
        .where(eq(schema.articles.id, article.id));
      updatedCount++;
      console.log(`  Updated: ${slug} -> ${dbUserName} (ID: ${userId})`);
    }
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total articles in Excel: ${excelData.length}`);
  console.log(`Authors updated: ${updatedCount}`);
  console.log(`Articles not found: ${notFoundCount}`);
  console.log(`Authors not found: ${authorNotFoundCount}`);
  
  if (errors.length > 0 && errors.length <= 20) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e.slug}: ${e.error}`));
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
