import { getDb } from "./server/db";
import { categories } from "./drizzle/schema";
import { isNull, eq } from "drizzle-orm";

// Map of parent category names to their correct slugs (all key words included)
const parentSlugFixes: Record<string, string> = {
  "Startups": "startups",
  "Funding & VC": "funding-vc",
  "Markets, IPO & M&A": "markets-ipo-ma",
  "Fintech": "fintech",
  "AI & Data": "ai-data",
  "Enterprise & SaaS": "enterprise-saas",
  "Cybersecurity": "cybersecurity",
  "Web3 & Blockchain": "web3-blockchain",
  "HealthTech": "healthtech",
  "Climate & Energy": "climate-energy",
  "Mobility & Logistics": "mobility-logistics",
  "PropTech & Real Estate": "proptech-real-estate",
  "E-commerce & Retail Tech": "ecommerce-retail-tech",
  "Media, Gaming & Creator Economy": "media-gaming-creator-economy",
  "Telecom & Connectivity": "telecom-connectivity",
  "GovTech, Defense & Space": "govtech-defense-space",
  "RegTech & Compliance": "regtech-compliance",
  "People & Leadership": "people-leadership",
  "Jobs & Talent": "jobs-talent",
  "Events": "events",
  "Resources": "resources",
  "Press & Editorial": "press-editorial",
  "Hardware, Robotics & IoT": "hardware-robotics-iot",
  "Cloud, Infra & Data Centers": "cloud-infra-data-centers",
  "Retail & Hospitality Tech": "retail-hospitality-tech",
  "Partnerships & Deals": "partnerships-deals",
};

async function fixParentSlugs() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  console.log("Fixing parent category slugs...\n");

  // Get all parent categories
  const parents = await db.select()
    .from(categories)
    .where(isNull(categories.parentId));

  let updated = 0;

  for (const parent of parents) {
    const correctSlug = parentSlugFixes[parent.name];
    
    if (correctSlug && parent.slug !== correctSlug) {
      console.log(`  ${parent.name}: ${parent.slug} → ${correctSlug}`);
      
      await db.update(categories)
        .set({ slug: correctSlug })
        .where(eq(categories.id, parent.id));
      
      updated++;
    }
  }

  console.log(`\nUpdated ${updated} parent category slugs.`);
  process.exit(0);
}

fixParentSlugs().catch(console.error);
