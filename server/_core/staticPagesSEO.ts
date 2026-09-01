/**
 * Static Pages SEO Configuration
 * Defines meta tags for all static pages (homepage, resources, about, etc.)
 * Also covers all parent category pages to prevent noindex fallback.
 */

export interface StaticPageSEO {
  title: string;
  description: string;
  image?: string;
  keywords?: string;
  robots?: string; // Override robots directive (default: "index, follow")
}

const BASE_URL = "https://techscoop.io";
const DEFAULT_IMAGE = 'https://techscoop.io/assets/og-image.png';

/**
 * SEO configuration for all static pages
 */
export const staticPagesSEO: Record<string, StaticPageSEO> = {
  // ============================================================
  // CORE PAGES
  // ============================================================
  '/': {
    title: 'TechScoop | MENA\'s Tech Ecosystem Platform',
    description: 'TechScoop is MENA\'s leading technology publication covering startups, venture capital, tech jobs, and innovation across the Middle East and North Africa.',
    image: DEFAULT_IMAGE,
    keywords: 'tech news, startups, venture capital, MENA, Middle East, North Africa, jobs, events',
  },
  '/news': {
    title: 'Tech News | TechScoop - MENA\'s Tech Ecosystem',
    description: 'Latest technology news from MENA region covering startups, venture capital, AI, fintech, and innovation.',
    image: DEFAULT_IMAGE,
    keywords: 'tech news, MENA news, startup news, venture capital news',
  },
  '/jobs': {
    title: 'Tech Jobs | TechScoop - MENA\'s Tech Ecosystem',
    description: 'Find the latest technology jobs in MENA region. Browse positions at startups, tech companies, and venture firms.',
    image: DEFAULT_IMAGE,
    keywords: 'tech jobs, MENA jobs, startup jobs, tech careers',
  },
  '/companies': {
    title: 'Tech Companies | TechScoop - MENA\'s Tech Ecosystem',
    description: 'Discover and explore tech companies in MENA region. Find startup profiles, funding information, and company details.',
    image: DEFAULT_IMAGE,
    keywords: 'tech companies, startups, MENA startups, company directory',
  },
  '/people': {
    title: 'Tech Leaders & Professionals | TechScoop - MENA\'s Tech Ecosystem',
    description: 'Explore profiles of tech leaders, entrepreneurs, and professionals in MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'tech leaders, entrepreneurs, professionals, MENA tech',
  },
  '/investors': {
    title: 'Investors & VCs | TechScoop - MENA\'s Tech Ecosystem',
    description: 'Discover venture capital firms, angel investors, and investment funds in MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'venture capital, investors, VCs, MENA funding',
  },
  '/accelerators': {
    title: 'Accelerators & Incubators | TechScoop - MENA\'s Tech Ecosystem',
    description: 'Find accelerators, incubators, and startup support programs in MENA region.',
    image: DEFAULT_IMAGE,
    keywords: 'accelerators, incubators, startup programs, MENA',
  },
  '/events': {
    title: 'Tech Events | TechScoop - MENA\'s Tech Ecosystem',
    description: 'Discover upcoming tech events, conferences, and networking opportunities in MENA region.',
    image: DEFAULT_IMAGE,
    keywords: 'tech events, conferences, networking, MENA events',
  },
  '/funding': {
    title: 'Startup Funding | TechScoop - MENA\'s Tech Ecosystem',
    description: 'Track startup funding rounds, investments, and capital raises in MENA region.',
    image: DEFAULT_IMAGE,
    keywords: 'startup funding, investments, capital raises, MENA',
  },
  '/search': {
    title: 'Search | TechScoop',
    description: 'Search TechScoop for articles, companies, people, jobs, and events.',
    image: DEFAULT_IMAGE,
    keywords: 'search, find, TechScoop',
    robots: 'noindex, follow', // Search pages should not be indexed
  },

  // ============================================================
  // RESOURCES PAGES
  // ============================================================
  '/resources': {
    title: 'Resources | TechScoop - Tools, Templates & Guides',
    description: 'Access free resources including templates, tools, playbooks, and guides for startups and tech professionals.',
    image: DEFAULT_IMAGE,
    keywords: 'resources, templates, tools, guides, startup resources',
  },
  '/resources/templates': {
    title: 'Templates | TechScoop Resources',
    description: 'Download free business templates including legal documents, financial templates, and startup resources.',
    image: DEFAULT_IMAGE,
    keywords: 'templates, business templates, legal templates, financial templates',
  },
  '/resources/tools': {
    title: 'Tools | TechScoop Resources',
    description: 'Discover curated tools and software for startups, entrepreneurs, and tech professionals.',
    image: DEFAULT_IMAGE,
    keywords: 'tools, software, startup tools, productivity tools',
  },
  '/resources/playbooks': {
    title: 'Playbooks | TechScoop Resources',
    description: 'Access comprehensive playbooks and guides for building and scaling startups.',
    image: DEFAULT_IMAGE,
    keywords: 'playbooks, guides, startup guides, business guides',
  },
  '/resources/perks': {
    title: 'Perks | TechScoop Resources',
    description: 'Exclusive perks and discounts for startups and tech professionals.',
    image: DEFAULT_IMAGE,
    keywords: 'perks, discounts, startup deals, exclusive offers',
  },
  '/resources/regulations': {
    title: 'Regulations | TechScoop Resources',
    description: 'Regulatory guides and compliance information for tech companies in MENA.',
    image: DEFAULT_IMAGE,
    keywords: 'regulations, compliance, legal, MENA regulations',
  },
  '/resources/calculators': {
    title: 'Calculators | TechScoop Resources',
    description: 'Free business calculators for startups including CAC, LTV, MRR, runway, and more.',
    image: DEFAULT_IMAGE,
    keywords: 'calculators, business calculators, startup metrics',
  },
  '/resources/calculators/cac-ltv': {
    title: 'CAC & LTV Calculator | TechScoop',
    description: 'Calculate Customer Acquisition Cost (CAC) and Lifetime Value (LTV) for your startup.',
    image: DEFAULT_IMAGE,
    keywords: 'CAC, LTV, customer acquisition, lifetime value',
  },
  '/resources/calculators/dilution': {
    title: 'Dilution Calculator | TechScoop',
    description: 'Calculate equity dilution from funding rounds.',
    image: DEFAULT_IMAGE,
    keywords: 'dilution, equity, funding rounds',
  },
  '/resources/calculators/mrr': {
    title: 'MRR Calculator | TechScoop',
    description: 'Calculate Monthly Recurring Revenue (MRR) for SaaS businesses.',
    image: DEFAULT_IMAGE,
    keywords: 'MRR, monthly recurring revenue, SaaS metrics',
  },
  '/resources/calculators/runway': {
    title: 'Runway Calculator | TechScoop',
    description: 'Calculate your startup\'s runway based on burn rate and cash balance.',
    image: DEFAULT_IMAGE,
    keywords: 'runway, burn rate, cash runway',
  },
  '/resources/calculators/saas-quick-ratio': {
    title: 'SaaS Quick Ratio Calculator | TechScoop',
    description: 'Calculate SaaS Quick Ratio to measure business health.',
    image: DEFAULT_IMAGE,
    keywords: 'SaaS, quick ratio, business metrics',
  },

  // ============================================================
  // RESEARCH PAGE
  // ============================================================
  '/research': {
    title: 'Research | TechScoop - Reports & Analysis',
    description: 'In-depth research reports and analysis on MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'research, reports, analysis, MENA tech',
  },

  // ============================================================
  // COMPANY PAGES
  // ============================================================
  '/about': {
    title: 'About TechScoop | MENA\'s Tech Ecosystem Platform',
    description: 'Learn about TechScoop, MENA\'s leading technology publication and ecosystem platform.',
    image: DEFAULT_IMAGE,
    keywords: 'about, TechScoop, MENA tech',
  },
  '/contact': {
    title: 'Contact Us | TechScoop',
    description: 'Get in touch with TechScoop. Contact us for partnerships, advertising, or general inquiries.',
    image: DEFAULT_IMAGE,
    keywords: 'contact, support, inquiries',
  },
  '/advertise': {
    title: 'Advertise with TechScoop | Reach MENA\'s Tech Audience',
    description: 'Advertise your product or service to TechScoop\'s engaged audience of tech professionals and entrepreneurs.',
    image: DEFAULT_IMAGE,
    keywords: 'advertising, advertise, sponsorship, marketing',
  },
  '/newsletter': {
    title: 'Newsletter | TechScoop - Stay Updated',
    description: 'Subscribe to TechScoop newsletter for the latest tech news and insights from MENA.',
    image: DEFAULT_IMAGE,
    keywords: 'newsletter, email, subscription',
  },

  // ============================================================
  // LEGAL PAGES
  // ============================================================
  '/terms': {
    title: 'Terms of Service | TechScoop',
    description: 'Read TechScoop\'s terms of service and conditions of use.',
    image: DEFAULT_IMAGE,
    keywords: 'terms, conditions, legal',
  },
  '/privacy': {
    title: 'Privacy Policy | TechScoop',
    description: 'Read TechScoop\'s privacy policy and data protection practices.',
    image: DEFAULT_IMAGE,
    keywords: 'privacy, data protection, GDPR',
  },

  // ============================================================
  // PARENT CATEGORY PAGES
  // These are the 34 top-level category pages that receive articles.
  // All need proper meta tags to avoid the noindex fallback.
  // ============================================================
  '/ai-data': {
    title: 'AI & Data News | TechScoop - MENA Tech',
    description: 'Latest artificial intelligence and data news from MENA. Covering AI startups, machine learning, data analytics, and GenAI across the Middle East.',
    image: DEFAULT_IMAGE,
    keywords: 'AI, artificial intelligence, data, machine learning, MENA, Middle East',
  },
  '/ai-ml': {
    title: 'AI & Machine Learning | TechScoop - MENA Tech',
    description: 'AI and machine learning news and insights from MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'AI, machine learning, deep learning, MENA tech',
  },
  '/climate-energy': {
    title: 'Climate & Energy Tech | TechScoop - MENA',
    description: 'Climate technology, clean energy, and sustainability news from MENA. Covering agritech, energytech, and climatetech startups.',
    image: DEFAULT_IMAGE,
    keywords: 'climate tech, energy, sustainability, agritech, MENA',
  },
  '/cloud-infra-data-centers': {
    title: 'Cloud Infrastructure & Data Centers | TechScoop - MENA',
    description: 'Cloud infrastructure, data centers, and DevOps news from MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'cloud, infrastructure, data centers, DevOps, MENA',
  },
  '/cybersecurity': {
    title: 'Cybersecurity News | TechScoop - MENA',
    description: 'Cybersecurity news and insights from MENA. Covering data privacy, fraud risk, identity access, and security startups.',
    image: DEFAULT_IMAGE,
    keywords: 'cybersecurity, security, data privacy, fraud, MENA',
  },
  '/design': {
    title: 'Design & UX | TechScoop - MENA Tech',
    description: 'Design and user experience news and insights from MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'design, UX, UI, product design, MENA',
  },
  '/ecommerce-retail-tech': {
    title: 'E-Commerce & Retail Tech | TechScoop - MENA',
    description: 'E-commerce and retail technology news from MENA. Covering marketplaces, foodtech, delivery, and retail innovation.',
    image: DEFAULT_IMAGE,
    keywords: 'e-commerce, retail tech, marketplaces, foodtech, MENA',
  },
  '/engineering': {
    title: 'Engineering | TechScoop - MENA Tech',
    description: 'Engineering news and insights from MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'engineering, software engineering, tech, MENA',
  },
  '/enterprise-saas': {
    title: 'Enterprise & SaaS | TechScoop - MENA',
    description: 'Enterprise software and SaaS news from MENA. Covering B2B software, cloud tools, and enterprise technology.',
    image: DEFAULT_IMAGE,
    keywords: 'enterprise, SaaS, B2B software, cloud, MENA',
  },
  '/events-conferences': {
    title: 'Tech Events & Conferences | TechScoop - MENA',
    description: 'Tech events and conference news from MENA. Covering awards, hackathons, demo days, and industry conferences.',
    image: DEFAULT_IMAGE,
    keywords: 'tech events, conferences, hackathons, MENA events',
  },
  '/fintech': {
    title: 'Fintech News | TechScoop - MENA',
    description: 'Fintech news and insights from MENA. Covering digital banking, payments, BNPL, open banking, and financial technology.',
    image: DEFAULT_IMAGE,
    keywords: 'fintech, digital banking, payments, BNPL, MENA fintech',
  },
  '/funding-vc': {
    title: 'Funding & Venture Capital | TechScoop - MENA',
    description: 'Startup funding and venture capital news from MENA. Track investment rounds, VC activity, and capital raises across the Middle East.',
    image: DEFAULT_IMAGE,
    keywords: 'funding, venture capital, VC, investment, MENA startups',
  },
  '/govtech-defense-space': {
    title: 'GovTech, Defense & Space | TechScoop - MENA',
    description: 'Government technology, defense, and space news from MENA. Covering smart cities, national programs, and spacetech.',
    image: DEFAULT_IMAGE,
    keywords: 'govtech, defense, space, smart cities, MENA',
  },
  '/hardware-robotics-iot': {
    title: 'Hardware, Robotics & IoT | TechScoop - MENA',
    description: 'Hardware, robotics, and IoT news from MENA. Covering drones, consumer devices, industrial robotics, and connected technology.',
    image: DEFAULT_IMAGE,
    keywords: 'hardware, robotics, IoT, drones, MENA tech',
  },
  '/healthtech': {
    title: 'Healthtech News | TechScoop - MENA',
    description: 'Health technology news from MENA. Covering digital health, medtech, biotech, and wellness technology.',
    image: DEFAULT_IMAGE,
    keywords: 'healthtech, digital health, medtech, biotech, MENA',
  },
  '/jobs-talent': {
    title: 'Jobs & Talent | TechScoop - MENA',
    description: 'Jobs and talent news from MENA\'s tech ecosystem. Covering hiring trends, career growth, and the tech job market.',
    image: DEFAULT_IMAGE,
    keywords: 'jobs, talent, hiring, careers, MENA tech',
  },
  '/jobs-and-talent': {
    title: 'Jobs & Talent | TechScoop - MENA',
    description: 'Jobs and talent news from MENA\'s tech ecosystem. Covering hiring trends, career growth, and the tech job market.',
    image: DEFAULT_IMAGE,
    keywords: 'jobs, talent, hiring, careers, MENA tech',
  },
  '/marketing': {
    title: 'Marketing | TechScoop - MENA Tech',
    description: 'Marketing news and insights from MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'marketing, digital marketing, growth, MENA',
  },
  '/markets-ipo-ma': {
    title: 'Markets, IPO & M&A | TechScoop - MENA',
    description: 'Capital markets, IPO, and M&A news from MENA. Covering public markets, exits, and mergers and acquisitions.',
    image: DEFAULT_IMAGE,
    keywords: 'markets, IPO, M&A, mergers, acquisitions, MENA',
  },
  '/media-gaming-creator-economy': {
    title: 'Media, Gaming & Creator Economy | TechScoop - MENA',
    description: 'Media, gaming, and creator economy news from MENA. Covering gaming startups, streaming, and the creator economy.',
    image: DEFAULT_IMAGE,
    keywords: 'media, gaming, creator economy, streaming, MENA',
  },
  '/mobility-logistics': {
    title: 'Mobility & Logistics | TechScoop - MENA',
    description: 'Mobility and logistics technology news from MENA. Covering EV charging, supply chain, aviation tech, and logistics startups.',
    image: DEFAULT_IMAGE,
    keywords: 'mobility, logistics, EV, supply chain, MENA',
  },
  '/operations': {
    title: 'Operations | TechScoop - MENA Tech',
    description: 'Operations and business management news from MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'operations, business, management, MENA',
  },
  '/partnerships-deals': {
    title: 'Partnerships & Deals | TechScoop - MENA',
    description: 'Partnership and deal news from MENA\'s tech ecosystem. Covering strategic alliances, joint ventures, and vendor agreements.',
    image: DEFAULT_IMAGE,
    keywords: 'partnerships, deals, alliances, MENA tech',
  },
  '/people-leadership': {
    title: 'People & Leadership | TechScoop - MENA',
    description: 'Leadership and people news from MENA\'s tech ecosystem. Covering founders, executives, and key hires.',
    image: DEFAULT_IMAGE,
    keywords: 'people, leadership, founders, executives, MENA',
  },
  '/powerlist': {
    title: 'Powerlist | TechScoop - MENA\'s Most Influential',
    description: 'TechScoop Powerlist — the most influential people and companies in MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'powerlist, influential, leaders, MENA tech',
  },
  '/press-editorial': {
    title: 'Press & Editorial | TechScoop - MENA',
    description: 'Press releases, opinion pieces, and editorial content from MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'press release, editorial, opinion, MENA tech',
  },
  '/product': {
    title: 'Product | TechScoop - MENA Tech',
    description: 'Product news and insights from MENA\'s tech ecosystem.',
    image: DEFAULT_IMAGE,
    keywords: 'product, product management, MENA tech',
  },
  '/proptech-real-estate': {
    title: 'Proptech & Real Estate | TechScoop - MENA',
    description: 'Property technology and real estate news from MENA. Covering proptech startups, smart cities, and real estate platforms.',
    image: DEFAULT_IMAGE,
    keywords: 'proptech, real estate, smart cities, MENA',
  },
  '/regtech-compliance': {
    title: 'RegTech & Compliance | TechScoop - MENA',
    description: 'Regulatory technology and compliance news from MENA. Covering AML, KYC, data protection, and licensing.',
    image: DEFAULT_IMAGE,
    keywords: 'regtech, compliance, AML, KYC, MENA regulations',
  },
  '/retail-hospitality-tech': {
    title: 'Retail & Hospitality Tech | TechScoop - MENA',
    description: 'Retail and hospitality technology news from MENA. Covering restaurant tech, POS systems, and loyalty programs.',
    image: DEFAULT_IMAGE,
    keywords: 'retail tech, hospitality, restaurant tech, POS, MENA',
  },
  '/startups': {
    title: 'Startups | TechScoop - MENA\'s Startup Ecosystem',
    description: 'Startup news and insights from MENA. Covering founder stories, startup ecosystems, and emerging companies.',
    image: DEFAULT_IMAGE,
    keywords: 'startups, MENA startups, founders, startup ecosystem',
  },
  '/telecom-connectivity': {
    title: 'Telecom & Connectivity | TechScoop - MENA',
    description: 'Telecom and connectivity news from MENA. Covering 5G, satellite connectivity, eSIM, and telco partnerships.',
    image: DEFAULT_IMAGE,
    keywords: 'telecom, connectivity, 5G, satellite, MENA',
  },
  '/web3-blockchain': {
    title: 'Web3 & Blockchain | TechScoop - MENA',
    description: 'Web3 and blockchain news from MENA. Covering crypto markets, tokenization, DeFi, and blockchain startups.',
    image: DEFAULT_IMAGE,
    keywords: 'web3, blockchain, crypto, tokenization, MENA',
  },
};

/**
 * Generate meta tags for static pages
 */
/**
 * Generate WebSite + Organization JSON-LD for the homepage.
 * This is critical for brand search ("techscoop" showing in Google).
 */
function generateHomepageJsonLd(): string {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "TechScoop",
      "alternateName": ["Tech Scoop", "TechScoop.io"],
      "url": BASE_URL,
      "description": "MENA's leading technology publication covering startups, venture capital, tech jobs, and innovation across the Middle East and North Africa.",
      "inLanguage": "en",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${BASE_URL}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "TechScoop",
      "alternateName": "TechScoop.io",
      "url": BASE_URL,
      "logo": DEFAULT_IMAGE,
      "description": "MENA's leading technology publication and ecosystem platform.",
      "sameAs": [
        "https://twitter.com/techaborad",
        "https://www.linkedin.com/company/techscoop"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "url": `${BASE_URL}/contact`
      }
    }
  ];
  return `<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>`;
}

export function generateStaticPageMetaTags(url: string): string {
  const cleanPath = url.split('?')[0].split('#')[0];
  const seo = staticPagesSEO[cleanPath];

  if (!seo) {
    // Fallback for unknown pages - return noindex to prevent thin content indexing
    // NOTE: Known category pages should be handled by SSR before reaching here
    return `
      <title>TechScoop | MENA's Tech Ecosystem Platform</title>
      <meta name="description" content="TechScoop is MENA's leading technology publication covering startups, venture capital, tech jobs, and innovation." />
      <meta name="robots" content="noindex, follow" />
      <link rel="canonical" href="${BASE_URL}${cleanPath}" />
    `;
  }

  const escapedTitle = escapeHtml(seo.title);
  const escapedDescription = escapeHtml(seo.description);
  const escapedKeywords = seo.keywords ? escapeHtml(seo.keywords) : '';
  const robotsDirective = seo.robots || 'index, follow';
  
  // Add WebSite + Organization JSON-LD only for homepage
  const jsonLd = cleanPath === '/' ? generateHomepageJsonLd() : '';

  return `
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta name="robots" content="${robotsDirective}" />
    ${escapedKeywords ? `<meta name="keywords" content="${escapedKeywords}" />` : ''}
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${BASE_URL}${cleanPath}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:site_name" content="TechScoop" />
    <meta property="og:locale" content="en_US" />
    ${seo.image ? `<meta property="og:image" content="${seo.image}" />
    <meta property="og:image:secure_url" content="${seo.image}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />` : ''}
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@techaborad" />
    <meta name="twitter:url" content="${BASE_URL}${cleanPath}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    ${seo.image ? `<meta name="twitter:image" content="${seo.image}" />` : ''}
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${BASE_URL}${cleanPath}" />
    
    ${jsonLd}
  `;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
