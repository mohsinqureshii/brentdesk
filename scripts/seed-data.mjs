/**
 * Database Seed Script
 * Populates the database with real sample data
 * Run with: node scripts/seed-data.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  console.log("🌱 Starting database seed...\n");

  // ============================================================
  // CATEGORIES
  // ============================================================
  console.log("📁 Creating categories...");
  await connection.execute(`
    INSERT INTO categories (name, slug, description, module, sortOrder, isActive) VALUES
    ('Startups', 'startups', 'News about startups and entrepreneurship', 'news', 1, true),
    ('Funding', 'funding', 'Investment and funding news', 'news', 2, true),
    ('Technology', 'technology', 'Tech industry news', 'news', 3, true),
    ('AI & ML', 'ai-ml', 'Artificial Intelligence and Machine Learning', 'news', 4, true),
    ('Fintech', 'fintech', 'Financial technology news', 'news', 5, true),
    ('Engineering', 'engineering', 'Engineering job opportunities', 'jobs', 1, true),
    ('Product', 'product', 'Product management roles', 'jobs', 2, true),
    ('Marketing', 'marketing', 'Marketing and growth roles', 'jobs', 3, true),
    ('Design', 'design', 'Design and UX roles', 'jobs', 4, true),
    ('Operations', 'operations', 'Operations and business roles', 'jobs', 5, true)
    ON DUPLICATE KEY UPDATE name=name
  `);

  // ============================================================
  // REGIONS
  // ============================================================
  console.log("🌍 Creating regions...");
  await connection.execute(`
    INSERT INTO regions (name, slug, code, isActive) VALUES
    ('Middle East', 'middle-east', 'ME', true),
    ('Saudi Arabia', 'saudi-arabia', 'SA', true),
    ('UAE', 'uae', 'AE', true),
    ('Egypt', 'egypt', 'EG', true),
    ('Jordan', 'jordan', 'JO', true),
    ('North America', 'north-america', 'NA', true),
    ('Europe', 'europe', 'EU', true),
    ('Asia Pacific', 'asia-pacific', 'APAC', true)
    ON DUPLICATE KEY UPDATE name=name
  `);

  // ============================================================
  // SECTORS
  // ============================================================
  console.log("🏭 Creating sectors...");
  await connection.execute(`
    INSERT INTO sectors (name, slug, description, isActive) VALUES
    ('Technology', 'technology', 'Software, hardware, and IT services', true),
    ('Fintech', 'fintech', 'Financial technology and services', true),
    ('E-commerce', 'ecommerce', 'Online retail and marketplaces', true),
    ('Healthcare', 'healthcare', 'Health technology and services', true),
    ('Education', 'edtech', 'Educational technology', true),
    ('Logistics', 'logistics', 'Supply chain and delivery', true),
    ('Real Estate', 'real-estate', 'Property technology', true),
    ('Entertainment', 'entertainment', 'Media and entertainment', true)
    ON DUPLICATE KEY UPDATE name=name
  `);

  // ============================================================
  // WORKFLOW STATUSES
  // ============================================================
  console.log("📊 Creating workflow statuses...");
  await connection.execute(`
    INSERT INTO workflow_statuses (name, slug, description, color, workflowType, sortOrder, isInitial, isFinal, isPublished) VALUES
    ('Draft', 'draft', 'Content is being drafted', '#6B7280', 'editorial', 1, true, false, false),
    ('Submitted', 'submitted', 'Submitted for review', '#3B82F6', 'editorial', 2, false, false, false),
    ('Editor Review', 'editor-review', 'Under editor review', '#F59E0B', 'editorial', 3, false, false, false),
    ('Senior Editor Review', 'senior-editor-review', 'Under senior editor review', '#8B5CF6', 'editorial', 4, false, false, false),
    ('Approved', 'approved', 'Approved for publication', '#10B981', 'editorial', 5, false, false, false),
    ('Published', 'published', 'Live on the website', '#059669', 'editorial', 6, false, true, true),
    ('Rejected', 'rejected', 'Rejected and needs revision', '#EF4444', 'editorial', 7, false, false, false)
    ON DUPLICATE KEY UPDATE name=name
  `);

  // Get the draft status ID
  const [statusRows] = await connection.execute(`SELECT id FROM workflow_statuses WHERE slug = 'published' LIMIT 1`);
  const publishedStatusId = statusRows[0]?.id || 1;

  // ============================================================
  // ARTICLES (7 real articles)
  // ============================================================
  console.log("📰 Creating articles...");
  await connection.execute(`
    INSERT INTO articles (title, slug, excerpt, content, authorId, statusId, isFeatured, createdAt, updatedAt) VALUES
    (
      'Saudi Arabia''s Vision 2030: Tech Startups Leading the Transformation',
      'saudi-arabia-vision-2030-tech-startups',
      'How Saudi startups are driving the Kingdom''s digital transformation agenda with innovative solutions across fintech, e-commerce, and AI.',
      '<p>Saudi Arabia''s Vision 2030 has created unprecedented opportunities for technology startups. The Kingdom''s commitment to diversifying its economy has led to a surge in venture capital investment, with over $1.5 billion deployed into Saudi startups in 2025 alone.</p><p>Key sectors seeing explosive growth include fintech, where companies like Tamara and Tabby have achieved unicorn status, and e-commerce, where platforms are revolutionizing how Saudis shop online.</p><p>The government''s support through initiatives like Monsha''at and the Saudi Venture Capital Company has been instrumental in creating a thriving ecosystem.</p>',
      1, ${publishedStatusId}, true, NOW(), NOW()
    ),
    (
      'UAE Launches $500M Fund for AI Startups in MENA Region',
      'uae-launches-500m-ai-fund-mena',
      'The UAE government announces a major initiative to position the region as a global AI hub, with significant investments in early-stage AI companies.',
      '<p>The United Arab Emirates has unveiled a groundbreaking $500 million fund dedicated to artificial intelligence startups across the MENA region. This initiative, announced at the World Government Summit in Dubai, aims to establish the region as a global leader in AI innovation.</p><p>The fund will focus on startups developing AI solutions for healthcare, education, smart cities, and financial services. Priority will be given to companies with regional headquarters and those creating Arabic-language AI models.</p>',
      1, ${publishedStatusId}, false, NOW(), NOW()
    ),
    (
      'Egyptian Fintech Startup Raises $35M Series B to Expand Across Africa',
      'egyptian-fintech-35m-series-b-africa',
      'Cairo-based payment platform secures major funding round led by global investors to accelerate pan-African expansion.',
      '<p>A leading Egyptian fintech startup has closed a $35 million Series B funding round, marking one of the largest raises for a North African tech company this year. The round was led by prominent global investors including Tiger Global and Sequoia Capital.</p><p>The company plans to use the funds to expand its digital payment infrastructure across East and West Africa, targeting markets in Kenya, Nigeria, and Ghana.</p>',
      1, ${publishedStatusId}, false, NOW(), NOW()
    ),
    (
      'Riyadh Tech Week 2026: What to Expect from the Region''s Largest Tech Conference',
      'riyadh-tech-week-2026-preview',
      'A comprehensive preview of the upcoming Riyadh Tech Week, featuring keynotes from global tech leaders and startup pitch competitions.',
      '<p>Riyadh Tech Week 2026 is set to be the largest technology conference in the Middle East''s history. With over 50,000 expected attendees and 500+ speakers, the event will showcase the region''s growing prominence in the global tech landscape.</p><p>Highlights include keynote speeches from leading tech executives, a $10 million startup pitch competition, and exclusive announcements from major tech companies entering the Saudi market.</p>',
      1, ${publishedStatusId}, true, NOW(), NOW()
    ),
    (
      'How MENA Startups Are Solving the Region''s Unique Logistics Challenges',
      'mena-startups-logistics-challenges',
      'From last-mile delivery to cross-border shipping, regional startups are building innovative solutions for complex logistics problems.',
      '<p>The MENA region presents unique logistics challenges: vast desert distances, complex customs regulations, and rapidly growing e-commerce demand. A new generation of startups is rising to meet these challenges with innovative technology solutions.</p><p>Companies are leveraging AI for route optimization, blockchain for customs documentation, and drone delivery for remote areas. These innovations are not only solving regional problems but creating exportable solutions for emerging markets worldwide.</p>',
      1, ${publishedStatusId}, false, NOW(), NOW()
    ),
    (
      'Women in Tech: Female Founders Breaking Barriers in the Gulf',
      'women-tech-female-founders-gulf',
      'Profiles of successful female entrepreneurs who are reshaping the tech landscape in Saudi Arabia, UAE, and beyond.',
      '<p>The Gulf''s tech ecosystem is witnessing a remarkable rise in female entrepreneurship. Women-led startups now account for over 30% of new tech ventures in the UAE, with similar growth patterns emerging in Saudi Arabia following recent reforms.</p><p>This article profiles five trailblazing female founders who have built successful companies across fintech, healthtech, and edtech, sharing their journeys and insights for aspiring entrepreneurs.</p>',
      1, ${publishedStatusId}, false, NOW(), NOW()
    ),
    (
      'The Rise of Arabic-First AI: Startups Building Language Models for 400M Speakers',
      'arabic-first-ai-language-models',
      'A deep dive into the startups developing AI solutions specifically designed for Arabic language processing and understanding.',
      '<p>While global AI development has largely focused on English, a new wave of startups is building AI systems designed from the ground up for Arabic. These companies are tackling the unique challenges of Arabic NLP, including dialectal variations, right-to-left text processing, and limited training data.</p><p>The market opportunity is significant: over 400 million Arabic speakers worldwide, with rapidly growing internet penetration and digital adoption across the MENA region.</p>',
      1, ${publishedStatusId}, true, NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE title=title
  `);

  // ============================================================
  // PEOPLE (10 profiles)
  // ============================================================
  console.log("👥 Creating people profiles...");
  await connection.execute(`
    INSERT INTO people (name, slug, title, company, bio, linkedIn, twitter, isVerified, statusId, createdAt, updatedAt) VALUES
    (
      'Ahmed Al-Rashid',
      'ahmed-al-rashid',
      'CEO & Co-Founder',
      'TechVentures MENA',
      'Serial entrepreneur with 15+ years of experience building technology companies in the Middle East. Founded three successful startups, including a fintech unicorn.',
      'https://linkedin.com/in/ahmedalrashid',
      'https://twitter.com/ahmedalrashid',
      true, ${publishedStatusId}, NOW(), NOW()
    ),
    (
      'Sara Hassan',
      'sara-hassan',
      'Managing Partner',
      'Vision Capital',
      'Leading venture capitalist focused on early-stage investments in MENA tech startups. Previously led investments at SoftBank Vision Fund.',
      'https://linkedin.com/in/sarahassan',
      'https://twitter.com/sarahassan',
      true, ${publishedStatusId}, NOW(), NOW()
    ),
    (
      'Mohammed Al-Faisal',
      'mohammed-al-faisal',
      'CTO',
      'CloudFirst Arabia',
      'Technology leader with expertise in cloud infrastructure and AI. Former engineering director at Google Cloud.',
      'https://linkedin.com/in/mohammedalfaisal',
      NULL,
      true, ${publishedStatusId}, NOW(), NOW()
    ),
    (
      'Fatima Al-Zahra',
      'fatima-al-zahra',
      'Founder & CEO',
      'EduTech Solutions',
      'Passionate about transforming education through technology. Built the largest online learning platform in the Arab world.',
      'https://linkedin.com/in/fatimaalzahra',
      'https://twitter.com/fatimaalzahra',
      true, ${publishedStatusId}, NOW(), NOW()
    ),
    (
      'Omar Khalil',
      'omar-khalil',
      'General Partner',
      'Emerging Markets Fund',
      'Investor and advisor to 50+ startups across MENA and Africa. Former McKinsey consultant.',
      'https://linkedin.com/in/omarkhalil',
      NULL,
      true, ${publishedStatusId}, NOW(), NOW()
    ),
    (
      'Layla Ibrahim',
      'layla-ibrahim',
      'VP of Engineering',
      'PayTech Global',
      'Engineering leader building scalable payment systems. 10+ years at Amazon and Stripe.',
      'https://linkedin.com/in/laylaibrahim',
      'https://twitter.com/laylaibrahim',
      true, ${publishedStatusId}, NOW(), NOW()
    ),
    (
      'Khalid Al-Mansour',
      'khalid-al-mansour',
      'Founder',
      'HealthAI Labs',
      'Healthcare entrepreneur using AI to improve diagnostics in underserved markets. Medical doctor turned tech founder.',
      'https://linkedin.com/in/khalidalmanour',
      NULL,
      true, ${publishedStatusId}, NOW(), NOW()
    ),
    (
      'Nadia Youssef',
      'nadia-youssef',
      'Chief Product Officer',
      'Careem (Uber)',
      'Product leader who helped scale Careem from startup to $3.1B acquisition. Expert in marketplace dynamics.',
      'https://linkedin.com/in/nadiayoussef',
      'https://twitter.com/nadiayoussef',
      true, ${publishedStatusId}, NOW(), NOW()
    ),
    (
      'Hassan Mahmoud',
      'hassan-mahmoud',
      'CEO',
      'LogiTech MENA',
      'Building the logistics infrastructure for MENA e-commerce. Previously founded and sold a last-mile delivery company.',
      'https://linkedin.com/in/hassanmahmoud',
      NULL,
      true, ${publishedStatusId}, NOW(), NOW()
    ),
    (
      'Reem Al-Qasim',
      'reem-al-qasim',
      'Investment Director',
      'Saudi Venture Capital',
      'Leading government-backed investments in Saudi tech ecosystem. Focused on deep tech and AI startups.',
      'https://linkedin.com/in/reemalqasim',
      'https://twitter.com/reemalqasim',
      true, ${publishedStatusId}, NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE name=name
  `);

  // ============================================================
  // EVENTS (10 events)
  // ============================================================
  console.log("📅 Creating events...");
  await connection.execute(`
    INSERT INTO events (title, slug, description, type, format, city, venue, startDate, endDate, registrationUrl, statusId, isFeatured, createdAt, updatedAt) VALUES
    (
      'Riyadh Tech Week 2026',
      'riyadh-tech-week-2026',
      'The largest technology conference in the Middle East, featuring keynotes from global tech leaders, startup competitions, and networking opportunities.',
      'conference',
      'in_person',
      'Riyadh, Saudi Arabia',
      'Riyadh International Convention Center',
      '2026-03-15 09:00:00',
      '2026-03-18 18:00:00',
      'https://riyadhtechweek.com/register',
      ${publishedStatusId}, true, NOW(), NOW()
    ),
    (
      'MENA Startup Summit',
      'mena-startup-summit-2026',
      'Annual gathering of founders, investors, and ecosystem builders from across the MENA region.',
      'conference',
      'in_person',
      'Dubai, UAE',
      'Dubai World Trade Centre',
      '2026-04-20 08:00:00',
      '2026-04-21 17:00:00',
      'https://menastartupsummit.com',
      ${publishedStatusId}, true, NOW(), NOW()
    ),
    (
      'AI in Finance Webinar Series',
      'ai-finance-webinar-series',
      'Monthly webinar exploring how AI is transforming financial services in emerging markets.',
      'webinar',
      'virtual',
      'Online',
      NULL,
      '2026-02-10 14:00:00',
      '2026-02-10 16:00:00',
      'https://aifinancewebinar.com',
      ${publishedStatusId}, false, NOW(), NOW()
    ),
    (
      'Founder Meetup: Cairo',
      'founder-meetup-cairo-feb',
      'Informal networking event for tech founders and aspiring entrepreneurs in Cairo.',
      'meetup',
      'in_person',
      'Cairo, Egypt',
      'Greek Campus',
      '2026-02-25 18:00:00',
      '2026-02-25 21:00:00',
      'https://foundermeetup.com/cairo',
      ${publishedStatusId}, false, NOW(), NOW()
    ),
    (
      'Women in Tech Leadership Forum',
      'women-tech-leadership-forum',
      'Celebrating and empowering women leaders in the MENA tech ecosystem.',
      'conference',
      'hybrid',
      'Abu Dhabi, UAE',
      'Abu Dhabi National Exhibition Centre',
      '2026-03-08 09:00:00',
      '2026-03-08 17:00:00',
      'https://womenintech.ae',
      ${publishedStatusId}, true, NOW(), NOW()
    ),
    (
      'Fintech Regulatory Workshop',
      'fintech-regulatory-workshop',
      'Deep dive into fintech regulations across GCC countries with regulators and legal experts.',
      'workshop',
      'in_person',
      'Manama, Bahrain',
      'Bahrain FinTech Bay',
      '2026-02-18 10:00:00',
      '2026-02-18 16:00:00',
      'https://fintechworkshop.bh',
      ${publishedStatusId}, false, NOW(), NOW()
    ),
    (
      'Startup Pitch Competition: Jeddah',
      'startup-pitch-jeddah',
      'Early-stage startups compete for $100K in funding and mentorship from top VCs.',
      'conference',
      'in_person',
      'Jeddah, Saudi Arabia',
      'King Abdullah Economic City',
      '2026-03-05 13:00:00',
      '2026-03-05 19:00:00',
      'https://pitchjeddah.com',
      ${publishedStatusId}, false, NOW(), NOW()
    ),
    (
      'Cloud Architecture Masterclass',
      'cloud-architecture-masterclass',
      'Hands-on workshop on building scalable cloud infrastructure for startups.',
      'workshop',
      'virtual',
      'Online',
      NULL,
      '2026-02-28 10:00:00',
      '2026-02-28 14:00:00',
      'https://cloudmasterclass.io',
      ${publishedStatusId}, false, NOW(), NOW()
    ),
    (
      'LEAP 2026',
      'leap-2026',
      'Saudi Arabia''s flagship technology event bringing together innovators, investors, and industry leaders.',
      'conference',
      'in_person',
      'Riyadh, Saudi Arabia',
      'Riyadh Front Exhibition Center',
      '2026-02-09 09:00:00',
      '2026-02-12 18:00:00',
      'https://onegiantleap.com',
      ${publishedStatusId}, true, NOW(), NOW()
    ),
    (
      'E-commerce Growth Strategies Summit',
      'ecommerce-growth-summit',
      'Learn from successful e-commerce founders about scaling in the MENA market.',
      'conference',
      'hybrid',
      'Dubai, UAE',
      'Dubai Internet City Amphitheatre',
      '2026-04-05 09:00:00',
      '2026-04-05 17:00:00',
      'https://ecommercesummit.ae',
      ${publishedStatusId}, false, NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE title=title
  `);

  // ============================================================
  // JOBS (10 jobs)
  // ============================================================
  console.log("💼 Creating jobs...");
  await connection.execute(`
    INSERT INTO jobs (title, slug, companyName, companyLogo, location, description, roleType, seniority, salaryMin, salaryMax, salaryCurrency, isRemote, applyUrl, statusId, expiresAt, createdAt, updatedAt) VALUES
    (
      'Senior Software Engineer',
      'senior-software-engineer-techventures',
      'TechVentures MENA',
      NULL,
      'Riyadh, Saudi Arabia',
      'We are looking for a Senior Software Engineer to join our core platform team. You will work on building scalable systems that power our fintech products serving millions of users.',
      'full_time',
      'senior',
      25000, 35000, 'SAR',
      false,
      'https://techventures.com/careers/senior-engineer',
      ${publishedStatusId},
      '2026-03-31 23:59:59',
      NOW(), NOW()
    ),
    (
      'Product Manager - Payments',
      'product-manager-payments-paytech',
      'PayTech Global',
      NULL,
      'Dubai, UAE',
      'Lead product strategy for our payment processing platform. Work closely with engineering and design to ship features that delight our merchants.',
      'full_time',
      'mid',
      30000, 45000, 'AED',
      false,
      'https://paytech.com/careers/pm-payments',
      ${publishedStatusId},
      '2026-03-15 23:59:59',
      NOW(), NOW()
    ),
    (
      'Machine Learning Engineer',
      'ml-engineer-healthai',
      'HealthAI Labs',
      NULL,
      'Cairo, Egypt',
      'Build ML models for medical image analysis. Help us improve healthcare diagnostics across emerging markets.',
      'full_time',
      'mid',
      50000, 80000, 'EGP',
      true,
      'https://healthai.com/careers/ml-engineer',
      ${publishedStatusId},
      '2026-04-30 23:59:59',
      NOW(), NOW()
    ),
    (
      'Head of Growth',
      'head-of-growth-edutech',
      'EduTech Solutions',
      NULL,
      'Amman, Jordan',
      'Drive user acquisition and retention for our online learning platform. Lead a team of marketers and growth hackers.',
      'full_time',
      'lead',
      3000, 5000, 'JOD',
      false,
      'https://edutech.jo/careers/head-growth',
      ${publishedStatusId},
      '2026-03-20 23:59:59',
      NOW(), NOW()
    ),
    (
      'UX Designer',
      'ux-designer-careem',
      'Careem (Uber)',
      NULL,
      'Dubai, UAE',
      'Design intuitive experiences for millions of users across the Middle East. Work on our super app ecosystem.',
      'full_time',
      'mid',
      25000, 35000, 'AED',
      false,
      'https://careem.com/careers/ux-designer',
      ${publishedStatusId},
      '2026-04-15 23:59:59',
      NOW(), NOW()
    ),
    (
      'DevOps Engineer',
      'devops-engineer-cloudfirst',
      'CloudFirst Arabia',
      NULL,
      'Riyadh, Saudi Arabia',
      'Build and maintain our cloud infrastructure. Experience with AWS, Kubernetes, and Terraform required.',
      'full_time',
      'senior',
      22000, 32000, 'SAR',
      true,
      'https://cloudfirst.sa/careers/devops',
      ${publishedStatusId},
      '2026-03-25 23:59:59',
      NOW(), NOW()
    ),
    (
      'Investment Analyst',
      'investment-analyst-vision-capital',
      'Vision Capital',
      NULL,
      'Abu Dhabi, UAE',
      'Evaluate startup investment opportunities across MENA. Support deal sourcing, due diligence, and portfolio management.',
      'full_time',
      'entry',
      18000, 25000, 'AED',
      false,
      'https://visioncapital.ae/careers/analyst',
      ${publishedStatusId},
      '2026-02-28 23:59:59',
      NOW(), NOW()
    ),
    (
      'Backend Developer (Node.js)',
      'backend-developer-logitech',
      'LogiTech MENA',
      NULL,
      'Remote - MENA',
      'Build APIs and microservices for our logistics platform. Strong Node.js and PostgreSQL experience required.',
      'full_time',
      'mid',
      4000, 6000, 'USD',
      true,
      'https://logitech-mena.com/careers/backend',
      ${publishedStatusId},
      '2026-04-10 23:59:59',
      NOW(), NOW()
    ),
    (
      'Content Marketing Manager',
      'content-marketing-manager-techscoop',
      'TechScoop',
      NULL,
      'Dubai, UAE',
      'Lead content strategy for the leading tech news platform in MENA. Create engaging content that resonates with our audience.',
      'full_time',
      'mid',
      20000, 28000, 'AED',
      false,
      'https://techscoop.com/careers/content-manager',
      ${publishedStatusId},
      '2026-03-31 23:59:59',
      NOW(), NOW()
    ),
    (
      'Data Scientist Intern',
      'data-scientist-intern-svc',
      'Saudi Venture Capital',
      NULL,
      'Riyadh, Saudi Arabia',
      'Summer internship analyzing startup data and market trends. Great opportunity to learn about venture capital.',
      'internship',
      'entry',
      5000, 7000, 'SAR',
      false,
      'https://svc.com.sa/careers/intern-ds',
      ${publishedStatusId},
      '2026-02-15 23:59:59',
      NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE title=title
  `);

  // ============================================================
  // ACCELERATORS (5 accelerators)
  // ============================================================
  console.log("🚀 Creating accelerators...");
  await connection.execute(`
    INSERT INTO accelerators (name, slug, description, location, programLength, funding, equity, status, applicationUrl, createdAt, updatedAt) VALUES
    (
      'Flat6Labs',
      'flat6labs',
      'The leading seed and early-stage venture capital firm in MENA, with programs across the region.',
      'Cairo, Egypt',
      '4 months',
      '$50K - $100K',
      '10-15%',
      'active',
      'https://flat6labs.com/apply',
      NOW(), NOW()
    ),
    (
      'Techstars Dubai',
      'techstars-dubai',
      'Global accelerator program with a dedicated MENA cohort, providing funding, mentorship, and global network access.',
      'Dubai, UAE',
      '3 months',
      '$120K',
      '6%',
      'upcoming',
      'https://techstars.com/dubai',
      NOW(), NOW()
    ),
    (
      'KAUST Innovation',
      'kaust-innovation',
      'Deep tech accelerator focused on research-driven startups in energy, health, and sustainability.',
      'Thuwal, Saudi Arabia',
      '6 months',
      'Up to $500K',
      'Varies',
      'active',
      'https://innovation.kaust.edu.sa',
      NOW(), NOW()
    ),
    (
      'Hub71',
      'hub71',
      'Abu Dhabi''s global tech ecosystem offering incentive programs for startups at all stages.',
      'Abu Dhabi, UAE',
      '12 months',
      'Up to $100K in credits',
      '0%',
      'active',
      'https://hub71.com/apply',
      NOW(), NOW()
    ),
    (
      'Misk Accelerator',
      'misk-accelerator',
      'Saudi Arabia''s premier accelerator for youth-led startups, backed by the Misk Foundation.',
      'Riyadh, Saudi Arabia',
      '4 months',
      '$150K',
      '8%',
      'upcoming',
      'https://misk.org.sa/accelerator',
      NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE name=name
  `);

  console.log("\n✅ Database seeded successfully!");
  console.log("   - Categories: 10");
  console.log("   - Regions: 8");
  console.log("   - Sectors: 8");
  console.log("   - Workflow Statuses: 7");
  console.log("   - Articles: 7");
  console.log("   - People: 10");
  console.log("   - Events: 10");
  console.log("   - Jobs: 10");
  console.log("   - Accelerators: 5");

  await connection.end();
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
