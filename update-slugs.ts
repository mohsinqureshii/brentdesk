import { drizzle } from "drizzle-orm/mysql2";
import { categories } from './drizzle/schema';
import { eq, isNull, isNotNull } from 'drizzle-orm';

// Clean slug generator - short, no parent prefix, no "and", lowercase, hyphen-separated
function cleanSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*&\s*/g, '-')       // Replace & with hyphen
    .replace(/\s+and\s+/g, '-')     // Replace " and " with hyphen
    .replace(/[^a-z0-9]+/g, '-')    // Replace non-alphanumeric with hyphen
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '');       // Trim leading/trailing hyphens
}

// Parent slug mapping for cleaner URLs
const parentSlugMap: Record<string, string> = {
  "Startups": "startups",
  "Funding & VC": "funding",
  "Markets, IPO & M&A": "markets",
  "Fintech": "fintech",
  "AI & Data": "ai",
  "Enterprise & SaaS": "enterprise",
  "Cybersecurity": "security",
  "Web3 & Blockchain": "web3",
  "HealthTech": "healthtech",
  "Climate & Energy": "climate",
  "Mobility & Logistics": "mobility",
  "PropTech & Real Estate": "proptech",
  "E-commerce & Retail Tech": "ecommerce",
  "Media, Gaming & Creator Economy": "media",
  "Telecom & Connectivity": "telecom",
  "GovTech, Defense & Space": "govtech",
  "RegTech & Compliance": "regtech",
  "People & Leadership": "people",
  "Jobs & Talent": "jobs",
  "Events": "events",
  "Resources": "resources",
  "Press & Editorial": "press",
  "Hardware, Robotics & IoT": "hardware",
  "Cloud, Infra & Data Centers": "cloud",
  "Retail & Hospitality Tech": "retail",
  "Partnerships & Deals": "partnerships"
};

// Child slugs that need special handling to avoid duplicates
// Format: "Child Name" -> "unique-slug"
const childSlugOverrides: Record<string, string> = {
  // Startups children - first one named "Startups" needs different slug
  "Startups": "startup-news",
  // Funding children
  "Funding & VC": "funding-news",
  // Fintech children
  "Fintech": "fintech-news",
  // AI children
  "AI": "ai-news",
  // Web3 children
  "Web3": "web3-news",
  // Health Tech children
  "Health Tech": "healthtech-news",
  // Events children
  "Events": "events-news",
  // Jobs children
  "Jobs & Talent": "jobs-news",
  // GovTech children
  "GovTech": "govtech-news",
  // PropTech children
  "PropTech": "proptech-news",
  // Logistics children (avoid conflict with parent)
  "Logistics": "logistics-news",
  // Mobility children
  "Mobility": "mobility-news",
  // Security children
  "Security": "security-news",
  // Gaming children
  "Gaming": "gaming-news",
  // Partnerships children
  "Partnerships": "partnerships-news"
};

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  
  const db = drizzle(process.env.DATABASE_URL);
  console.log('Updating category slugs to SEO-optimized format...\n');

  // Step 1: Get all parent categories and update their slugs
  const parentCategories = await db.select().from(categories).where(isNull(categories.parentId));
  
  // Create a map of parent ID to parent slug for child reference
  const parentIdToSlug: Record<number, string> = {};
  
  console.log('=== Updating Parent Category Slugs ===');
  for (const parent of parentCategories) {
    const newSlug = parentSlugMap[parent.name] || cleanSlug(parent.name);
    parentIdToSlug[parent.id] = newSlug;
    
    if (parent.slug !== newSlug) {
      await db.update(categories)
        .set({ slug: newSlug })
        .where(eq(categories.id, parent.id));
      console.log(`  ${parent.name}: ${parent.slug} → ${newSlug}`);
    } else {
      console.log(`  ${parent.name}: ${parent.slug} (unchanged)`);
    }
  }

  // Step 2: Get all child categories and update their slugs
  console.log('\n=== Updating Child Category Slugs ===');
  const childCategories = await db.select().from(categories).where(isNotNull(categories.parentId));
  
  // Track used slugs to avoid duplicates
  const usedSlugs = new Set<string>(Object.values(parentIdToSlug));
  
  for (const child of childCategories) {
    // Check for override first
    let newSlug = childSlugOverrides[child.name];
    
    if (!newSlug) {
      // Generate clean child slug from name only
      newSlug = cleanSlug(child.name);
      
      // Special handling for common patterns
      newSlug = newSlug
        .replace(/-tech$/, 'tech')  // "energy-tech" → "energytech"
        .replace(/^5g-/, 'fiveg-'); // "5g-infrastructure" → "fiveg-infrastructure"
    }
    
    // If slug already used, make it unique by adding parent context
    if (usedSlugs.has(newSlug)) {
      const parentSlug = child.parentId ? parentIdToSlug[child.parentId] : '';
      newSlug = `${parentSlug}-${newSlug}`;
    }
    
    usedSlugs.add(newSlug);
    
    if (child.slug !== newSlug) {
      await db.update(categories)
        .set({ slug: newSlug })
        .where(eq(categories.id, child.id));
      console.log(`  ${child.name}: ${child.slug} → ${newSlug}`);
    } else {
      console.log(`  ${child.name}: ${child.slug} (unchanged)`);
    }
  }

  // Step 3: Verify final counts
  const allCategories = await db.select().from(categories);
  const parents = allCategories.filter(c => !c.parentId);
  const children = allCategories.filter(c => c.parentId);
  
  console.log(`\n=== Summary ===`);
  console.log(`Total categories: ${allCategories.length}`);
  console.log(`Parent categories: ${parents.length}`);
  console.log(`Child categories: ${children.length}`);
  console.log('\nDone!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
