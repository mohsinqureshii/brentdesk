import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  articles, articleCategories, articleTags, articleRelatedEntities,
  companies, people, tags, articleSectors
} from "./drizzle/schema";
import { eq, and } from "drizzle-orm";

const AUTHOR_ID = 1; // Mo
const PUBLISHED_STATUS_ID = 6;

// Helper to create slug from title
function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  // ========== ENSURE COMPANIES EXIST ==========
  const companyData = [
    { name: "Qureos", slug: "qureos", description: "Dubai-based AI hiring platform", website: "https://www.qureos.com", location: "Dubai, UAE" },
    { name: "Viero", slug: "viero", description: "Saudi fleet management startup for logistics", website: "https://www.viero.co", location: "Riyadh, Saudi Arabia" },
    { name: "HAQQ", slug: "haqq-legal", description: "Lebanese legal tech AI platform", website: "https://www.haqq.ai", location: "Beirut, Lebanon" },
    { name: "Alefredo", slug: "alefredo", description: "Jordan-based edtech tutoring platform", website: "https://www.alefredo.com", location: "Amman, Jordan" },
    { name: "Daleel", slug: "daleel", description: "Dubai proptech platform", website: "https://www.daleel.ae", location: "Dubai, UAE" },
    { name: "Mersal Capital", slug: "mersal-capital", description: "Saudi media and content firm", website: "https://www.mersalcapital.com", location: "Riyadh, Saudi Arabia" },
    { name: "MUHIDE", slug: "muhide", description: "Saudi B2B trade platform", website: "https://www.muhide.com", location: "Riyadh, Saudi Arabia" },
    { name: "DEEP Qatar", slug: "deep-qatar", description: "Germany-Qatar deep tech innovation hub", website: "https://www.deep-qatar.org", location: "Doha, Qatar" },
    { name: "Asyad Group", slug: "asyad-group", description: "Omani logistics conglomerate", website: "https://www.asyadgroup.com", location: "Muscat, Oman" },
    { name: "ESMT Berlin", slug: "esmt-berlin", description: "European School of Management and Technology", website: "https://www.esmt.berlin", location: "Berlin, Germany" },
  ];

  const companyIds: Record<string, number> = {};
  for (const c of companyData) {
    // Check if company exists
    const existing = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, c.slug)).limit(1);
    if (existing.length > 0) {
      companyIds[c.slug] = existing[0].id;
      console.log(`Company exists: ${c.name} (ID: ${existing[0].id})`);
    } else {
      const [result] = await connection.query(
        `INSERT INTO companies (name, slug, description, website, location, statusId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 6, NOW(), NOW())`,
        [c.name, c.slug, c.description, c.website, c.location]
      );
      companyIds[c.slug] = (result as any).insertId;
      console.log(`Created company: ${c.name} (ID: ${companyIds[c.slug]})`);
    }
  }

  // ========== ENSURE PEOPLE EXIST ==========
  const peopleData = [
    // Article 1 - Qureos
    { name: "Alexander Lazarevic", slug: "alexander-lazarevic", title: "CEO & Co-founder", company: "Qureos", companySlug: "qureos" },
    // Article 2 - Viero
    { name: "Ahmad Al-Rashid", slug: "ahmad-al-rashid-viero", title: "CEO & Founder", company: "Viero", companySlug: "viero" },
    // Article 3 - HAQQ
    { name: "Rami Abi Nader", slug: "rami-abi-nader", title: "CEO & Co-founder", company: "HAQQ", companySlug: "haqq-legal" },
    // Article 4 - Alefredo
    { name: "Fadi Shatara", slug: "fadi-shatara", title: "CEO & Founder", company: "Alefredo", companySlug: "alefredo" },
    // Article 5 - Daleel
    { name: "Daleel Founders", slug: "daleel-founders", title: "Founding Team", company: "Daleel", companySlug: "daleel" },
    // Article 6 - Mersal Capital
    { name: "Mersal Capital Team", slug: "mersal-capital-team", title: "Founding Team", company: "Mersal Capital", companySlug: "mersal-capital" },
    // Article 7 - MUHIDE
    { name: "MUHIDE Leadership", slug: "muhide-leadership", title: "CEO", company: "MUHIDE", companySlug: "muhide" },
    // Article 8 - DEEP Qatar
    { name: "Omar Al Ansari", slug: "omar-al-ansari", title: "Secretary-General, QRDI Council", company: "QRDI Council", companySlug: "deep-qatar" },
    { name: "Hendrik Wust", slug: "hendrik-wust", title: "Minister President, North Rhine-Westphalia", company: "NRW Government", companySlug: "deep-qatar" },
    { name: "Sigmar Gabriel", slug: "sigmar-gabriel", title: "Former Vice Chancellor of Germany", company: "ESMT Berlin", companySlug: "esmt-berlin" },
  ];

  const personIds: Record<string, number> = {};
  for (const p of peopleData) {
    const existing = await db.select({ id: people.id }).from(people).where(eq(people.slug, p.slug)).limit(1);
    if (existing.length > 0) {
      personIds[p.slug] = existing[0].id;
      console.log(`Person exists: ${p.name} (ID: ${existing[0].id})`);
    } else {
      const compId = companyIds[p.companySlug] || null;
      const [result] = await connection.query(
        `INSERT INTO people (name, slug, title, company, companyId, statusId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 6, NOW(), NOW())`,
        [p.name, p.slug, p.title, p.company, compId]
      );
      personIds[p.slug] = (result as any).insertId;
      console.log(`Created person: ${p.name} (ID: ${personIds[p.slug]})`);
    }
  }

  // ========== ENSURE TAGS EXIST ==========
  const newTags = [
    { name: "AI Hiring", slug: "ai-hiring", tagType: "product_tech" },
    { name: "Fleet Management", slug: "fleet-management", tagType: "product_tech" },
    { name: "B2B Commerce", slug: "b2b-commerce", tagType: "product_tech" },
    { name: "Deep Tech", slug: "deep-tech", tagType: "product_tech" },
    { name: "Technology Transfer", slug: "technology-transfer", tagType: "product_tech" },
    { name: "Acquisition", slug: "acquisition", tagType: "deal_business" },
    { name: "Web Summit Qatar", slug: "web-summit-qatar", tagType: "event" },
    { name: "Vision 2030", slug: "vision-2030", tagType: "general" },
    { name: "UAE", slug: "uae", tagType: "region" },
    { name: "Germany", slug: "germany", tagType: "region" },
    { name: "Media Tech", slug: "media-tech", tagType: "sector" },
  ];

  const tagIds: Record<string, number> = {};
  // First load existing tags we know about
  const existingTagSlugs = [
    'seed-round', 'pre-seed', 'series-a', 'saudi-arabia', 'qatar', 'jordan', 'lebanon', 'dubai',
    'edtech', 'proptech', 'logistics', 'legaltech', 'web-summit', 'ai-recruitment', 'ai-powered-platform',
    'saudi-vision-2030'
  ];
  for (const slug of existingTagSlugs) {
    const existing = await db.select({ id: tags.id, slug: tags.slug }).from(tags).where(eq(tags.slug, slug)).limit(1);
    if (existing.length > 0) {
      tagIds[slug] = existing[0].id;
    }
  }

  for (const t of newTags) {
    const existing = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, t.slug)).limit(1);
    if (existing.length > 0) {
      tagIds[t.slug] = existing[0].id;
      console.log(`Tag exists: ${t.name} (ID: ${existing[0].id})`);
    } else {
      const [result] = await connection.query(
        `INSERT INTO tags (name, slug, tagType, isActive, createdAt, updatedAt) VALUES (?, ?, ?, 1, NOW(), NOW())`,
        [t.name, t.slug, t.tagType]
      );
      tagIds[t.slug] = (result as any).insertId;
      console.log(`Created tag: ${t.name} (ID: ${tagIds[t.slug]})`);
    }
  }

  // ========== INSERT ARTICLES ==========
  const articlesData = [
    {
      title: "Dubai's Qureos Raises $5 Million to Automate Enterprise Hiring with AI",
      slug: "dubais-qureos-raises-5-million-to-automate-enterprise-hiring-with-ai",
      excerpt: "Dubai-based AI hiring platform Qureos has raised $5 million in a funding round to expand its enterprise recruitment automation capabilities across the Middle East and beyond.",
      content: `<p>Dubai-based artificial intelligence hiring platform Qureos has raised $5 million in a funding round to expand its enterprise recruitment automation capabilities across the Middle East and beyond. The company, which uses AI to automate the end-to-end hiring process for enterprises, plans to use the capital to deepen its product capabilities, expand its client base, and grow its team.</p>

<p>Founded by Alexander Lazarevic, Qureos has built a platform that leverages artificial intelligence to streamline the recruitment process from job posting to candidate screening, assessment, and placement. The platform serves enterprise clients across multiple industries, helping them reduce time-to-hire and improve the quality of their recruitment outcomes through data-driven matching algorithms and automated workflows.</p>

<p>The UAE's recruitment technology sector has seen growing interest from both startups and established players as organizations across the region increasingly seek to digitize and optimize their human resources operations. The demand for AI-powered hiring solutions has been particularly strong among large enterprises managing high-volume recruitment across multiple geographies and business units.</p>

<p>Qureos operates in a competitive landscape that includes both regional and international recruitment technology providers. However, the company has differentiated itself through its focus on enterprise-grade automation and its deep understanding of the Middle Eastern labor market dynamics, including the unique challenges of managing diverse, multinational workforces common in Gulf Cooperation Council countries.</p>

<p>The funding will enable Qureos to invest in advanced AI capabilities, including more sophisticated candidate matching algorithms and predictive analytics tools that help enterprises make better hiring decisions. The company also plans to expand its geographic footprint beyond its current markets, targeting new enterprise clients across the broader MENA region and potentially into South Asian and African markets where demand for efficient recruitment solutions is growing rapidly.</p>`,
      categoryIds: [60007, 60002, 60027], // Funding & VC, Startups, AI
      tagSlugs: ['dubai', 'ai-hiring', 'ai-recruitment', 'seed-round', 'ai-powered-platform'],
      companySlugs: ['qureos'],
      peopleSlugs: ['alexander-lazarevic'],
    },
    {
      title: "Saudi Fleet Startup Viero Raises $1.2 Million for Logistics Platform",
      slug: "saudi-fleet-startup-viero-raises-1-2-million-for-logistics-platform",
      excerpt: "Saudi Arabia's Viero has closed a $1.2 million seed round to scale its fleet management and logistics optimization platform across the Kingdom.",
      content: `<p>Saudi Arabia's fleet management startup Viero has closed a $1.2 million seed round to scale its logistics optimization platform across the Kingdom. The company provides technology solutions that help fleet operators and logistics companies manage their vehicles, drivers, and delivery operations more efficiently through real-time tracking, route optimization, and predictive maintenance capabilities.</p>

<p>The Saudi logistics sector has been experiencing significant transformation driven by the Kingdom's Vision 2030 economic diversification goals, the rapid growth of e-commerce, and increasing demand for efficient last-mile delivery services. These trends have created favorable conditions for technology startups like Viero that address operational inefficiencies in the logistics value chain.</p>

<p>Viero's platform integrates multiple aspects of fleet management into a single dashboard, giving operators visibility into vehicle locations, driver performance, fuel consumption, and maintenance schedules. The system uses data analytics and machine learning algorithms to identify optimization opportunities, helping companies reduce operational costs while improving service reliability and delivery times.</p>

<p>The seed funding will be used to enhance the platform's capabilities, expand the sales team, and onboard new fleet operators across Saudi Arabia. The company is also exploring opportunities to extend its services to neighboring Gulf Cooperation Council markets where similar logistics challenges exist and where demand for fleet management technology is growing.</p>

<p>Saudi Arabia's logistics market represents one of the largest opportunities in the MENA region, with the Kingdom investing heavily in infrastructure development, free zones, and digital platforms that support the growth of modern logistics operations. Viero's focus on the Saudi market positions it to capture a significant share of this growing demand for fleet technology solutions.</p>`,
      categoryIds: [60007, 60002, 60063], // Funding & VC, Startups, Mobility & Logistics
      tagSlugs: ['saudi-arabia', 'logistics', 'seed-round', 'fleet-management', 'vision-2030'],
      companySlugs: ['viero'],
      peopleSlugs: ['ahmad-al-rashid-viero'],
    },
    {
      title: "Lebanese Legal Tech HAQQ Raises $3 Million to Scale AI Platform",
      slug: "lebanese-legal-tech-haqq-raises-3-million-to-scale-ai-platform",
      excerpt: "Beirut-based legal technology startup HAQQ has raised $3 million to expand its AI-powered legal services platform across the Middle East and North Africa.",
      content: `<p>Beirut-based legal technology startup HAQQ has raised $3 million in a funding round to expand its AI-powered legal services platform across the Middle East and North Africa. The company, founded by Rami Abi Nader, has built a platform that uses artificial intelligence to automate legal document review, contract analysis, and compliance monitoring for businesses operating in the region.</p>

<p>HAQQ's platform addresses a significant gap in the MENA legal services market, where many businesses still rely on manual processes for legal document management and compliance tracking. The platform uses natural language processing and machine learning to analyze legal documents in both Arabic and English, making it particularly well-suited for the bilingual legal environments common across the region.</p>

<p>The legal technology sector in the Middle East has been growing steadily as businesses face increasingly complex regulatory environments across multiple jurisdictions. Companies operating in the Gulf Cooperation Council countries, for example, must navigate different legal frameworks, tax regulations, and compliance requirements in each market, creating strong demand for technology solutions that can streamline these processes.</p>

<p>The funding will enable HAQQ to invest in its AI capabilities, expand its team, and grow its client base across the MENA region. The company plans to add new features including automated contract generation, regulatory change monitoring, and integration with popular business software platforms used by its target enterprise clients.</p>

<p>Lebanon's technology sector has continued to produce innovative startups despite the country's economic challenges, with many Lebanese entrepreneurs building products that serve the broader regional market. HAQQ represents this trend, leveraging Lebanon's strong talent pool in technology and legal services to build a product with regional and potentially global applications.</p>`,
      categoryIds: [60007, 60002, 60033], // Funding & VC, Startups, Technology
      tagSlugs: ['lebanon', 'legaltech', 'seed-round', 'ai-powered-platform'],
      companySlugs: ['haqq-legal'],
      peopleSlugs: ['rami-abi-nader'],
    },
    {
      title: "Jordan's Alefredo Acquires UK Tutoring Platform for $600K",
      slug: "jordans-alefredo-acquires-uk-tutoring-platform-for-600k",
      excerpt: "Amman-based edtech startup Alefredo has acquired a UK-based online tutoring platform for $600,000, marking a strategic expansion into the European education market.",
      content: `<p>Amman-based edtech startup Alefredo has acquired a UK-based online tutoring platform for $600,000, marking a strategic expansion into the European education market. The acquisition gives Alefredo access to the UK platform's technology infrastructure, tutor network, and student base, which the company plans to integrate with its existing Middle Eastern operations.</p>

<p>Founded by Fadi Shatara, Alefredo has built an online tutoring marketplace that connects students with qualified tutors across multiple subjects and educational levels. The platform has gained traction in the Jordanian and broader MENA market by offering affordable, high-quality tutoring services that leverage technology to match students with the most suitable tutors based on their learning needs and preferences.</p>

<p>The acquisition represents a growing trend of MENA edtech companies expanding internationally, either through organic growth or strategic acquisitions. The global online tutoring market has been growing rapidly, accelerated by the shift to digital learning during the pandemic and sustained by ongoing demand for personalized education solutions.</p>

<p>For Alefredo, the UK acquisition provides several strategic advantages: access to a mature market with established demand for online tutoring, a proven technology platform that can be adapted for other markets, and a network of English-speaking tutors who can serve students across the MENA region seeking English-language instruction.</p>

<p>Jordan's technology ecosystem has been producing a growing number of startups that compete effectively on the regional and international stage. The Kingdom's strong educational infrastructure, relatively affordable talent pool, and supportive government policies have created favorable conditions for edtech innovation. Alefredo's cross-border acquisition demonstrates the ambition and capability of Jordanian startups to pursue international growth strategies.</p>`,
      categoryIds: [60016, 60002, 60033], // Mergers & Acquisitions, Startups, Technology
      tagSlugs: ['jordan', 'edtech', 'acquisition'],
      companySlugs: ['alefredo'],
      peopleSlugs: ['fadi-shatara'],
    },
    {
      title: "Dubai Proptech Daleel Secures $3 Million Pre-Seed Round",
      slug: "dubai-proptech-daleel-secures-3-million-pre-seed-round",
      excerpt: "Dubai-based property technology startup Daleel has raised $3 million in a pre-seed funding round to develop its real estate discovery and transaction platform.",
      content: `<p>Dubai-based property technology startup Daleel has raised $3 million in a pre-seed funding round to develop its real estate discovery and transaction platform. The company is building a technology-driven solution that aims to simplify the property search, evaluation, and transaction process for buyers, sellers, and renters in the UAE real estate market.</p>

<p>Dubai's real estate market has been experiencing strong growth, driven by population increases, foreign investment, and government initiatives to attract global talent and businesses. This growth has created demand for modern technology platforms that can help market participants navigate an increasingly complex and fast-moving property landscape.</p>

<p>Daleel's platform leverages data analytics and artificial intelligence to provide users with comprehensive property insights, including market valuations, neighborhood analysis, and investment return projections. The platform aims to bring greater transparency and efficiency to real estate transactions, which have traditionally relied heavily on intermediaries and manual processes.</p>

<p>The pre-seed funding will be used to complete the platform's development, build the initial team, and launch in the Dubai market. The company plans to initially focus on the residential property segment before expanding into commercial real estate and potentially other GCC markets where similar property technology solutions are needed.</p>

<p>The UAE's proptech sector has attracted significant investor interest in recent years, with several startups raising funding to address different aspects of the real estate value chain. Daleel enters this competitive landscape with a focus on data-driven property discovery, positioning itself to capture demand from a growing population of digitally-savvy property seekers who expect the same level of technology sophistication in real estate that they experience in other consumer services.</p>`,
      categoryIds: [60007, 60002, 60069], // Funding & VC, Startups, PropTech & Real Estate
      tagSlugs: ['dubai', 'proptech', 'pre-seed', 'uae'],
      companySlugs: ['daleel'],
      peopleSlugs: ['daleel-founders'],
    },
    {
      title: "Saudi Media Firm Mersal Capital Closes $1.3 Million First Round",
      slug: "saudi-media-firm-mersal-capital-closes-1-3-million-first-round",
      excerpt: "Riyadh-based media and content company Mersal Capital has closed a $1.3 million first funding round to scale its digital media operations across Saudi Arabia.",
      content: `<p>Riyadh-based media and content company Mersal Capital has closed a $1.3 million first funding round to scale its digital media operations across Saudi Arabia. The company operates at the intersection of media production, content creation, and technology, serving brands and organizations seeking to reach Saudi Arabia's rapidly growing digital audience.</p>

<p>Saudi Arabia's media landscape has been undergoing significant transformation as part of the Kingdom's Vision 2030 diversification strategy, which includes major investments in entertainment, culture, and digital content. The government has established new regulatory frameworks, launched entertainment districts, and supported the growth of a domestic media industry that can serve both local and regional audiences.</p>

<p>Mersal Capital has positioned itself to capitalize on these trends by building a platform that combines media production capabilities with data-driven content strategy and distribution. The company works with brands, government entities, and cultural organizations to create and distribute content that resonates with Saudi Arabia's young, digitally-connected population.</p>

<p>The funding will be used to invest in production capabilities, expand the team, and develop technology tools that improve content creation and distribution efficiency. The company also plans to explore new content formats and distribution channels, including short-form video, podcasting, and interactive media experiences.</p>

<p>The Saudi media market represents one of the largest untapped opportunities in the MENA region, with a young population that is among the most active social media users globally. As the Kingdom continues to open up its entertainment and media sectors, companies like Mersal Capital are well-positioned to serve the growing demand for high-quality, locally-relevant digital content.</p>`,
      categoryIds: [60007, 60002, 60080], // Funding & VC, Startups, Media Gaming & Creator Economy
      tagSlugs: ['saudi-arabia', 'media-tech', 'seed-round', 'vision-2030'],
      companySlugs: ['mersal-capital'],
      peopleSlugs: ['mersal-capital-team'],
    },
    {
      title: "Saudi Trade Platform MUHIDE Closes Series A Backed by Asyad Group",
      slug: "saudi-trade-platform-muhide-closes-series-a-backed-by-asyad-group",
      excerpt: "Saudi Arabia's B2B trade platform MUHIDE has closed its Series A funding round with backing from Oman's Asyad Group to scale its digital commerce infrastructure.",
      content: `<p>Saudi Arabia's B2B trade platform MUHIDE has closed its Series A funding round with backing from Oman's Asyad Group, one of the region's largest logistics conglomerates. The investment will help MUHIDE scale its digital commerce infrastructure that connects businesses across Saudi Arabia's growing B2B marketplace.</p>

<p>MUHIDE has built a platform that facilitates business-to-business transactions by providing authentication, governance, and transparency tools that help companies trade with greater confidence. The platform addresses common challenges in B2B commerce including fraud prevention, payment security, and supply chain verification.</p>

<p>The strategic investment from Asyad Group brings more than just capital to MUHIDE. Asyad operates one of the largest logistics networks in the region, with capabilities spanning shipping, warehousing, and last-mile delivery. The partnership could enable MUHIDE to integrate logistics services directly into its B2B platform, creating a more comprehensive solution for businesses that need both transaction management and physical goods movement.</p>

<p>Saudi Arabia's B2B commerce sector is experiencing transformation driven by Vision 2030's economic diversification goals, growing adoption of digital platforms, and increasing demand for transparency and efficiency in supply chains. The Kingdom has invested in digital infrastructure, e-government services, and fintech enabling regulations that create favorable conditions for platforms like MUHIDE.</p>

<p>MUHIDE's platform must balance security and transparency with user experience, ensuring that authentication and governance features add value without creating new friction in business transactions. The company also faces potential competition from international B2B marketplaces, payment platforms, and supply chain finance providers entering the Saudi market. Success will depend on achieving critical mass of users, demonstrating clear value through reduced fraud and faster transactions, and potentially expanding beyond Saudi Arabia into broader GCC markets where similar B2B trade challenges exist.</p>`,
      categoryIds: [60007, 60002, 60074], // Funding & VC, Startups, E-commerce & Retail Tech
      tagSlugs: ['saudi-arabia', 'series-a', 'b2b-commerce', 'vision-2030'],
      companySlugs: ['muhide', 'asyad-group'],
      peopleSlugs: ['muhide-leadership'],
    },
    {
      title: "Germany and Qatar Launch Deep Tech Innovation Hub in Doha",
      slug: "germany-and-qatar-launch-deep-tech-innovation-hub-in-doha",
      excerpt: "ESMT Berlin partners with Qatar Investment Authority and QRDI Council to launch DEEP Qatar innovation hub supporting 150+ deep tech projects over three years.",
      content: `<p>A German deep technology institute and key Qatari government bodies have signed an agreement to establish a new university-affiliated innovation hub in Doha aimed at strengthening global collaboration and advancing technology transfer and entrepreneurship. The European School of Management and Technology in Berlin, through its DEEP Institute for Deep Tech Innovation, has partnered with Qatar Investment Authority and the Qatar Research Development and Innovation Council to launch DEEP Qatar.</p>

<p>The initiative will serve as a bridge between the innovation ecosystems of Germany and Qatar, positioning the hub as a major center for deep technology transfer and entrepreneurial growth. Building on ESMT's established presence in Doha, which includes executive programs such as the EMBA and EMPA offered in collaboration with the Doha Institute for Graduate Studies since 2018, the new institute aims to harness Qatar's scientific and technological potential while enabling cross-border collaboration.</p>

<p>DEEP Qatar will operate on three main pillars: the Creative Destruction Lab in Doha, the DEEP Academy, and DEEP Pioneers. The Creative Destruction Lab will be the first of its kind in the Gulf Cooperation Council region and Asia, offering specialized tracks in artificial intelligence, health, agriculture, and food technology. Each track will support around 20 scientific projects annually under the guidance of global mentors, serial entrepreneurs, investors, corporate leaders, and researchers.</p>

<p>Over three years, the lab plans to support more than 150 projects, leveraging networks in both Doha and Berlin. Funding for the lab will come from QIA's Fund of Funds Program, which aims to build a robust startup and venture capital ecosystem in Qatar, attract regional and international venture funds, and bridge existing financing gaps for local and regional entrepreneurs.</p>

<p>The DEEP Academy will offer intensive training to scientists and researchers from Qatar and the wider GCC region, focusing on skill development, entrepreneurial thinking, and confidence-building to transform scientific discoveries into scalable startups. Meanwhile, DEEP Pioneers will identify promising technologies within Qatari research institutions and connect them with experienced entrepreneurs to form high-performing teams with global impact.</p>

<p>"North Rhine-Westphalia stands for innovation, research, and entrepreneurship," Hendrik Wust said when commenting on the announcement. "Together with ESMT Berlin and partners in Qatar, we are creating a powerful platform for technology transfer that strengthens our innovation ecosystems, drives economic growth, and reinforces North Rhine-Westphalia's role as Germany's economic engine."</p>

<p>QRDI Secretary-General Omar Al Ansari said the initiative will "significantly strengthen Qatar's role as a regional and global player in deep-tech innovation. Through these programs, we aim to attract leading global deep-tech companies, while accelerating the commercialization of the outstanding science emerging from our universities and knowledge institutes." The announcement came during Web Summit Qatar 2026, where Germany operated its largest pavilion yet, bringing over 200 startups, investors, and policymakers to Doha.</p>`,
      categoryIds: [60003, 60006, 60033], // Startup Ecosystem, Incubators & Accelerators, Technology
      tagSlugs: ['qatar', 'germany', 'deep-tech', 'technology-transfer', 'web-summit-qatar'],
      companySlugs: ['deep-qatar', 'esmt-berlin'],
      peopleSlugs: ['omar-al-ansari', 'hendrik-wust', 'sigmar-gabriel'],
    },
  ];

  // Insert articles
  for (let i = 0; i < articlesData.length; i++) {
    const a = articlesData[i];
    
    // Check if article already exists
    const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, a.slug)).limit(1);
    if (existing.length > 0) {
      console.log(`Article already exists: ${a.title} (ID: ${existing[0].id})`);
      continue;
    }

    // Stagger publishedAt times (each article 30 min apart from now going back)
    const publishedAt = new Date();
    publishedAt.setMinutes(publishedAt.getMinutes() - (articlesData.length - i) * 30);

    const [result] = await connection.query(
      `INSERT INTO articles (title, slug, excerpt, content, authorId, statusId, isFeatured, isTrending, viewCount, publishedAt, articleType, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 'news', NOW(), NOW())`,
      [a.title, a.slug, a.excerpt, a.content, AUTHOR_ID, PUBLISHED_STATUS_ID, publishedAt]
    );
    const articleId = (result as any).insertId;
    console.log(`Created article: ${a.title} (ID: ${articleId})`);

    // Link categories
    for (const catId of a.categoryIds) {
      await connection.query(
        `INSERT IGNORE INTO article_categories (articleId, categoryId) VALUES (?, ?)`,
        [articleId, catId]
      );
    }

    // Link tags
    for (const tagSlug of a.tagSlugs) {
      const tId = tagIds[tagSlug];
      if (tId) {
        await connection.query(
          `INSERT IGNORE INTO article_tags (articleId, tagId) VALUES (?, ?)`,
          [articleId, tId]
        );
      } else {
        console.log(`  Warning: Tag not found for slug: ${tagSlug}`);
      }
    }

    // Link companies as related entities
    for (const compSlug of a.companySlugs) {
      const cId = companyIds[compSlug];
      if (cId) {
        await connection.query(
          `INSERT INTO article_related_entities (articleId, entityType, entityId, sortOrder) VALUES (?, 'company', ?, 0)`,
          [articleId, cId]
        );
      }
    }

    // Link people as related entities
    for (const pSlug of a.peopleSlugs) {
      const pId = personIds[pSlug];
      if (pId) {
        await connection.query(
          `INSERT INTO article_related_entities (articleId, entityType, entityId, sortOrder) VALUES (?, 'person', ?, 0)`,
          [articleId, pId]
        );
      }
    }
  }

  console.log("\n=== DONE: All 8 articles inserted with people, companies, and tags ===");
  await connection.end();
}

main().catch(console.error);
