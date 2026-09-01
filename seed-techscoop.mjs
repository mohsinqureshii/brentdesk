import mysql from 'mysql2/promise';

const TECHSCOOP_ID = 300031;

async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // ── Step 1: Update basic text fields ──
  await conn.execute(`
    UPDATE companies SET
      tagline = ?,
      description = ?,
      short_description = ?,
      website = ?,
      linkedIn = ?,
      twitter = ?,
      facebook = ?,
      instagram = ?,
      youtube = ?,
      email = ?,
      phone = ?,
      location = ?,
      industry = ?,
      stage = ?,
      foundedYear = ?,
      employeeCount = ?,
      totalFunding = ?,
      isVerified = 1,
      isFeatured = 1,
      mission = ?,
      vision = ?,
      problem_solved = ?,
      market_served = ?,
      active_users_range = ?,
      arr_range = ?,
      countries_served = 22,
      clients_count = 150,
      boilerplate = ?,
      pr_contact_email = ?,
      app_store_link = ?,
      play_store_link = ?,
      hiring_actively = 1,
      verification_level = 'verified',
      profile_completeness = 95,
      last_updated_by = 'admin',
      data_source = 'verified',
      publishedAt = NOW()
    WHERE id = ?
  `, [
    "MENA's Leading Tech Ecosystem Intelligence Platform",
    "TechScoop is the premier platform for the Middle East and North Africa (MENA) tech ecosystem, providing comprehensive coverage of startups, investors, accelerators, and the broader innovation landscape. Founded in 2020, TechScoop has grown to become the go-to source for tech professionals, entrepreneurs, and investors looking to navigate the rapidly evolving MENA tech scene.\n\nOur platform combines editorial journalism with a powerful data engine that tracks thousands of companies, funding rounds, and key people across the region. We serve as both a media outlet and an intelligence platform, offering curated news, in-depth analysis, company profiles, and a comprehensive jobs board.\n\nTechScoop's mission is to make the MENA tech ecosystem more transparent, connected, and accessible to everyone — from first-time founders to seasoned investors.",
    "The premier platform for MENA tech ecosystem intelligence — covering startups, investors, jobs, and innovation across the Middle East and North Africa.",
    "https://techscoop.io",
    "https://linkedin.com/company/techscoop",
    "https://x.com/techscoop_io",
    "https://facebook.com/techscoop.io",
    "https://instagram.com/techscoop.io",
    "https://youtube.com/@techscoop",
    "hello@techscoop.io",
    "+971-4-123-4567",
    "Dubai, United Arab Emirates",
    "Media & Technology",
    "seed",
    2020,
    "11-50",
    "$1.2M",
    "To make the MENA tech ecosystem more transparent, connected, and accessible to everyone — from first-time founders to seasoned investors.",
    "To become the definitive intelligence platform for emerging tech ecosystems worldwide, starting with MENA.",
    "The MENA tech ecosystem lacks a centralized, reliable source of data and intelligence. Information about startups, funding rounds, and key people is fragmented across social media, press releases, and word of mouth. TechScoop solves this by aggregating, verifying, and presenting this data in one comprehensive platform.",
    "Tech entrepreneurs, venture capital firms, angel investors, corporate innovation teams, accelerators, government innovation bodies, and tech professionals across the MENA region.",
    "50,000+ monthly",
    "$200K-$500K",
    "TechScoop is MENA's leading tech ecosystem intelligence platform, providing comprehensive coverage of startups, investors, accelerators, and innovation across the Middle East and North Africa. Founded in 2020 and headquartered in Dubai, TechScoop serves over 50,000 monthly users with curated news, company profiles, funding data, and a jobs board. For more information, visit techscoop.io.",
    "press@techscoop.io",
    "https://apps.apple.com/app/techscoop",
    "https://play.google.com/store/apps/details?id=io.techscoop",
    TECHSCOOP_ID
  ]);
  console.log('✅ Updated basic fields');

  // ── Step 2: Update JSON fields separately ──
  await conn.execute(`
    UPDATE companies SET
      notable_customers = ?,
      partnerships = ?,
      tech_stack = ?,
      key_people = ?,
      timeline = ?,
      certifications = ?,
      whitepapers = ?,
      case_studies = ?
    WHERE id = ?
  `, [
    JSON.stringify([
      { name: "DIFC Innovation Hub" },
      { name: "Hub71" },
      { name: "Saudi Venture Capital Company" },
      { name: "Flat6Labs" },
      { name: "500 Global MENA" }
    ]),
    JSON.stringify([
      { name: "STEP Conference", description: "Official media partner for STEP Conference Dubai" },
      { name: "ArabNet", description: "Content and data partnership for ecosystem reports" },
      { name: "Wamda", description: "Strategic content syndication partnership" }
    ]),
    JSON.stringify(["React", "Node.js", "TypeScript", "PostgreSQL", "Redis", "AWS", "Tailwind CSS", "tRPC", "Drizzle ORM", "Vite"]),
    JSON.stringify([
      { name: "Mudassir Sheikha", role: "Founder & CEO", linkedIn: "https://linkedin.com/in/mudassir", category: "Leadership" },
      { name: "Sarah Al-Hussaini", role: "Chief Technology Officer", linkedIn: "https://linkedin.com/in/sarah-alhussaini", category: "Leadership" },
      { name: "Ahmed Khalil", role: "Head of Content", linkedIn: "https://linkedin.com/in/ahmedkhalil", category: "Editorial" },
      { name: "Fatima Al-Zahra", role: "VP of Partnerships", linkedIn: "https://linkedin.com/in/fatima-alzahra", category: "Business" },
      { name: "Omar Hassan", role: "Lead Engineer", linkedIn: "https://linkedin.com/in/omarhassan", category: "Engineering" },
      { name: "Layla Noor", role: "Head of Data & Research", linkedIn: "https://linkedin.com/in/laylanoor", category: "Research" }
    ]),
    JSON.stringify([
      { year: 2020, title: "TechScoop Founded", description: "Launched as a newsletter covering MENA tech news" },
      { year: 2021, title: "Platform Launch", description: "Launched full website with company profiles and funding tracker" },
      { year: 2022, title: "Seed Funding", description: "Raised $1.2M seed round from regional investors" },
      { year: 2023, title: "Jobs Board Launch", description: "Launched MENA's first dedicated tech jobs board" },
      { year: 2024, title: "50K Monthly Users", description: "Reached 50,000 monthly active users milestone" },
      { year: 2025, title: "Intelligence Platform", description: "Launched AI-powered ecosystem intelligence features" }
    ]),
    JSON.stringify([
      { name: "SOC 2 Type I", year: 2024, issuer: "Deloitte" },
      { name: "GDPR Compliant", year: 2023, issuer: "TrustArc" }
    ]),
    JSON.stringify([
      { title: "State of MENA Tech 2024", url: "#", description: "Comprehensive annual report covering funding trends, emerging sectors, and ecosystem growth across 22 MENA countries." },
      { title: "Women in MENA Tech", url: "#", description: "Research report on the growing role of women founders and tech leaders in the MENA startup ecosystem." },
      { title: "AI Adoption in MENA Startups", url: "#", description: "Survey-based report on how MENA startups are leveraging artificial intelligence across different sectors." }
    ]),
    JSON.stringify([
      { title: "How Hub71 Uses TechScoop Data", url: "#", client: "Hub71", description: "Abu Dhabi's tech ecosystem hub leverages TechScoop's API to track portfolio companies and identify investment opportunities." },
      { title: "DIFC Innovation Hub Ecosystem Mapping", url: "#", client: "DIFC", description: "How DIFC uses TechScoop's platform to map and support their fintech ecosystem." }
    ]),
    TECHSCOOP_ID
  ]);
  console.log('✅ Updated JSON fields');

  // ── Step 3: Seed Products ──
  await conn.execute(`DELETE FROM company_products WHERE company_id = ?`, [TECHSCOOP_ID]);
  
  const products = [
    ['TechScoop Platform', 'Intelligence Platform', 'The core platform providing comprehensive coverage of the MENA tech ecosystem. Browse thousands of company profiles, track funding rounds, discover key people, and stay updated with curated news and analysis.', 'Freemium', JSON.stringify(["Slack", "Zapier", "HubSpot", "Salesforce"]), 1],
    ['TechScoop Jobs', 'Jobs Board', "MENA's dedicated tech jobs board connecting top talent with innovative companies. Features include smart matching, salary transparency, and remote-first filtering.", 'Pay-per-listing', JSON.stringify(["LinkedIn", "Greenhouse", "Lever"]), 2],
    ['TechScoop Data API', 'Data & Analytics', "Enterprise API providing programmatic access to TechScoop's comprehensive dataset of MENA startups, funding rounds, investors, and ecosystem metrics.", 'Subscription', JSON.stringify(["REST API", "GraphQL", "Webhooks"]), 3],
    ['TechScoop Newsletter', 'Media', 'Weekly curated newsletter delivering the most important MENA tech news, funding announcements, and ecosystem insights directly to your inbox.', 'Free', JSON.stringify(["Mailchimp", "Substack"]), 4],
  ];

  for (const p of products) {
    await conn.execute(
      `INSERT INTO company_products (company_id, name, category, description, pricing_model, integrations, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [TECHSCOOP_ID, ...p]
    );
  }
  console.log('✅ Seeded 4 products');

  // ── Step 4: Seed Awards ──
  await conn.execute(`DELETE FROM company_awards WHERE company_id = ?`, [TECHSCOOP_ID]);
  
  const awards = [
    ['Best Tech Media Platform MENA', 2024, 'STEP Conference', 'Recognized as the leading tech media platform in the MENA region'],
    ['Top 50 Arab Startups', 2023, 'Forbes Middle East', 'Listed among the top 50 most promising Arab startups'],
    ['Innovation in Journalism Award', 2023, 'ArabNet', 'For pioneering data-driven tech journalism in the Arab world'],
    ['Best Startup Ecosystem Tool', 2022, 'Startup Genome', 'Recognized for contribution to ecosystem transparency'],
  ];

  for (const a of awards) {
    await conn.execute(
      `INSERT INTO company_awards (company_id, title, year, organization, description) VALUES (?, ?, ?, ?, ?)`,
      [TECHSCOOP_ID, ...a]
    );
  }
  console.log('✅ Seeded 4 awards');

  // ── Step 5: Seed Company Updates ──
  await conn.execute(`DELETE FROM company_updates WHERE company_id = ?`, [TECHSCOOP_ID]);
  
  const updates = [
    ['milestone', 'Reached 50,000 Monthly Users', "We're thrilled to announce that TechScoop has crossed the 50,000 monthly active users milestone! Thank you to our amazing community for making this possible.", '2024-12-15 10:00:00'],
    ['product_launch', 'AI-Powered Company Matching', 'Introducing our new AI-powered matching feature that connects investors with the most relevant startups based on sector, stage, and investment thesis.', '2024-11-20 10:00:00'],
    ['event', 'TechScoop at GITEX Global 2024', "Join us at GITEX Global 2024 in Dubai! We'll be hosting a panel on 'The Future of MENA Tech Ecosystems' and showcasing our latest platform features.", '2024-10-10 10:00:00'],
    ['milestone', 'Partnership with STEP Conference', 'Excited to announce our official media partnership with STEP Conference, the largest tech festival in the MENA region.', '2024-09-01 10:00:00'],
    ['text', 'Q3 2024 MENA Funding Report', 'Our latest quarterly report shows $1.8B in total funding across 245 deals in Q3 2024. Download the full report on our platform.', '2024-08-15 10:00:00'],
  ];

  for (const u of updates) {
    await conn.execute(
      `INSERT INTO company_updates (company_id, type, title, content, created_at) VALUES (?, ?, ?, ?, ?)`,
      [TECHSCOOP_ID, ...u]
    );
  }
  console.log('✅ Seeded 5 company updates');

  await conn.end();
  console.log('\n🎉 TechScoop seeding complete!');
}

seed().catch(e => { console.error(e); process.exit(1); });
