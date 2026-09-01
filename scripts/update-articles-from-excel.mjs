import { drizzle } from 'drizzle-orm/mysql2';
import { eq, like, or, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema.ts';
import * as fs from 'fs';

const db = drizzle(process.env.DATABASE_URL);

// Read the Excel data (converted to JSON)
const excelData = JSON.parse(fs.readFileSync('/home/ubuntu/excel_data.json', 'utf-8'));

// Category slug to ID mapping
const categoryMapping = {
  'funding-vc': 60007,
  'startups': 60001,
  'events': 60114,
  'jobs-and-talent': 60108, // maps to jobs-talent
  'exclusive': 60132,
  'news': 90002,
  'powerlist': 90003,
  'technology': 60033,
  'uncategorized': 90005,
};

// Get or create author by name
async function getOrCreateAuthor(authorName) {
  if (!authorName) return null;
  
  // Check if author exists in users table
  const existingUser = await db.select({
    id: schema.users.id,
    name: schema.users.name
  }).from(schema.users).where(like(schema.users.name, `%${authorName}%`)).limit(1);
  
  if (existingUser.length > 0) {
    return existingUser[0].id;
  }
  
  // Check if author exists in people table
  const existingPerson = await db.select({
    id: schema.people.id,
    name: schema.people.name
  }).from(schema.people).where(like(schema.people.name, `%${authorName}%`)).limit(1);
  
  if (existingPerson.length > 0) {
    // Return the person's ID (we'll store it differently)
    return null; // For now, just store the name
  }
  
  return null;
}

// Get or create tag
async function getOrCreateTag(tagName) {
  if (!tagName || tagName.trim() === '') return null;
  
  const slug = tagName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  // Check if tag exists
  const existingTag = await db.select({
    id: schema.tags.id
  }).from(schema.tags).where(eq(schema.tags.slug, slug)).limit(1);
  
  if (existingTag.length > 0) {
    return existingTag[0].id;
  }
  
  // Create new tag
  try {
    const result = await db.insert(schema.tags).values({
      name: tagName.trim(),
      slug: slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Get the inserted ID
    const newTag = await db.select({
      id: schema.tags.id
    }).from(schema.tags).where(eq(schema.tags.slug, slug)).limit(1);
    
    return newTag.length > 0 ? newTag[0].id : null;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const existingTag = await db.select({
        id: schema.tags.id
      }).from(schema.tags).where(eq(schema.tags.slug, slug)).limit(1);
      return existingTag.length > 0 ? existingTag[0].id : null;
    }
    console.error(`Error creating tag ${tagName}:`, error.message);
    return null;
  }
}

// Link article to tag
async function linkArticleToTag(articleId, tagId) {
  if (!articleId || !tagId) return;
  
  try {
    await db.insert(schema.articleTags).values({
      articleId: articleId,
      tagId: tagId,
    }).onDuplicateKeyUpdate({
      set: { tagId: tagId }
    });
  } catch (error) {
    // Ignore duplicate key errors
    if (error.code !== 'ER_DUP_ENTRY') {
      console.error(`Error linking article ${articleId} to tag ${tagId}:`, error.message);
    }
  }
}

// Link article to category
async function linkArticleToCategory(articleId, categoryId, isPrimary = false) {
  if (!articleId || !categoryId) return;
  
  try {
    await db.insert(schema.articleCategories).values({
      articleId: articleId,
      categoryId: categoryId,
      isPrimary: isPrimary,
    }).onDuplicateKeyUpdate({
      set: { isPrimary: isPrimary }
    });
  } catch (error) {
    // Ignore duplicate key errors
    if (error.code !== 'ER_DUP_ENTRY') {
      console.error(`Error linking article ${articleId} to category ${categoryId}:`, error.message);
    }
  }
}

async function main() {
  console.log("=== UPDATING ARTICLES FROM EXCEL ===\n");
  console.log(`Total articles to process: ${excelData.length}\n`);
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  const notFoundArticles = [];
  const updatedArticles = [];
  const newTagsCreated = [];
  
  for (const row of excelData) {
    const slug = row['Slug'];
    const title = row['Title'];
    const category = row['Category'];
    const author = row['Author'];
    const createdAt = row['Created At'];
    const publishedAt = row['Published At'];
    const tagsStr = row['Tags (Max 2)'];
    const imageLink = row['Image Link'];
    
    // Find article by slug
    const articles = await db.select({
      id: schema.articles.id,
      title: schema.articles.title,
      slug: schema.articles.slug
    }).from(schema.articles).where(eq(schema.articles.slug, slug)).limit(1);
    
    if (articles.length === 0) {
      notFound++;
      notFoundArticles.push({ slug, title });
      continue;
    }
    
    const article = articles[0];
    const articleId = article.id;
    
    try {
      // Build update object
      const updateData = {};
      
      // Update dates
      if (createdAt) {
        updateData.createdAt = new Date(createdAt);
      }
      if (publishedAt) {
        updateData.publishedAt = new Date(publishedAt);
      }
      
      // Update featured image
      if (imageLink && imageLink.trim() !== '') {
        updateData.featuredImage = imageLink.trim();
      }
      
      // Update author name (store in authorName field if exists, or excerpt as fallback)
      if (author && author.trim() !== '') {
        updateData.authorName = author.trim();
      }
      
      // Update primary category
      if (category && categoryMapping[category]) {
        updateData.primaryCategoryId = categoryMapping[category];
      }
      
      // Apply updates
      if (Object.keys(updateData).length > 0) {
        await db.update(schema.articles)
          .set(updateData)
          .where(eq(schema.articles.id, articleId));
      }
      
      // Link to category
      if (category && categoryMapping[category]) {
        await linkArticleToCategory(articleId, categoryMapping[category], true);
      }
      
      // Process tags
      if (tagsStr && tagsStr.trim() !== '') {
        const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t !== '');
        for (const tagName of tags) {
          const tagId = await getOrCreateTag(tagName);
          if (tagId) {
            await linkArticleToTag(articleId, tagId);
            if (!newTagsCreated.includes(tagName)) {
              newTagsCreated.push(tagName);
            }
          }
        }
      }
      
      updated++;
      updatedArticles.push({ id: articleId, slug, title, category, author });
      
      if (updated % 20 === 0) {
        console.log(`Progress: ${updated}/${excelData.length} articles updated...`);
      }
      
    } catch (error) {
      errors++;
      console.error(`Error updating article ${slug}:`, error.message);
    }
  }
  
  console.log("\n=== SUMMARY ===");
  console.log(`Total processed: ${excelData.length}`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors: ${errors}`);
  
  if (notFoundArticles.length > 0) {
    console.log("\n=== ARTICLES NOT FOUND ===");
    for (const art of notFoundArticles.slice(0, 20)) {
      console.log(`  - ${art.slug} (${art.title})`);
    }
    if (notFoundArticles.length > 20) {
      console.log(`  ... and ${notFoundArticles.length - 20} more`);
    }
  }
  
  console.log("\n=== TAGS PROCESSED ===");
  console.log(`Total unique tags: ${newTagsCreated.length}`);
  for (const tag of newTagsCreated.slice(0, 30)) {
    console.log(`  - ${tag}`);
  }
  if (newTagsCreated.length > 30) {
    console.log(`  ... and ${newTagsCreated.length - 30} more`);
  }
  
  // Save report
  const report = {
    totalProcessed: excelData.length,
    updated,
    notFound,
    errors,
    notFoundArticles,
    tagsProcessed: newTagsCreated,
    categoriesUsed: Object.keys(categoryMapping),
  };
  
  fs.writeFileSync('/home/ubuntu/article_update_report.json', JSON.stringify(report, null, 2));
  console.log("\n=== Report saved to /home/ubuntu/article_update_report.json ===");
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
