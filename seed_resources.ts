/**
 * Seed Real Resources Data
 * Populates all 8 resource sections with 5 real items each
 */

import { getDb } from './server/db';
import { 
  resources, 
  calculators, 
  vendors, 
  regulations, 
  founderDeals,
  starterPacks,
  workflowStatuses,
  partners
} from './drizzle/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('Database not available');
    process.exit(1);
  }

  // Get published status ID
  const [publishedStatus] = await db.select().from(workflowStatuses).where(eq(workflowStatuses.slug, 'published'));
  const publishedId = publishedStatus?.id ?? 6;
  console.log('Published status ID:', publishedId);

  // Clear existing dummy data
  console.log('\n--- Clearing existing data ---');
  await db.delete(resources);
  await db.delete(calculators);
  await db.delete(vendors);
  await db.delete(regulations);
  await db.delete(founderDeals);
  await db.delete(starterPacks);
  console.log('Cleared all resource tables');

  // ============================================================
  // 1. PERKS (using resources table with type='perk')
  // ============================================================
  console.log('\n--- Seeding Perks ---');
  const perks = [
    {
      title: 'AWS Activate',
      slug: 'aws-activate',
      description: 'AWS credits covering EC2, S3, Lambda, RDS, DynamoDB, and most AWS services. Includes technical support, training, and business guidance for startups.',
      shortDescription: 'Up to $100,000 in AWS cloud credits for startups',
      type: 'perk' as const,
      provider: 'Amazon Web Services',
      providerLogo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
      providerWebsite: 'https://aws.amazon.com/startups/credits',
      value: 'Up to $100,000',
      eligibility: 'Early-stage startups, must be associated with an accelerator, incubator, or VC',
      externalUrl: 'https://aws.amazon.com/startups/credits',
      statusId: publishedId,
    },
    {
      title: 'Google for Startups Cloud Program',
      slug: 'google-cloud-startups',
      description: 'Cloud credits over two years with additional perks for AI-focused startups. Includes access to Firebase, technical support, and Google Cloud training.',
      shortDescription: 'Up to $350,000 in Google Cloud credits over 2 years',
      type: 'perk' as const,
      provider: 'Google Cloud',
      providerLogo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
      providerWebsite: 'https://cloud.google.com/startup',
      value: 'Up to $350,000',
      eligibility: 'Seed to Series A startups, must be affiliated with approved partners',
      externalUrl: 'https://cloud.google.com/startup',
      statusId: publishedId,
    },
    {
      title: 'Microsoft for Startups Founders Hub',
      slug: 'microsoft-founders-hub',
      description: 'Azure credits plus free GitHub Enterprise (20 seats), Microsoft 365, Visual Studio, and OpenAI credits. Includes technical support and mentorship.',
      shortDescription: 'Up to $150,000 in Azure credits plus developer tools',
      type: 'perk' as const,
      provider: 'Microsoft',
      providerLogo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
      providerWebsite: 'https://www.microsoft.com/en-us/startups',
      value: 'Up to $150,000',
      eligibility: 'B2B and B2C startups building on Microsoft technologies',
      externalUrl: 'https://www.microsoft.com/en-us/startups',
      statusId: publishedId,
    },
    {
      title: 'Stripe Atlas',
      slug: 'stripe-atlas',
      description: 'Delaware C-corp incorporation with tax ID, 83(b) filing, banking, and access to extensive partner perks and discounts worth over $100,000.',
      shortDescription: '$150 off incorporation plus $100K+ in partner perks',
      type: 'perk' as const,
      provider: 'Stripe',
      providerLogo: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
      providerWebsite: 'https://stripe.com/atlas',
      value: '$150 off + $100K perks',
      eligibility: 'Any founder looking to incorporate a US company',
      externalUrl: 'https://stripe.com/atlas',
      statusId: publishedId,
    },
    {
      title: 'HubSpot for Startups',
      slug: 'hubspot-startups',
      description: 'Up to 90% off HubSpot CRM, Marketing Hub, Sales Hub, and Service Hub for the first year. Includes onboarding support and educational resources.',
      shortDescription: 'Up to 90% off HubSpot software for startups',
      type: 'perk' as const,
      provider: 'HubSpot',
      providerLogo: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/HubSpot_Logo.svg',
      providerWebsite: 'https://www.hubspot.com/startups',
      value: 'Up to 90% off',
      eligibility: 'Seed-stage startups with less than $2M in funding',
      externalUrl: 'https://www.hubspot.com/startups',
      statusId: publishedId,
    },
  ];

  for (const perk of perks) {
    await db.insert(resources).values(perk);
  }
  console.log(`Inserted ${perks.length} perks`);

  // ============================================================
  // 2. TEMPLATES (using resources table with type='template')
  // ============================================================
  console.log('\n--- Seeding Templates ---');
  const templates = [
    {
      title: 'Y Combinator SAFE Agreement',
      slug: 'yc-safe-agreement',
      description: 'The Simple Agreement for Future Equity (SAFE) is a financing instrument created by Y Combinator. This template includes all standard SAFE variations: Post-Money SAFE with Cap, Post-Money SAFE with MFN, and Pre-Money SAFE.',
      shortDescription: 'Standard SAFE agreement templates from Y Combinator',
      type: 'template' as const,
      provider: 'Y Combinator',
      providerLogo: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Y_Combinator_logo.svg',
      providerWebsite: 'https://www.ycombinator.com/documents',
      downloadUrl: '/downloads/templates/yc-safe-template.pdf',
      externalUrl: 'https://www.ycombinator.com/documents',
      statusId: publishedId,
    },
    {
      title: 'Series A Term Sheet Template',
      slug: 'series-a-term-sheet',
      description: 'Standard Series A term sheet template based on NVCA model documents. Includes key terms like valuation, liquidation preferences, anti-dilution provisions, board composition, and protective provisions.',
      shortDescription: 'NVCA-based Series A term sheet template',
      type: 'template' as const,
      provider: 'NVCA',
      providerLogo: 'https://nvca.org/wp-content/uploads/2019/06/NVCA-logo.png',
      providerWebsite: 'https://nvca.org/model-legal-documents/',
      downloadUrl: '/downloads/templates/series-a-term-sheet.pdf',
      externalUrl: 'https://nvca.org/model-legal-documents/',
      statusId: publishedId,
    },
    {
      title: 'Pitch Deck Template',
      slug: 'pitch-deck-template',
      description: 'A comprehensive pitch deck template following the proven structure used by successful startups. Includes 12 essential slides: Problem, Solution, Market Size, Business Model, Traction, Team, Competition, Go-to-Market, Financials, Ask, and Appendix.',
      shortDescription: '12-slide pitch deck template for fundraising',
      type: 'template' as const,
      provider: 'TechScoop',
      providerWebsite: 'https://techscoop.io',
      downloadUrl: '/downloads/templates/pitch-deck-template.pptx',
      statusId: publishedId,
    },
    {
      title: 'Founder Agreement Template',
      slug: 'founder-agreement-template',
      description: 'Essential co-founder agreement template covering equity split, vesting schedules, roles and responsibilities, IP assignment, decision-making processes, and exit scenarios.',
      shortDescription: 'Co-founder agreement with vesting and IP clauses',
      type: 'template' as const,
      provider: 'Cooley GO',
      providerLogo: 'https://www.cooleygo.com/wp-content/themes/cooleygo/assets/images/cooley-go-logo.svg',
      providerWebsite: 'https://www.cooleygo.com/documents/',
      downloadUrl: '/downloads/templates/founder-agreement.pdf',
      externalUrl: 'https://www.cooleygo.com/documents/',
      statusId: publishedId,
    },
    {
      title: 'Employee Stock Option Plan (ESOP)',
      slug: 'esop-template',
      description: 'Complete ESOP documentation including plan document, stock option agreement, exercise notice, and 83(b) election form. Designed for Delaware C-corps.',
      shortDescription: 'Complete ESOP documentation for startups',
      type: 'template' as const,
      provider: 'Orrick',
      providerLogo: 'https://www.orrick.com/favicon.ico',
      providerWebsite: 'https://www.orrick.com/en/tech-studio/forms',
      downloadUrl: '/downloads/templates/esop-template.pdf',
      externalUrl: 'https://www.orrick.com/en/tech-studio/forms',
      statusId: publishedId,
    },
  ];

  for (const template of templates) {
    await db.insert(resources).values(template);
  }
  console.log(`Inserted ${templates.length} templates`);

  // ============================================================
  // 3. TOOLS (using resources table with type='tool')
  // ============================================================
  console.log('\n--- Seeding Tools ---');
  const tools = [
    {
      title: 'Notion',
      slug: 'notion-workspace',
      description: 'All-in-one workspace for notes, docs, wikis, and project management. Perfect for startup teams to collaborate on product specs, meeting notes, company wikis, and roadmaps.',
      shortDescription: 'All-in-one workspace for docs and project management',
      type: 'tool' as const,
      provider: 'Notion',
      providerLogo: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png',
      providerWebsite: 'https://www.notion.so',
      externalUrl: 'https://www.notion.so/startups',
      value: 'Free for small teams',
      statusId: publishedId,
    },
    {
      title: 'Linear',
      slug: 'linear-project-management',
      description: 'Modern issue tracking and project management tool built for high-performance teams. Features include cycles, roadmaps, GitHub integration, and keyboard-first design.',
      shortDescription: 'Issue tracking built for modern software teams',
      type: 'tool' as const,
      provider: 'Linear',
      providerLogo: 'https://linear.app/static/apple-touch-icon.png',
      providerWebsite: 'https://linear.app',
      externalUrl: 'https://linear.app',
      value: 'Free for small teams',
      statusId: publishedId,
    },
    {
      title: 'Figma',
      slug: 'figma-design',
      description: 'Collaborative design tool for UI/UX design, prototyping, and design systems. Real-time collaboration, component libraries, and developer handoff features.',
      shortDescription: 'Collaborative interface design and prototyping tool',
      type: 'tool' as const,
      provider: 'Figma',
      providerLogo: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg',
      providerWebsite: 'https://www.figma.com',
      externalUrl: 'https://www.figma.com/pricing/',
      value: 'Free starter plan',
      statusId: publishedId,
    },
    {
      title: 'Vercel',
      slug: 'vercel-deployment',
      description: 'Frontend cloud platform for deploying web applications. Zero-config deployments, automatic HTTPS, global CDN, and seamless integration with Next.js, React, and other frameworks.',
      shortDescription: 'Frontend deployment platform with global CDN',
      type: 'tool' as const,
      provider: 'Vercel',
      providerLogo: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
      providerWebsite: 'https://vercel.com',
      externalUrl: 'https://vercel.com/pricing',
      value: 'Free hobby tier',
      statusId: publishedId,
    },
    {
      title: 'Mixpanel',
      slug: 'mixpanel-analytics',
      description: 'Product analytics platform for tracking user behavior, conversion funnels, retention analysis, and A/B testing. Essential for data-driven product decisions.',
      shortDescription: 'Product analytics for user behavior tracking',
      type: 'tool' as const,
      provider: 'Mixpanel',
      providerLogo: 'https://cdn.worldvectorlogo.com/logos/mixpanel.svg',
      providerWebsite: 'https://mixpanel.com',
      externalUrl: 'https://mixpanel.com/startups',
      value: '$50,000 credits for startups',
      statusId: publishedId,
    },
  ];

  for (const tool of tools) {
    await db.insert(resources).values(tool);
  }
  console.log(`Inserted ${tools.length} tools`);

  // ============================================================
  // 4. PLAYBOOKS (using resources table with type='playbook')
  // ============================================================
  console.log('\n--- Seeding Playbooks ---');
  const playbooks = [
    {
      title: 'YC Startup Playbook',
      slug: 'yc-startup-playbook',
      description: 'Comprehensive guide from Y Combinator covering everything from idea validation to scaling. Includes advice on building products, hiring, fundraising, and company culture from YC partners.',
      shortDescription: 'Complete startup guide from Y Combinator',
      type: 'playbook' as const,
      provider: 'Y Combinator',
      providerLogo: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Y_Combinator_logo.svg',
      providerWebsite: 'https://www.ycombinator.com',
      downloadUrl: '/downloads/playbooks/yc-startup-playbook.pdf',
      externalUrl: 'https://playbook.samaltman.com/',
      statusId: publishedId,
    },
    {
      title: 'Seed Fundraising Guide',
      slug: 'seed-fundraising-guide',
      description: 'Step-by-step guide to raising seed funding. Covers when to raise, how much to raise, investor targeting, pitch preparation, term negotiation, and closing the round.',
      shortDescription: 'Complete guide to raising seed funding',
      type: 'playbook' as const,
      provider: 'Y Combinator',
      providerLogo: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Y_Combinator_logo.svg',
      providerWebsite: 'https://www.ycombinator.com',
      downloadUrl: '/downloads/playbooks/seed-fundraising-guide.pdf',
      externalUrl: 'https://www.ycombinator.com/library/4A-a-guide-to-seed-fundraising',
      statusId: publishedId,
    },
    {
      title: 'Go-to-Market Strategy Playbook',
      slug: 'gtm-strategy-playbook',
      description: 'Framework for launching products and entering new markets. Includes market segmentation, positioning, pricing strategies, channel selection, and launch execution plans.',
      shortDescription: 'Framework for product launches and market entry',
      type: 'playbook' as const,
      provider: 'TechScoop',
      providerWebsite: 'https://techscoop.io',
      downloadUrl: '/downloads/playbooks/gtm-playbook.pdf',
      statusId: publishedId,
    },
    {
      title: 'MENA Market Entry Guide',
      slug: 'mena-market-entry-guide',
      description: 'Comprehensive guide for startups expanding into MENA markets. Covers regulatory requirements, cultural considerations, payment infrastructure, and market-specific strategies for UAE, Saudi Arabia, and Egypt.',
      shortDescription: 'Guide to expanding your startup into MENA markets',
      type: 'playbook' as const,
      provider: 'TechScoop',
      providerWebsite: 'https://techscoop.io',
      downloadUrl: '/downloads/playbooks/mena-market-entry.pdf',
      statusId: publishedId,
    },
    {
      title: 'Technical Hiring Playbook',
      slug: 'technical-hiring-playbook',
      description: 'Best practices for hiring engineers at startups. Covers sourcing strategies, interview processes, technical assessments, offer negotiation, and onboarding for technical roles.',
      shortDescription: 'Guide to hiring engineers at early-stage startups',
      type: 'playbook' as const,
      provider: 'TechScoop',
      providerWebsite: 'https://techscoop.io',
      downloadUrl: '/downloads/playbooks/technical-hiring.pdf',
      statusId: publishedId,
    },
  ];

  for (const playbook of playbooks) {
    await db.insert(resources).values(playbook);
  }
  console.log(`Inserted ${playbooks.length} playbooks`);

  // ============================================================
  // 5. CALCULATORS
  // ============================================================
  console.log('\n--- Seeding Calculators ---');
  const calculatorData = [
    {
      name: 'Startup Valuation Calculator',
      slug: 'startup-valuation',
      description: 'Calculate your startup valuation using multiple methods including Revenue Multiple, Comparable Companies, and Scorecard Method. Get a range estimate based on industry benchmarks.',
      shortDescription: 'Estimate your startup valuation using multiple methods',
      type: 'valuation' as const,
      helpText: 'Enter your monthly recurring revenue, growth rate, and industry to get valuation estimates.',
      inputFields: JSON.stringify([
        { name: 'mrr', label: 'Monthly Recurring Revenue ($)', type: 'number', required: true },
        { name: 'growthRate', label: 'Monthly Growth Rate (%)', type: 'number', required: true },
        { name: 'industry', label: 'Industry', type: 'select', options: ['SaaS', 'Fintech', 'E-commerce', 'Marketplace', 'Other'] },
      ]),
      outputFields: JSON.stringify([
        { name: 'lowValuation', label: 'Low Estimate', format: 'currency' },
        { name: 'midValuation', label: 'Mid Estimate', format: 'currency' },
        { name: 'highValuation', label: 'High Estimate', format: 'currency' },
      ]),
      formula: 'ARR * multiple (8-15x for SaaS)',
      isActive: true,
      isFeatured: true,
      sortOrder: 1,
    },
    {
      name: 'Runway Calculator',
      slug: 'runway-calculator',
      description: 'Calculate how many months of runway your startup has based on current cash balance and monthly burn rate. Plan your next fundraise accordingly.',
      shortDescription: 'Calculate months of runway based on burn rate',
      type: 'runway' as const,
      helpText: 'Enter your current cash balance and monthly expenses to see your runway.',
      inputFields: JSON.stringify([
        { name: 'cashBalance', label: 'Current Cash Balance ($)', type: 'number', required: true },
        { name: 'monthlyRevenue', label: 'Monthly Revenue ($)', type: 'number', required: false },
        { name: 'monthlyExpenses', label: 'Monthly Expenses ($)', type: 'number', required: true },
      ]),
      outputFields: JSON.stringify([
        { name: 'burnRate', label: 'Net Burn Rate', format: 'currency' },
        { name: 'runwayMonths', label: 'Runway (Months)', format: 'number' },
        { name: 'runwayDate', label: 'Cash Zero Date', format: 'date' },
      ]),
      formula: 'Runway = Cash Balance / (Monthly Expenses - Monthly Revenue)',
      isActive: true,
      isFeatured: true,
      sortOrder: 2,
    },
    {
      name: 'Equity Dilution Calculator',
      slug: 'equity-dilution',
      description: 'Understand how your ownership percentage changes after each funding round. Model different scenarios with varying raise amounts and valuations.',
      shortDescription: 'Calculate founder dilution across funding rounds',
      type: 'dilution' as const,
      helpText: 'Enter your current ownership and planned funding rounds to see dilution impact.',
      inputFields: JSON.stringify([
        { name: 'currentOwnership', label: 'Current Ownership (%)', type: 'number', required: true },
        { name: 'raiseAmount', label: 'Amount Raising ($)', type: 'number', required: true },
        { name: 'preMoneyValuation', label: 'Pre-Money Valuation ($)', type: 'number', required: true },
        { name: 'optionPoolIncrease', label: 'Option Pool Increase (%)', type: 'number', required: false },
      ]),
      outputFields: JSON.stringify([
        { name: 'postMoneyValuation', label: 'Post-Money Valuation', format: 'currency' },
        { name: 'newOwnership', label: 'Your New Ownership', format: 'percentage' },
        { name: 'dilution', label: 'Dilution Amount', format: 'percentage' },
        { name: 'investorOwnership', label: 'Investor Ownership', format: 'percentage' },
      ]),
      formula: 'New Ownership = Current Ownership × (Pre-Money / Post-Money)',
      isActive: true,
      isFeatured: true,
      sortOrder: 3,
    },
    {
      name: 'SAFE Conversion Calculator',
      slug: 'safe-conversion',
      description: 'Calculate how SAFE notes convert into equity during a priced round. Supports both pre-money and post-money SAFEs with caps and discounts.',
      shortDescription: 'Model SAFE note conversions in priced rounds',
      type: 'cap_table' as const,
      helpText: 'Enter SAFE terms and priced round details to see conversion.',
      inputFields: JSON.stringify([
        { name: 'safeAmount', label: 'SAFE Investment Amount ($)', type: 'number', required: true },
        { name: 'valuationCap', label: 'Valuation Cap ($)', type: 'number', required: false },
        { name: 'discount', label: 'Discount (%)', type: 'number', required: false },
        { name: 'preMoneyValuation', label: 'Priced Round Pre-Money ($)', type: 'number', required: true },
        { name: 'isPostMoney', label: 'Post-Money SAFE?', type: 'boolean', required: true },
      ]),
      outputFields: JSON.stringify([
        { name: 'conversionPrice', label: 'Conversion Price', format: 'currency' },
        { name: 'sharesIssued', label: 'Shares Issued', format: 'number' },
        { name: 'ownershipPercent', label: 'Ownership %', format: 'percentage' },
      ]),
      formula: 'Conversion Price = min(Cap, Priced Round Price × (1 - Discount))',
      isActive: true,
      isFeatured: false,
      sortOrder: 4,
    },
    {
      name: 'Unit Economics Calculator',
      slug: 'unit-economics',
      description: 'Calculate key unit economics metrics including Customer Acquisition Cost (CAC), Lifetime Value (LTV), LTV:CAC ratio, and payback period.',
      shortDescription: 'Calculate CAC, LTV, and payback period',
      type: 'ltv_cac' as const,
      helpText: 'Enter your customer metrics to calculate unit economics.',
      inputFields: JSON.stringify([
        { name: 'marketingSpend', label: 'Monthly Marketing Spend ($)', type: 'number', required: true },
        { name: 'newCustomers', label: 'New Customers per Month', type: 'number', required: true },
        { name: 'avgRevenue', label: 'Avg Monthly Revenue per Customer ($)', type: 'number', required: true },
        { name: 'grossMargin', label: 'Gross Margin (%)', type: 'number', required: true },
        { name: 'churnRate', label: 'Monthly Churn Rate (%)', type: 'number', required: true },
      ]),
      outputFields: JSON.stringify([
        { name: 'cac', label: 'Customer Acquisition Cost', format: 'currency' },
        { name: 'ltv', label: 'Lifetime Value', format: 'currency' },
        { name: 'ltvCacRatio', label: 'LTV:CAC Ratio', format: 'ratio' },
        { name: 'paybackMonths', label: 'CAC Payback (Months)', format: 'number' },
      ]),
      formula: 'LTV = (ARPU × Gross Margin) / Churn Rate; CAC = Marketing Spend / New Customers',
      isActive: true,
      isFeatured: true,
      sortOrder: 5,
    },
  ];

  for (const calc of calculatorData) {
    await db.insert(calculators).values(calc);
  }
  console.log(`Inserted ${calculatorData.length} calculators`);

  // ============================================================
  // 6. VENDORS
  // ============================================================
  console.log('\n--- Seeding Vendors ---');
  const vendorData = [
    {
      name: 'Kassim Legal',
      slug: 'kassim-legal',
      description: 'MENA region\'s leading boutique law firm for startups, entrepreneurs, and emerging companies. Represented hundreds of venture-backed companies in the region.',
      shortDescription: 'Leading startup law firm in MENA',
      logo: 'https://kassimlegal.com/wp-content/uploads/2021/01/kassim-legal-logo.png',
      website: 'https://kassimlegal.com',
      category: 'legal' as const,
      subcategory: 'Startup Law',
      services: JSON.stringify(['Incorporation', 'Fundraising', 'M&A', 'Employment', 'IP Protection']),
      specializations: JSON.stringify(['Venture Capital', 'SAFE/Convertible Notes', 'MENA Regulations']),
      priceRange: '$$$' as const,
      contactEmail: 'info@kassimlegal.com',
      regions: JSON.stringify(['UAE', 'Saudi Arabia', 'Egypt', 'MENA']),
      isVerified: true,
      isFeatured: true,
      statusId: publishedId,
    },
    {
      name: 'Clara',
      slug: 'clara-legaltech',
      description: 'Abu Dhabi-based legaltech platform helping startups manage equity, fundraising, and legal documents. Streamlined cap table management and document automation.',
      shortDescription: 'Legaltech platform for equity and fundraising',
      logo: 'https://clara.co/favicon.ico',
      website: 'https://clara.co',
      category: 'legal' as const,
      subcategory: 'Legaltech',
      services: JSON.stringify(['Cap Table Management', 'SAFE Generation', 'Incorporation', 'Document Automation']),
      specializations: JSON.stringify(['ADGM', 'DIFC', 'UAE Free Zones']),
      priceRange: '$$' as const,
      contactEmail: 'hello@clara.co',
      regions: JSON.stringify(['UAE', 'MENA']),
      isVerified: true,
      isFeatured: true,
      statusId: publishedId,
    },
    {
      name: 'Deloitte Middle East',
      slug: 'deloitte-middle-east',
      description: 'Global professional services firm with deep MENA expertise. Offers audit, tax, consulting, and advisory services for startups and enterprises.',
      shortDescription: 'Big 4 accounting and consulting firm',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Deloitte.svg',
      website: 'https://www2.deloitte.com/xe/en.html',
      category: 'accounting' as const,
      subcategory: 'Big 4',
      services: JSON.stringify(['Audit', 'Tax Advisory', 'Consulting', 'Financial Advisory']),
      specializations: JSON.stringify(['VAT Compliance', 'Transfer Pricing', 'IPO Readiness']),
      priceRange: '$$$$' as const,
      contactEmail: 'info@deloitte.com',
      regions: JSON.stringify(['UAE', 'Saudi Arabia', 'Qatar', 'MENA']),
      isVerified: true,
      isFeatured: false,
      statusId: publishedId,
    },
    {
      name: 'Wio Bank',
      slug: 'wio-bank',
      description: 'UAE\'s first platform bank offering digital banking services for businesses. Fast account opening, multi-currency accounts, and API banking for startups.',
      shortDescription: 'Digital business banking for UAE startups',
      logo: 'https://www.wio.io/favicon.ico',
      website: 'https://www.wio.io',
      category: 'banking' as const,
      subcategory: 'Digital Banking',
      services: JSON.stringify(['Business Accounts', 'Multi-Currency', 'API Banking', 'Corporate Cards']),
      specializations: JSON.stringify(['Startups', 'SMEs', 'Fintechs']),
      priceRange: '$' as const,
      contactEmail: 'business@wio.io',
      regions: JSON.stringify(['UAE']),
      isVerified: true,
      isFeatured: true,
      statusId: publishedId,
    },
    {
      name: 'Bayzat',
      slug: 'bayzat-hr',
      description: 'All-in-one HR and payroll platform for UAE and Saudi Arabia. Handles employee onboarding, payroll, benefits, and compliance.',
      shortDescription: 'HR and payroll platform for MENA startups',
      logo: 'https://www.bayzat.com/favicon.ico',
      website: 'https://www.bayzat.com',
      category: 'hr' as const,
      subcategory: 'HR Tech',
      services: JSON.stringify(['Payroll', 'HR Management', 'Benefits', 'Compliance']),
      specializations: JSON.stringify(['UAE Labor Law', 'WPS Compliance', 'Health Insurance']),
      priceRange: '$$' as const,
      contactEmail: 'hello@bayzat.com',
      regions: JSON.stringify(['UAE', 'Saudi Arabia']),
      isVerified: true,
      isFeatured: true,
      statusId: publishedId,
    },
  ];

  for (const vendor of vendorData) {
    await db.insert(vendors).values(vendor);
  }
  console.log(`Inserted ${vendorData.length} vendors`);

  // ============================================================
  // 7. REGULATIONS
  // ============================================================
  console.log('\n--- Seeding Regulations ---');
  const regulationData = [
    {
      title: 'UAE Golden Visa for Entrepreneurs',
      slug: 'uae-golden-visa-entrepreneurs',
      description: 'Long-term residence visa (5-10 years) for entrepreneurs and investors in the UAE. Allows full ownership of businesses and sponsorship of family members.',
      summary: 'The UAE Golden Visa program offers entrepreneurs a 5-year renewable residence visa without the need for a local sponsor.',
      content: `
## Eligibility Requirements

### For Entrepreneurs:
- Own a startup or project with minimum capital of AED 500,000
- Approval from an accredited business incubator in the UAE
- Project must be in priority sectors (technology, renewable energy, etc.)

### For Investors:
- Public investment of AED 2 million or more
- Or ownership of a company with capital of AED 2 million+

## Benefits
- 5-10 year renewable residence visa
- No sponsor required
- 100% business ownership
- Sponsor family members
- Multiple entry visa
- Work permit included

## Application Process
1. Apply through ICP or GDRFA
2. Submit required documents
3. Pay applicable fees
4. Receive visa within 30 days
      `,
      type: 'visa' as const,
      country: 'UAE',
      authority: 'Federal Authority for Identity and Citizenship',
      authorityUrl: 'https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa',
      keyPoints: JSON.stringify([
        '5-10 year renewable visa',
        'No sponsor required',
        '100% business ownership',
        'Family sponsorship included',
      ]),
      faqs: JSON.stringify([
        { question: 'What is the minimum investment?', answer: 'AED 500,000 for entrepreneurs, AED 2 million for investors.' },
        { question: 'Can I sponsor my family?', answer: 'Yes, Golden Visa holders can sponsor spouse, children, and domestic workers.' },
      ]),
      isFeatured: true,
      statusId: publishedId,
    },
    {
      title: 'Saudi Arabia MISA Investment License',
      slug: 'saudi-misa-investment-license',
      description: 'Foreign companies must obtain a MISA license to operate in Saudi Arabia. The Ministry of Investment streamlined the process for tech startups.',
      summary: 'MISA license is required for foreign-owned businesses to operate in Saudi Arabia.',
      content: `
## Overview
The Ministry of Investment Saudi Arabia (MISA) issues licenses for foreign investors to establish and operate businesses in the Kingdom.

## License Types
- **Industrial License**: Manufacturing activities
- **Services License**: Service-based businesses
- **Trading License**: Import/export and distribution
- **Tech License**: Technology and innovation companies

## Requirements
1. Minimum capital requirements (varies by activity)
2. Business plan and feasibility study
3. Parent company documents (if applicable)
4. Board resolution for investment

## Process Timeline
- Standard processing: 5-10 business days
- Premium processing available for qualified applicants

## Benefits for Tech Startups
- 100% foreign ownership allowed
- Reduced capital requirements for innovation-focused companies
- Access to Saudi market and Vision 2030 initiatives
      `,
      type: 'license' as const,
      country: 'Saudi Arabia',
      authority: 'Ministry of Investment (MISA)',
      authorityUrl: 'https://misa.gov.sa',
      keyPoints: JSON.stringify([
        '100% foreign ownership allowed',
        'Fast-track processing available',
        'Reduced requirements for tech startups',
        'Access to Vision 2030 initiatives',
      ]),
      isFeatured: true,
      statusId: publishedId,
    },
    {
      title: 'DIFC Innovation License',
      slug: 'difc-innovation-license',
      description: 'Low-cost license for startups to operate in Dubai International Financial Centre. Includes coworking space, visa allocation, and access to DIFC ecosystem.',
      summary: 'DIFC Innovation License offers startups an affordable entry point to Dubai\'s premier financial center.',
      content: `
## Overview
The DIFC Innovation License is designed for early-stage startups and entrepreneurs looking to establish a presence in Dubai's leading financial hub.

## Key Features
- **Low Setup Cost**: Starting from $1,500/year
- **Coworking Space**: Access to DIFC Innovation Hub
- **Visa Allocation**: Up to 4 visas included
- **Banking**: Access to DIFC-regulated banks

## Eligible Activities
- Fintech
- Regtech
- Insurtech
- AI and Machine Learning
- Blockchain
- Other innovation activities

## Requirements
- Business plan
- Proof of funds
- Passport copies
- CV of founders

## Benefits
- Zero corporate tax on qualifying income
- 100% foreign ownership
- No currency restrictions
- Common law jurisdiction
      `,
      type: 'license' as const,
      country: 'UAE',
      region: 'Dubai',
      authority: 'Dubai International Financial Centre',
      authorityUrl: 'https://www.difc.ae',
      keyPoints: JSON.stringify([
        'Starting from $1,500/year',
        'Up to 4 visas included',
        'Zero corporate tax',
        'Common law jurisdiction',
      ]),
      isFeatured: true,
      statusId: publishedId,
    },
    {
      title: 'UAE VAT Registration Requirements',
      slug: 'uae-vat-registration',
      description: 'Businesses in UAE must register for VAT if taxable supplies exceed AED 375,000. Voluntary registration available for supplies over AED 187,500.',
      summary: 'VAT registration is mandatory for businesses exceeding the threshold and optional for smaller businesses.',
      content: `
## VAT Overview
The UAE implemented a 5% Value Added Tax (VAT) on January 1, 2018.

## Registration Thresholds
- **Mandatory Registration**: Taxable supplies > AED 375,000
- **Voluntary Registration**: Taxable supplies > AED 187,500
- **No Registration Required**: Below AED 187,500

## Registration Process
1. Create account on Federal Tax Authority portal
2. Submit application with required documents
3. Receive Tax Registration Number (TRN)
4. Begin charging and collecting VAT

## Required Documents
- Trade license
- Emirates ID of authorized signatory
- Bank account details
- 12-month revenue projection

## Compliance Requirements
- File VAT returns quarterly
- Maintain records for 5 years
- Issue tax invoices
- Pay VAT within 28 days of period end
      `,
      type: 'tax' as const,
      country: 'UAE',
      authority: 'Federal Tax Authority',
      authorityUrl: 'https://tax.gov.ae',
      keyPoints: JSON.stringify([
        '5% VAT rate',
        'Mandatory above AED 375,000',
        'Quarterly filing required',
        '5-year record retention',
      ]),
      isFeatured: false,
      statusId: publishedId,
    },
    {
      title: 'Egypt Startup Act',
      slug: 'egypt-startup-act',
      description: 'Egypt\'s framework for supporting startups with tax incentives, simplified procedures, and access to government support programs.',
      summary: 'Egypt\'s Startup Act provides a legal framework and incentives for tech startups.',
      content: `
## Overview
Egypt's Startup Act establishes a comprehensive framework for supporting technology startups and entrepreneurs.

## Key Provisions
- **Tax Incentives**: Reduced corporate tax rates for qualifying startups
- **Simplified Registration**: Fast-track company formation
- **Government Procurement**: Access to government contracts
- **Funding Support**: Access to government-backed funds

## Eligibility Criteria
- Technology-focused business
- Less than 5 years old
- Annual revenue below threshold
- Egyptian incorporation

## Benefits
- Tax holidays for qualifying startups
- Simplified visa procedures for foreign talent
- Access to incubators and accelerators
- Priority in government tenders

## Supporting Ecosystem
- ITIDA (IT Industry Development Agency)
- Technology Innovation and Entrepreneurship Center (TIEC)
- Various incubators and accelerators
      `,
      type: 'framework' as const,
      country: 'Egypt',
      authority: 'Ministry of Communications and Information Technology',
      authorityUrl: 'https://mcit.gov.eg',
      keyPoints: JSON.stringify([
        'Tax incentives for tech startups',
        'Simplified registration process',
        'Access to government support',
        'Foreign talent visa support',
      ]),
      isFeatured: false,
      statusId: publishedId,
    },
  ];

  for (const reg of regulationData) {
    await db.insert(regulations).values(reg);
  }
  console.log(`Inserted ${regulationData.length} regulations`);

  // ============================================================
  // 8. STARTER PACKS
  // ============================================================
  console.log('\n--- Seeding Starter Packs ---');
  const starterPackData = [
    {
      name: 'UAE Startup Launch Pack',
      slug: 'uae-startup-launch-pack',
      tagline: 'Everything you need to launch in the UAE',
      description: 'Complete resource bundle for launching a startup in the UAE. Includes legal templates, regulatory guides, recommended vendors, and cloud credits worth over $500,000.',
      targetStage: 'pre_seed' as const,
      targetRegion: 'uae',
      includedPerks: JSON.stringify([1, 2, 3]), // AWS, Google, Microsoft
      includedTemplates: JSON.stringify([1, 2, 4]), // SAFE, Term Sheet, Founder Agreement
      includedTools: JSON.stringify([1, 2, 3]), // Notion, Linear, Figma
      includedPlaybooks: JSON.stringify([4]), // MENA Market Entry
      totalValueDisplay: '$500,000+',
      isFeatured: true,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Seed Fundraising Pack',
      slug: 'seed-fundraising-pack',
      tagline: 'Raise your seed round with confidence',
      description: 'Essential resources for raising seed funding. Includes pitch deck templates, SAFE agreements, term sheet templates, and fundraising playbooks.',
      targetStage: 'seed' as const,
      targetRegion: 'mena',
      includedPerks: JSON.stringify([4]), // Stripe Atlas
      includedTemplates: JSON.stringify([1, 2, 3]), // SAFE, Term Sheet, Pitch Deck
      includedPlaybooks: JSON.stringify([1, 2]), // YC Playbook, Seed Guide
      totalValueDisplay: '$50,000+',
      isFeatured: true,
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Technical Founder Toolkit',
      slug: 'technical-founder-toolkit',
      tagline: 'Build and ship faster',
      description: 'Developer-focused resource pack with cloud credits, development tools, and technical best practices for building your MVP.',
      targetStage: 'idea' as const,
      targetRegion: 'mena',
      includedPerks: JSON.stringify([1, 2, 3]), // AWS, Google, Microsoft
      includedTools: JSON.stringify([1, 2, 3, 4, 5]), // All tools
      includedPlaybooks: JSON.stringify([5]), // Technical Hiring
      totalValueDisplay: '$600,000+',
      isFeatured: true,
      isActive: true,
      sortOrder: 3,
    },
    {
      name: 'Saudi Arabia Expansion Pack',
      slug: 'saudi-expansion-pack',
      tagline: 'Enter the Kingdom\'s booming market',
      description: 'Resources for expanding your startup into Saudi Arabia. Includes regulatory guides, local vendor recommendations, and market entry strategies.',
      targetStage: 'series_a' as const,
      targetRegion: 'saudi',
      includedTemplates: JSON.stringify([2, 4]), // Term Sheet, Founder Agreement
      includedPlaybooks: JSON.stringify([3, 4]), // GTM, MENA Entry
      totalValueDisplay: '$25,000+',
      isFeatured: false,
      isActive: true,
      sortOrder: 4,
    },
    {
      name: 'Growth Stage Essentials',
      slug: 'growth-stage-essentials',
      tagline: 'Scale your operations efficiently',
      description: 'Resources for startups scaling from seed to Series A. Includes hiring playbooks, analytics tools, and operational templates.',
      targetStage: 'growth' as const,
      targetRegion: 'mena',
      includedPerks: JSON.stringify([5]), // HubSpot
      includedTools: JSON.stringify([4, 5]), // Vercel, Mixpanel
      includedTemplates: JSON.stringify([5]), // ESOP
      includedPlaybooks: JSON.stringify([3, 5]), // GTM, Technical Hiring
      totalValueDisplay: '$150,000+',
      isFeatured: false,
      isActive: true,
      sortOrder: 5,
    },
  ];

  for (const pack of starterPackData) {
    await db.insert(starterPacks).values(pack);
  }
  console.log(`Inserted ${starterPackData.length} starter packs`);

  console.log('\n=== Seeding Complete ===');
  console.log('Summary:');
  console.log(`- Perks: ${perks.length}`);
  console.log(`- Templates: ${templates.length}`);
  console.log(`- Tools: ${tools.length}`);
  console.log(`- Playbooks: ${playbooks.length}`);
  console.log(`- Calculators: ${calculatorData.length}`);
  console.log(`- Vendors: ${vendorData.length}`);
  console.log(`- Regulations: ${regulationData.length}`);
  console.log(`- Starter Packs: ${starterPackData.length}`);

  process.exit(0);
}

main().catch(console.error);
