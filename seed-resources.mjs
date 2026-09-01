/**
 * Seed script for Resources data
 * Run with: node seed-resources.mjs
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Parse the DATABASE_URL
const url = new URL(DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
});

console.log('Connected to database');

// Get published status ID
const [statuses] = await connection.execute(
  "SELECT id FROM workflow_statuses WHERE slug = 'published' LIMIT 1"
);
const publishedStatusId = statuses[0]?.id || 1;
console.log('Published status ID:', publishedStatusId);

// Resources data - Perks
const perks = [
  {
    title: "AWS Activate Credits",
    slug: "aws-activate-credits",
    shortDescription: "Up to $100,000 in AWS credits for startups",
    description: "AWS Activate provides startups with the resources they need to get started on AWS. Eligible startups can receive up to $100,000 in AWS credits, technical support, and training.",
    type: "perk",
    provider: "Amazon Web Services",
    providerLogo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
    providerWebsite: "https://aws.amazon.com/activate/",
    value: "$100,000",
    eligibility: "Verified startups with less than $10M in funding",
    isFeatured: true,
  },
  {
    title: "Google Cloud Credits",
    slug: "google-cloud-credits",
    shortDescription: "Up to $200,000 in cloud credits over 2 years",
    description: "Google for Startups Cloud Program provides eligible startups with up to $200,000 in cloud credits over 2 years, plus access to Google's technical support and startup network.",
    type: "perk",
    provider: "Google Cloud",
    providerLogo: "https://www.gstatic.com/devrel-devsite/prod/v0e0f589edd85502a40d78d7d0825db8ea5ef3b99ab4070381ee86977c9168730/cloud/images/cloud-logo.svg",
    providerWebsite: "https://cloud.google.com/startup",
    value: "$200,000",
    eligibility: "Series A or earlier startups",
    isFeatured: true,
  },
  {
    title: "Notion for Startups",
    slug: "notion-for-startups",
    shortDescription: "Free Plus plan with unlimited blocks for 6 months",
    description: "Get 6 months of Notion Plus for free, including unlimited blocks, file uploads, and version history. Perfect for early-stage teams building their knowledge base.",
    type: "perk",
    provider: "Notion",
    providerLogo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
    providerWebsite: "https://www.notion.so/startups",
    value: "6 Months Free",
    eligibility: "All startups",
    isFeatured: true,
  },
  {
    title: "HubSpot for Startups",
    slug: "hubspot-for-startups",
    shortDescription: "90% off HubSpot software in year one",
    description: "HubSpot for Startups offers 90% off in year one, 50% off in year two, and 25% off ongoing. Access CRM, marketing, sales, and service tools.",
    type: "perk",
    provider: "HubSpot",
    providerLogo: "https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png",
    providerWebsite: "https://www.hubspot.com/startups",
    value: "90% OFF",
    eligibility: "Seed-stage startups with less than $2M in funding",
    isFeatured: true,
  },
  {
    title: "Stripe Atlas Discount",
    slug: "stripe-atlas-discount",
    shortDescription: "Waived setup fees for MENA founders",
    description: "Stripe Atlas helps you incorporate your company in the US, set up a bank account, and start accepting payments. MENA founders get waived setup fees.",
    type: "perk",
    provider: "Stripe",
    providerLogo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
    providerWebsite: "https://stripe.com/atlas",
    value: "$500 OFF",
    eligibility: "MENA-based founders",
    isFeatured: false,
  },
  {
    title: "Intercom Early Stage",
    slug: "intercom-early-stage",
    shortDescription: "95% discount on Intercom for early-stage startups",
    description: "Intercom's Early Stage program offers 95% off for the first year, helping startups build better customer relationships with live chat, bots, and product tours.",
    type: "perk",
    provider: "Intercom",
    providerLogo: "https://static.intercomassets.com/assets/default-avatars/fin/128-6e30d5972a45d394f4a5ee20c8f37f0c6a6a4be0e99ae2b6f7b4c7b7d1b27f6a.png",
    providerWebsite: "https://www.intercom.com/early-stage",
    value: "95% OFF",
    eligibility: "Startups with less than $1M in funding",
    isFeatured: false,
  },
  {
    title: "Deel Startup Credits",
    slug: "deel-startup-credits",
    shortDescription: "$2,500 in credits for global hiring",
    description: "Deel helps startups hire and pay contractors and employees worldwide. Get $2,500 in credits to start building your global team.",
    type: "perk",
    provider: "Deel",
    providerLogo: "https://www.deel.com/hubfs/Deel%20Logo.svg",
    providerWebsite: "https://www.deel.com/startups",
    value: "$2,500",
    eligibility: "All startups",
    isFeatured: false,
  },
  {
    title: "Freshworks Startup Program",
    slug: "freshworks-startup-program",
    shortDescription: "Free access to Freshworks CRM suite",
    description: "Get free access to Freshworks' suite of business software including CRM, helpdesk, and marketing automation for up to 1 year.",
    type: "perk",
    provider: "Freshworks",
    providerLogo: "https://www.freshworks.com/static-assets/images/common/company/logos/fw-logo-colorful.png",
    providerWebsite: "https://www.freshworks.com/startup-program/",
    value: "FREE",
    eligibility: "All startups",
    isFeatured: false,
  },
];

// Resources data - Templates
const templates = [
  {
    title: "SAFE Note Agreement",
    slug: "safe-note-agreement",
    shortDescription: "YC-standard SAFE note template adapted for MENA markets",
    description: "A Simple Agreement for Future Equity (SAFE) is a financing contract between a startup and an investor. This template is based on YC's standard SAFE and adapted for MENA legal requirements.",
    type: "template",
    provider: "TechScoop",
    downloadUrl: "/templates/safe-note.docx",
    value: "Free",
    isFeatured: true,
  },
  {
    title: "Cap Table Template",
    slug: "cap-table-template",
    shortDescription: "Track equity, options, and dilution with this comprehensive spreadsheet",
    description: "A comprehensive cap table template to track your company's equity ownership, option pools, and dilution across funding rounds. Includes scenarios for future rounds.",
    type: "template",
    provider: "TechScoop",
    downloadUrl: "/templates/cap-table.xlsx",
    value: "Free",
    isFeatured: true,
  },
  {
    title: "ZATCA Compliance Checklist",
    slug: "zatca-compliance-checklist",
    shortDescription: "Step-by-step checklist for Saudi e-invoicing compliance",
    description: "Complete checklist for Phase 2 ZATCA e-invoicing compliance in Saudi Arabia. Covers technical requirements, integration steps, and testing procedures.",
    type: "template",
    provider: "TechScoop",
    downloadUrl: "/templates/zatca-checklist.pdf",
    value: "Free",
    isFeatured: false,
  },
  {
    title: "Pitch Deck Template",
    slug: "pitch-deck-template",
    shortDescription: "Investor-ready pitch deck with MENA market slides",
    description: "A 15-slide pitch deck template designed for MENA startups raising from regional and international investors. Includes market sizing and competitive landscape slides.",
    type: "template",
    provider: "TechScoop",
    downloadUrl: "/templates/pitch-deck.pptx",
    value: "Free",
    isFeatured: true,
  },
  {
    title: "UAE Employment Contract",
    slug: "uae-employment-contract",
    shortDescription: "MOHRE-compliant employment contract template",
    description: "Standard employment contract template compliant with UAE Ministry of Human Resources and Emiratisation (MOHRE) requirements. Includes Arabic translation.",
    type: "template",
    provider: "TechScoop",
    downloadUrl: "/templates/uae-employment.docx",
    value: "Premium",
    isFeatured: false,
  },
  {
    title: "SaaS Financial Model",
    slug: "saas-financial-model",
    shortDescription: "5-year financial projections for SaaS startups",
    description: "Comprehensive financial model for SaaS businesses including MRR projections, cohort analysis, unit economics, and investor-ready outputs.",
    type: "template",
    provider: "TechScoop",
    downloadUrl: "/templates/saas-model.xlsx",
    value: "Premium",
    isFeatured: false,
  },
];

// Resources data - Tools
const tools = [
  {
    title: "Linear",
    slug: "linear-project-management",
    shortDescription: "Streamline software projects, sprints, tasks, and bug tracking",
    description: "Linear is a modern project management tool built for software teams. Features include issue tracking, sprint planning, roadmaps, and integrations with GitHub and Slack.",
    type: "tool",
    provider: "Linear",
    providerLogo: "https://linear.app/static/favicon.ico",
    providerWebsite: "https://linear.app",
    externalUrl: "https://linear.app",
    value: "Freemium",
    isFeatured: true,
  },
  {
    title: "Figma",
    slug: "figma-design",
    shortDescription: "Collaborative interface design tool",
    description: "Figma is a collaborative design tool that lets teams create, prototype, and gather feedback in one place. Supports real-time collaboration and design systems.",
    type: "tool",
    provider: "Figma",
    providerLogo: "https://static.figma.com/app/icon/1/favicon.ico",
    providerWebsite: "https://figma.com",
    externalUrl: "https://figma.com",
    value: "Freemium",
    isFeatured: true,
  },
  {
    title: "Crisp",
    slug: "crisp-chat",
    shortDescription: "Customer messaging platform with live chat and chatbot",
    description: "Crisp is an all-in-one customer messaging platform featuring live chat, chatbot, knowledge base, and CRM. Supports Arabic and is popular in MENA.",
    type: "tool",
    provider: "Crisp",
    providerLogo: "https://crisp.chat/favicon.ico",
    providerWebsite: "https://crisp.chat",
    externalUrl: "https://crisp.chat",
    value: "Freemium",
    isFeatured: false,
  },
  {
    title: "Mixpanel",
    slug: "mixpanel-analytics",
    shortDescription: "Product analytics for user behavior tracking",
    description: "Mixpanel helps you understand how users engage with your product through event tracking, funnels, retention analysis, and A/B testing.",
    type: "tool",
    provider: "Mixpanel",
    providerLogo: "https://mixpanel.com/favicon.ico",
    providerWebsite: "https://mixpanel.com",
    externalUrl: "https://mixpanel.com",
    value: "Freemium",
    isFeatured: false,
  },
  {
    title: "Vercel",
    slug: "vercel-hosting",
    shortDescription: "Frontend cloud platform for web applications",
    description: "Vercel is the platform for frontend developers, providing the speed and reliability innovators need to create at the moment of inspiration.",
    type: "tool",
    provider: "Vercel",
    providerLogo: "https://vercel.com/favicon.ico",
    providerWebsite: "https://vercel.com",
    externalUrl: "https://vercel.com",
    value: "Freemium",
    isFeatured: true,
  },
];

// Resources data - Playbooks
const playbooks = [
  {
    title: "How to Incorporate in Saudi Arabia",
    slug: "incorporate-saudi-arabia",
    shortDescription: "Step-by-step guide to setting up your company in KSA",
    description: "Complete guide to incorporating your startup in Saudi Arabia, including MISA requirements, legal structures, and timeline expectations.",
    type: "playbook",
    provider: "TechScoop",
    value: "Free",
    isFeatured: true,
  },
  {
    title: "Raising Your First Round in MENA",
    slug: "raising-first-round-mena",
    shortDescription: "Guide to fundraising from MENA investors",
    description: "Everything you need to know about raising your seed round from MENA investors, including term sheets, due diligence, and negotiation tips.",
    type: "playbook",
    provider: "TechScoop",
    value: "Free",
    isFeatured: true,
  },
  {
    title: "UAE Free Zone Comparison",
    slug: "uae-free-zone-comparison",
    shortDescription: "Comparing DIFC, ADGM, DMCC, and other free zones",
    description: "Detailed comparison of UAE free zones for tech startups, including costs, benefits, visa allocations, and regulatory requirements.",
    type: "playbook",
    provider: "TechScoop",
    value: "Free",
    isFeatured: false,
  },
];

// Insert all resources
const allResources = [...perks, ...templates, ...tools, ...playbooks];

for (const resource of allResources) {
  try {
    await connection.execute(
      `INSERT INTO resources (title, slug, shortDescription, description, type, provider, providerLogo, providerWebsite, downloadUrl, externalUrl, value, eligibility, isFeatured, statusId, viewCount, downloadCount, publishedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [
        resource.title,
        resource.slug,
        resource.shortDescription || null,
        resource.description || null,
        resource.type,
        resource.provider || null,
        resource.providerLogo || null,
        resource.providerWebsite || null,
        resource.downloadUrl || null,
        resource.externalUrl || null,
        resource.value || null,
        resource.eligibility || null,
        resource.isFeatured ? 1 : 0,
        publishedStatusId,
        Math.floor(Math.random() * 1000),
        Math.floor(Math.random() * 500),
      ]
    );
    console.log(`✓ Created resource: ${resource.title}`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log(`- Skipped (exists): ${resource.title}`);
    } else {
      console.error(`✗ Error creating ${resource.title}:`, error.message);
    }
  }
}

console.log('\nResources seeding completed!');
await connection.end();
