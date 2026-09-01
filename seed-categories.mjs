import mysql from 'mysql2/promise';

// Category structure: Parent -> Subcategories
const categoryStructure = {
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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'gateway01.us-west-2.prod.aws.tidbcloud.com',
    port: parseInt(process.env.DB_PORT || '4000'),
    user: process.env.DB_USER || 'techscoop_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'techscoop',
    ssl: { rejectUnauthorized: true }
  });

  console.log('Connected to database');

  // Reset auto increment
  await conn.query('ALTER TABLE categories AUTO_INCREMENT = 1');

  let sortOrder = 0;
  
  for (const [parentName, subcategories] of Object.entries(categoryStructure)) {
    sortOrder++;
    const parentSlug = slugify(parentName);
    
    // Insert parent category
    const [parentResult] = await conn.query(
      'INSERT INTO categories (name, slug, module, sortOrder, isActive, parentId) VALUES (?, ?, ?, ?, ?, NULL)',
      [parentName, parentSlug, 'news', sortOrder, true]
    );
    const parentId = parentResult.insertId;
    console.log(`Created parent: ${parentName} (ID: ${parentId})`);
    
    // Insert subcategories
    let subSortOrder = 0;
    for (const subName of subcategories) {
      subSortOrder++;
      const subSlug = slugify(subName);
      
      await conn.query(
        'INSERT INTO categories (name, slug, module, sortOrder, isActive, parentId) VALUES (?, ?, ?, ?, ?, ?)',
        [subName, `${parentSlug}-${subSlug}`, 'news', subSortOrder, true, parentId]
      );
      console.log(`  - Created sub: ${subName}`);
    }
  }

  // Get final count
  const [countResult] = await conn.query('SELECT COUNT(*) as count FROM categories');
  console.log(`\nTotal categories created: ${countResult[0].count}`);

  await conn.end();
  console.log('Done!');
}

main().catch(console.error);
