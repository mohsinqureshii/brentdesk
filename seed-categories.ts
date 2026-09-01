import { drizzle } from "drizzle-orm/mysql2";
import { categories } from './drizzle/schema';
import { eq } from 'drizzle-orm';

// Category structure: Parent -> Subcategories
const categoryStructure: Record<string, string[]> = {
  "Startups": ["Startups", "Startup Ecosystem", "Startup Spotlight", "Founder Stories", "Incubators & Accelerators"],
  "Funding & VC": ["Funding & VC", "Funding Rounds", "Venture Capital", "Angel Investing", "Corporate VC"],
  "Markets, IPO & M&A": ["IPO", "Exits", "Mergers & Acquisitions", "Public Markets"],
  "Fintech": ["Fintech", "Digital Banking", "Payments", "BNPL", "Open Banking", "WealthTech", "InsurTech"],
  "AI & Data": ["AI", "GenAI", "Data & Analytics", "Machine Learning", "AI Regulation"],
  "Enterprise & SaaS": ["Technology", "SaaS", "Cloud", "Enterprise Software", "DevTools", "APIs & Integrations"],
  "Cybersecurity": ["Security", "Data Privacy", "Identity & Access", "Fraud & Risk", "Cloud Security"],
  "Web3 & Blockchain": ["Web3", "Crypto Markets", "Tokenization", "Blockchain Use Cases", "Web3 Regulation"],
  "HealthTech": ["Health Tech", "Digital Health", "Biotech", "MedTech", "Wellness Tech"],
  "Climate & Energy": ["Energy Tech", "Climate Tech", "Clean Energy", "Sustainability", "WaterTech"],
  "Mobility & Logistics": ["Logistics", "Mobility", "EV & Charging", "Aviation Tech", "Supply Chain"],
  "PropTech & Real Estate": ["PropTech", "Construction Tech", "Smart Cities", "Real Estate Platforms"],
  "E-commerce & Retail Tech": ["Retail Tech", "Marketplaces", "FoodTech & Delivery", "Loyalty & CRM", "POS & Payments"],
  "Media, Gaming & Creator Economy": ["Gaming", "Social", "Creator Economy", "Streaming & Content"],
  "Telecom & Connectivity": ["5G & Infrastructure", "eSIM & Digital SIM", "Satellite & Connectivity", "Telco Partnerships"],
  "GovTech, Defense & Space": ["GovTech", "SpaceTech", "DefenseTech", "National Programs", "Smart Cities Projects"],
  "RegTech & Compliance": ["SAMA & Saudi Regulations", "ZATCA & Tax", "AML / KYC", "Licensing & Approvals", "Data Protection"],
  "People & Leadership": ["Leaders Move", "Founders", "Executives", "Operators", "Leadership Interviews"],
  "Jobs & Talent": ["Jobs & Talent", "Startup Jobs", "Hiring Trends", "Salary & Benefits", "Career Growth"],
  "Events": ["Events", "Conferences", "Meetups & Community", "Webinars & Online Sessions", "Workshops & Bootcamps", "Demo Days & Pitch Nights", "Hackathons", "Awards & Competitions"],
  "Resources": ["Templates & Toolkits", "Founder Perks & Credits", "Regulations Hub", "Tools Directory", "Playbooks & Guides", "Programs & Grants"],
  "Press & Editorial": ["Press Release", "Exclusive", "Opinion", "Reports & Research", "PowerList & Rankings", "Interviews", "Sponsored Content"],
  "Hardware, Robotics & IoT": ["IoT & Sensors", "Robotics", "Drones & Autonomy", "Consumer Devices"],
  "Cloud, Infra & Data Centers": ["Data Centers", "Cloud Infrastructure", "DevOps & SRE", "Observability & Monitoring"],
  "Retail & Hospitality Tech": ["Restaurant Tech", "Delivery & Last Mile", "POS, Ordering & Payments", "Loyalty & Engagement"],
  "Partnerships & Deals": ["Partnerships", "Joint Ventures", "Strategic Alliances", "Vendor Agreements"]
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  
  const db = drizzle(process.env.DATABASE_URL);
  console.log('Starting category seeding...');

  let sortOrder = 0;
  
  for (const [parentName, subcategories] of Object.entries(categoryStructure)) {
    sortOrder++;
    const parentSlug = slugify(parentName);
    
    // Insert parent category
    await db.insert(categories).values({
      name: parentName,
      slug: parentSlug,
      module: 'news',
      sortOrder: sortOrder,
      isActive: true,
      parentId: null
    });
    
    // Get the inserted parent ID
    const [parent] = await db.select().from(categories).where(eq(categories.slug, parentSlug));
    const parentId = parent.id;
    console.log(`Created parent: ${parentName} (ID: ${parentId})`);
    
    // Insert subcategories
    let subSortOrder = 0;
    for (const subName of subcategories) {
      subSortOrder++;
      const subSlug = `${parentSlug}-${slugify(subName)}`;
      
      await db.insert(categories).values({
        name: subName,
        slug: subSlug,
        module: 'news',
        sortOrder: subSortOrder,
        isActive: true,
        parentId: parentId
      });
      console.log(`  - Created sub: ${subName}`);
    }
  }

  // Get final count
  const allCategories = await db.select().from(categories);
  console.log(`\nTotal categories created: ${allCategories.length}`);
  console.log('Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
