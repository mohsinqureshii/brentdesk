/**
 * Central publication configuration — the single source of truth for the
 * publication's identity. Import from here instead of hardcoding the brand:
 * services, SEO, emails, prompts, and UI all consume these values so the
 * publication can be re-pointed (name, domain, socials) in one place.
 *
 * Isomorphic: safe to import from both server and client code. The canonical
 * base URL can be overridden at runtime on the server via the BASE_URL env
 * var (see getBaseUrl()).
 */

export const publication = {
  /** Display name used in titles, bylines, and structured data. */
  name: "BrentDesk",
  /** Lowercase wordmark rendered in the header/footer. */
  wordmark: "brentdesk.",
  /** Legal entity used in copyright lines and terms. */
  legalName: "BrentDesk Media",
  /** Apex domain (no scheme). */
  domain: "brentdesk.com",
  /** Canonical base URL. Server code should prefer getBaseUrl(). */
  siteUrl: "https://brentdesk.com",

  tagline: "Industry, infrastructure and the physical economy",
  /**
   * One-paragraph editorial description used for meta descriptions,
   * organization schema, and the footer.
   */
  description:
    "BrentDesk covers the physical economy — construction, infrastructure, " +
    "energy, manufacturing, logistics, transportation, mining, utilities and " +
    "industrial technology — across Saudi Arabia, the GCC, MENA and the " +
    "markets connected to them.",
  keywords:
    "construction news, infrastructure, energy, oil and gas, manufacturing, " +
    "logistics, transportation, mining, utilities, industrial technology, " +
    "Saudi Arabia, GCC, MENA, projects, contracts, EPC",

  locale: "en",
  timezone: "Asia/Riyadh",
  /** Geographic focus, in priority order. Used by editorial config and SEO. */
  geoPriority: ["Saudi Arabia", "GCC", "MENA", "Global"] as const,

  emails: {
    hello: "hello@brentdesk.com",
    newsletter: "newsletter@brentdesk.com",
    media: "media@brentdesk.com",
    advertising: "advertise@brentdesk.com",
    noreply: "noreply@brentdesk.com",
  },

  social: {
    x: "https://x.com/brentdesk",
    linkedin: "https://www.linkedin.com/company/brentdesk",
    instagram: "https://www.instagram.com/brentdesk",
    youtube: "https://www.youtube.com/@brentdesk",
  },
  /** Handle used for twitter:site cards. */
  xHandle: "@brentdesk",

  assets: {
    /** Paths under client/public. */
    logo: "/assets/logo.svg",
    logoDark: "/assets/logo-dark.svg",
    ogImage: "/assets/og-image.png",
    favicon: "/assets/favicon.svg",
    icon192: "/assets/icon-192x192.png",
    icon512: "/assets/icon-512x512.png",
    appleTouchIcon: "/assets/apple-touch-icon.png",
  },

  newsletter: {
    name: "BrentDesk Daily",
    description:
      "The top industrial, infrastructure and energy stories from Saudi " +
      "Arabia, the GCC and MENA in your inbox every morning.",
  },

  /** Bot/user-agent identities for outbound crawlers. */
  bots: {
    seoAudit: "BrentDeskSEOBot/1.0 (+https://brentdesk.com/about)",
    newsAgent:
      "Mozilla/5.0 (compatible; BrentDesk-Agent/1.0; +https://brentdesk.com/about)",
    imageSearch: "BrentDesk/1.0 (https://brentdesk.com)",
    eventCoverage: "Mozilla/5.0 (compatible; BrentDeskCoverageBot/1.0)",
  },

  /**
   * Physical mailing address required by CAN-SPAM in email footers.
   * Placeholder until the legal entity's registered address is final.
   */
  postalAddress: "BrentDesk Media, Riyadh, Saudi Arabia",

  foundedYear: 2026,
} as const;

export type Publication = typeof publication;

/**
 * Base URL for absolute link generation. On the server, the BASE_URL env var
 * overrides the canonical siteUrl (useful for staging). On the client this
 * always returns the canonical siteUrl.
 */
export function getBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.BASE_URL) {
    return process.env.BASE_URL.replace(/\/+$/, "");
  }
  return publication.siteUrl;
}

/** Absolute URL for a site path, using the runtime base URL. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Copyright line for footers, emails, and generated documents. */
export function copyrightLine(year: number = new Date().getFullYear()): string {
  return `© ${year} ${publication.legalName}. All rights reserved.`;
}
