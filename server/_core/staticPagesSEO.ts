/**
 * Static Pages SEO Configuration
 * Defines meta tags for all static pages (homepage, about, etc.)
 * Also covers all parent category pages to prevent noindex fallback.
 *
 * Publication identity comes from shared/publication.ts — do not hardcode
 * the brand or domain here.
 */

import { publication, getBaseUrl } from "../../shared/publication";

export interface StaticPageSEO {
  title: string;
  description: string;
  image?: string;
  keywords?: string;
  robots?: string; // Override robots directive (default: "index, follow")
}

const NAME = publication.name;
const DEFAULT_IMAGE = `${publication.siteUrl}${publication.assets.ogImage}`;

/**
 * SEO configuration for all static pages
 */
export const staticPagesSEO: Record<string, StaticPageSEO> = {
  // ============================================================
  // CORE PAGES
  // ============================================================
  "/": {
    title: `${NAME} | ${publication.seoTagline}`,
    description: publication.description,
    image: DEFAULT_IMAGE,
    keywords: publication.keywords,
  },
  "/news": {
    title: `Industry News | ${NAME}`,
    description:
      "The latest construction, infrastructure, energy, manufacturing and logistics news from Saudi Arabia, the GCC and MENA.",
    image: DEFAULT_IMAGE,
    keywords:
      "industry news, construction news, infrastructure news, energy news, Saudi Arabia, GCC, MENA",
  },
  "/jobs": {
    title: `Industry Jobs | ${NAME}`,
    description:
      "Find jobs in construction, energy, infrastructure, manufacturing and logistics across Saudi Arabia, the GCC and MENA.",
    image: DEFAULT_IMAGE,
    keywords:
      "industrial jobs, construction jobs, energy jobs, engineering jobs, Saudi Arabia jobs, GCC jobs",
  },
  "/companies": {
    title: `Companies | ${NAME}`,
    description:
      "Profiles of the contractors, developers, operators, manufacturers and industrial companies shaping the region's physical economy.",
    image: DEFAULT_IMAGE,
    keywords:
      "industrial companies, contractors, developers, EPC, manufacturers, company directory",
  },
  "/people": {
    title: `People | ${NAME}`,
    description:
      "Executives, engineers and decision-makers across construction, energy, infrastructure and industry in Saudi Arabia, the GCC and MENA.",
    image: DEFAULT_IMAGE,
    keywords: "industry executives, energy leaders, construction leaders, MENA",
  },
  "/events": {
    title: `Industry Events | ${NAME}`,
    description:
      "Conferences, expos and forums across construction, energy, infrastructure, logistics and industry in Saudi Arabia, the GCC and beyond.",
    image: DEFAULT_IMAGE,
    keywords: "industry events, construction expo, energy conference, infrastructure forum, Saudi Arabia events",
  },
  "/search": {
    title: `Search | ${NAME}`,
    description: `Search ${NAME} articles, companies, people, events and jobs.`,
    robots: "noindex, follow",
  },
  "/sitemap": {
    title: `Sitemap | ${NAME}`,
    description: `Browse all sections of ${NAME}.`,
    robots: "noindex, follow",
  },

  // ============================================================
  // COMPANY / STATIC PAGES
  // ============================================================
  "/about": {
    title: `About | ${NAME}`,
    description: publication.description,
    image: DEFAULT_IMAGE,
  },
  "/contact": {
    title: `Contact | ${NAME}`,
    description: `Get in touch with the ${NAME} newsroom, advertising and partnerships teams.`,
  },
  "/advertise": {
    title: `Advertise | ${NAME}`,
    description: `Reach decision-makers across construction, energy, infrastructure and industry with ${NAME}.`,
  },
  "/newsletter": {
    title: `${publication.newsletter.name} | ${NAME}`,
    description: publication.newsletter.description,
  },
  "/terms": {
    title: `Terms of Service | ${NAME}`,
    description: `Terms of service for ${NAME}.`,
    robots: "noindex, follow",
  },
  "/privacy": {
    title: `Privacy Policy | ${NAME}`,
    description: `Privacy policy for ${NAME}.`,
    robots: "noindex, follow",
  },

  // ============================================================
  // PARENT CATEGORY PAGES (industrial taxonomy)
  // Keep in sync with the category seed in scripts/seed-brentdesk.ts.
  // ============================================================
  "/construction": {
    title: `Construction | ${NAME}`,
    description:
      "Construction news across Saudi Arabia, the GCC and MENA — contract awards, project milestones, contractors and building technology.",
    image: DEFAULT_IMAGE,
  },
  "/infrastructure": {
    title: `Infrastructure | ${NAME}`,
    description:
      "Infrastructure programs, transport networks, water, telecom and public works across Saudi Arabia, the GCC and MENA.",
    image: DEFAULT_IMAGE,
  },
  "/energy": {
    title: `Energy | ${NAME}`,
    description:
      "Oil & gas, power, renewables and utilities — projects, investment and policy across the region's energy complex.",
    image: DEFAULT_IMAGE,
  },
  "/manufacturing": {
    title: `Manufacturing | ${NAME}`,
    description:
      "Factories, industrial facilities, localization programs and manufacturing investment across Saudi Arabia, the GCC and MENA.",
    image: DEFAULT_IMAGE,
  },
  "/logistics": {
    title: `Logistics | ${NAME}`,
    description:
      "Ports, warehousing, supply chain and freight — the networks moving goods through Saudi Arabia, the GCC and MENA.",
    image: DEFAULT_IMAGE,
  },
  "/real-estate": {
    title: `Real Estate | ${NAME}`,
    description:
      "Major real estate development — giga-projects, master plans, commercial and industrial property across the region.",
    image: DEFAULT_IMAGE,
  },
  "/transportation": {
    title: `Transportation | ${NAME}`,
    description:
      "Aviation, rail, roads and mobility infrastructure across Saudi Arabia, the GCC and MENA.",
    image: DEFAULT_IMAGE,
  },
  "/mining": {
    title: `Mining | ${NAME}`,
    description:
      "Mining, metals and minerals — exploration, processing and the industrial supply chains built on them.",
    image: DEFAULT_IMAGE,
  },
  "/utilities": {
    title: `Utilities | ${NAME}`,
    description:
      "Power, water and waste — utility projects, operators and regulation across the region.",
    image: DEFAULT_IMAGE,
  },
  "/industrial-technology": {
    title: `Industrial Technology | ${NAME}`,
    description:
      "Automation, robotics, industrial AI, data centers and the technology transforming heavy industry.",
    image: DEFAULT_IMAGE,
  },
};

/**
 * Generate WebSite + Organization JSON-LD for the homepage.
 * This is critical for brand search showing correctly in Google.
 */
function generateHomepageJsonLd(): string {
  const BASE_URL = getBaseUrl();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: NAME,
      url: BASE_URL,
      description: publication.description,
      inLanguage: "en",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "NewsMediaOrganization",
      name: NAME,
      legalName: publication.legalName,
      url: BASE_URL,
      logo: `${BASE_URL}${publication.assets.logo}`,
      description: publication.description,
      sameAs: Object.values(publication.social),
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: publication.emails.hello,
        url: `${BASE_URL}/contact`,
      },
    },
  ];
  return `<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>`;
}

export function generateStaticPageMetaTags(url: string): string {
  const BASE_URL = getBaseUrl();
  const cleanPath = url.split("?")[0].split("#")[0];
  const seo = staticPagesSEO[cleanPath];

  if (!seo) {
    // Fallback for unknown pages - return noindex to prevent thin content indexing
    // NOTE: Known category pages should be handled by SSR before reaching here
    return `
      <title>${escapeHtml(NAME)} | ${escapeHtml(publication.seoTagline)}</title>
      <meta name="description" content="${escapeHtml(publication.description)}" />
      <meta name="robots" content="noindex, follow" />
      <link rel="canonical" href="${BASE_URL}${cleanPath}" />
    `;
  }

  const escapedTitle = escapeHtml(seo.title);
  const escapedDescription = escapeHtml(seo.description);
  const escapedKeywords = seo.keywords ? escapeHtml(seo.keywords) : "";
  const robotsDirective = seo.robots || "index, follow";

  // Add WebSite + Organization JSON-LD only for homepage
  const jsonLd = cleanPath === "/" ? generateHomepageJsonLd() : "";

  return `
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta name="robots" content="${robotsDirective}" />
    ${escapedKeywords ? `<meta name="keywords" content="${escapedKeywords}" />` : ""}

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${BASE_URL}${cleanPath}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:site_name" content="${escapeHtml(NAME)}" />
    <meta property="og:locale" content="en_US" />
    ${seo.image ? `<meta property="og:image" content="${seo.image}" />
    <meta property="og:image:secure_url" content="${seo.image}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />` : ""}

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="${publication.xHandle}" />
    <meta name="twitter:url" content="${BASE_URL}${cleanPath}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    ${seo.image ? `<meta name="twitter:image" content="${seo.image}" />` : ""}

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
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
