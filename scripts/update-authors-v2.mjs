import { drizzle } from 'drizzle-orm/mysql2';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';
import fs from 'fs';

// Author mapping from Excel to database user names
const authorMapping = {
  'noura khalid': 'noura khalid',
  'emily carter': 'emily carter',
  'james whitemore': 'james whitemore',
  'omar rahman': 'omar rahman',
  'mohsin': 'mo',
  'raza rizvi': 'raza',
};

async function main() {
  console.log('Starting author update v2...\n');
  
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
  console.log('\nUser name to ID mapping:', userNameToId);
  
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
    const slug = row.Slug || row.slug;
    const excelAuthor = row.Author || row.author;
    
    if (!slug) continue;
    if (!excelAuthor) {
      console.log(`  Skipping ${slug}: No author in Excel`);
      continue;
    }
    
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
    
    // Map Excel author name to database user name (case-insensitive)
    const excelAuthorLower = excelAuthor.toLowerCase().trim();
    const dbUserNameLower = authorMapping[excelAuthorLower] || excelAuthorLower;
    const userId = userNameToId[dbUserNameLower];
    
    if (!userId) {
      authorNotFoundCount++;
      errors.push({ slug, error: `Author not found: "${excelAuthor}" -> "${dbUserNameLower}"` });
      continue;
    }
    
    // Update the author
    await db.update(schema.articles)
      .set({ authorId: userId })
      .where(eq(schema.articles.id, article.id));
    updatedCount++;
    
    if (updatedCount <= 10) {
      console.log(`  Updated: ${slug} -> ${dbUserNameLower} (ID: ${userId})`);
    } else if (updatedCount === 11) {
      console.log(`  ... (showing first 10 updates)`);
    }
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total articles in Excel: ${excelData.length}`);
  console.log(`Authors updated: ${updatedCount}`);
  console.log(`Articles not found: ${notFoundCount}`);
  console.log(`Authors not found: ${authorNotFoundCount}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.slice(0, 20).forEach(e => console.log(`  - ${e.slug}: ${e.error}`));
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more errors`);
    }
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
