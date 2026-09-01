import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '../drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

// New categories to create (5 total)
const newCategories = [
  { name: 'Exclusive', slug: 'exclusive', description: 'Exclusive content and interviews' },
  { name: 'News', slug: 'news', description: 'General news and updates' },
  { name: 'Powerlist', slug: 'powerlist', description: 'Power lists and rankings' },
  { name: 'Technology', slug: 'technology', description: 'Technology news and trends' },
  { name: 'Uncategorized', slug: 'uncategorized', description: 'Uncategorized content' },
];

async function main() {
  console.log("=== CREATING NEW CATEGORIES ===\n");
  
  const createdCategories = [];
  
  for (const cat of newCategories) {
    try {
      const result = await db.insert(schema.categories).values({
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log(`✓ Created category: ${cat.name} (slug: ${cat.slug})`);
      createdCategories.push(cat);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`⚠ Category already exists: ${cat.name} (slug: ${cat.slug})`);
      } else {
        console.error(`✗ Error creating ${cat.name}:`, error.message);
      }
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Created ${createdCategories.length} new categories`);
  
  // Verify by querying all categories
  const allCats = await db.select({
    id: schema.categories.id,
    name: schema.categories.name,
    slug: schema.categories.slug
  }).from(schema.categories).where(
    // Check for our new categories
    schema.categories.slug.in(['exclusive', 'news', 'powerlist', 'technology', 'uncategorized'])
  );
  
  console.log(`\n=== VERIFICATION ===`);
  for (const cat of allCats) {
    console.log(`ID: ${cat.id}, Name: "${cat.name}", Slug: "${cat.slug}"`);
  }
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
