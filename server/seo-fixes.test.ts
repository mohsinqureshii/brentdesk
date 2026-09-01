/**
 * End-to-end SEO checks against a RUNNING dev server (default
 * http://localhost:3000). These cannot run in a bare test environment, so the
 * whole suite is gated on a quick reachability probe and skips cleanly when
 * no server is listening.
 *
 * All brand-coupled expectations are derived from shared/publication.ts.
 */
import { describe, it, expect } from "vitest";
import { getBaseUrl, publication } from "@shared/publication";

const DEV_URL = process.env.SEO_TEST_DEV_URL || "http://localhost:3000";
const BASE_URL = getBaseUrl();

/**
 * Probe the dev server and discover the base URL it stamps into canonicals,
 * og:url and JSON-LD (its own BASE_URL env — http://localhost:3000 in dev,
 * the canonical publication URL in staging/production). robots.txt embeds it
 * in every Sitemap line.
 */
async function probeServer(): Promise<{ up: boolean; base: string }> {
  try {
    const res = await fetch(`${DEV_URL}/robots.txt`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.status >= 500) return { up: false, base: BASE_URL };
    const text = await res.text();
    const m = text.match(/^Sitemap:\s*(https?:\/\/[^/\s]+)\//m);
    return { up: true, base: m ? m[1] : BASE_URL };
  } catch {
    return { up: false, base: BASE_URL };
  }
}

const { up: serverUp, base: SERVER_BASE } = await probeServer();

describe.runIf(serverUp)("SEO Recovery Fixes", () => {
  // Fix 1: robots.txt
  describe("Fix 1: robots.txt blocks admin and lists all sitemaps", () => {
    it("should block /admin/ in robots.txt", async () => {
      const res = await fetch(`${DEV_URL}/robots.txt`);
      const text = await res.text();
      expect(text).toContain("Disallow: /admin/");
    });

    it("should block /api/trpc/ in robots.txt", async () => {
      const res = await fetch(`${DEV_URL}/robots.txt`);
      const text = await res.text();
      expect(text).toContain("Disallow: /api/trpc/");
    });

    it("should block /login in robots.txt", async () => {
      const res = await fetch(`${DEV_URL}/robots.txt`);
      const text = await res.text();
      expect(text).toContain("Disallow: /login");
    });

    it("should block pagination URLs in robots.txt", async () => {
      const res = await fetch(`${DEV_URL}/robots.txt`);
      const text = await res.text();
      expect(text).toContain("Disallow: /*?page=");
    });

    it("should block retired public sections in robots.txt", async () => {
      // Investors/Accelerators/Funding/Resources were retired with the
      // BrentDesk relaunch; robots.txt now disallows them.
      const res = await fetch(`${DEV_URL}/robots.txt`);
      const text = await res.text();
      expect(text).toContain("Disallow: /investors");
      expect(text).toContain("Disallow: /accelerators");
      expect(text).toContain("Disallow: /funding");
      expect(text).toContain("Disallow: /resources");
    });

    it("should list all module sitemaps in robots.txt", async () => {
      const res = await fetch(`${DEV_URL}/robots.txt`);
      const text = await res.text();
      expect(text).toContain("sitemap-articles.xml");
      expect(text).toContain("sitemap-events.xml");
      expect(text).toContain("sitemap-jobs.xml");
      expect(text).toContain("sitemap-people.xml");
      expect(text).toContain("sitemap-companies.xml");
      expect(text).toContain("sitemap-pages.xml");
      expect(text).toContain("sitemap-tags.xml");
    });

    it("should NOT list retired module sitemaps in robots.txt", async () => {
      const res = await fetch(`${DEV_URL}/robots.txt`);
      const text = await res.text();
      expect(text).not.toContain("sitemap-investors.xml");
      expect(text).not.toContain("sitemap-accelerators.xml");
      expect(text).not.toContain("sitemap-resources.xml");
      expect(text).not.toContain("sitemap-research.xml");
    });
  });

  // Fix 2: noindex on admin pages
  describe("Fix 2: Admin pages have noindex meta tag", () => {
    it("should add noindex to /admin/dashboard", async () => {
      const res = await fetch(`${DEV_URL}/admin/dashboard`);
      const html = await res.text();
      expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    });

    it("should add noindex to /login", async () => {
      const res = await fetch(`${DEV_URL}/login`);
      const html = await res.text();
      expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    });

    it("should NOT add noindex to homepage", async () => {
      const res = await fetch(`${DEV_URL}/`);
      const html = await res.text();
      expect(html).not.toContain('content="noindex');
    });
  });

  // Fix 3: Canonical tag - no duplicate homepage canonical
  describe("Fix 3: Correct canonical tags per page", () => {
    it("should have exactly one canonical on homepage pointing to homepage", async () => {
      const res = await fetch(`${DEV_URL}/`);
      const html = await res.text();
      const canonicalMatches = html.match(/<link rel="canonical"/g);
      expect(canonicalMatches).not.toBeNull();
      expect(canonicalMatches!.length).toBe(1);
      expect(html).toContain(`href="${SERVER_BASE}/"`);
    });

    it("should NOT have hardcoded homepage canonical in index.html template", async () => {
      const res = await fetch(`${DEV_URL}/`);
      const html = await res.text();
      // The comment should indicate dynamic injection
      expect(html).toContain("canonical URL injected dynamically by SSR per page");
    });
  });

  // Fix 4: Sitemap format and events fix
  describe("Fix 4: Sitemap is sitemapindex format", () => {
    it("should return sitemapindex format for /api/sitemap.xml", async () => {
      const res = await fetch(`${DEV_URL}/api/sitemap.xml`);
      const xml = await res.text();
      expect(xml).toContain("<sitemapindex");
      expect(xml).not.toContain("<urlset");
    });

    it("should list all module sitemaps in sitemapindex", async () => {
      const res = await fetch(`${DEV_URL}/api/sitemap.xml`);
      const xml = await res.text();
      expect(xml).toContain("sitemap-articles.xml");
      expect(xml).toContain("sitemap-events.xml");
      expect(xml).toContain("sitemap-pages.xml");
    });

    it("should NOT list retired module sitemaps in sitemapindex", async () => {
      const res = await fetch(`${DEV_URL}/api/sitemap.xml`);
      const xml = await res.text();
      expect(xml).not.toContain("sitemap-investors.xml");
      expect(xml).not.toContain("sitemap-accelerators.xml");
      expect(xml).not.toContain("sitemap-resources.xml");
      expect(xml).not.toContain("sitemap-research.xml");
    });
  });

  describe("Fix 4b: Events sitemap serves published events", () => {
    // Structural check rather than a content count — the backing database
    // may be freshly provisioned with no events yet.
    it("should serve a valid urlset document", async () => {
      const res = await fetch(`${DEV_URL}/sitemap-events.xml`);
      expect(res.status).toBe(200);
      const xml = await res.text();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain("<urlset");
      expect(xml).toContain("</urlset>");
    });
  });

  describe("Fix 4c: Pages sitemap excludes admin URLs", () => {
    it("should NOT contain /admin/ URLs in pages sitemap", async () => {
      const res = await fetch(`${DEV_URL}/sitemap-pages.xml`);
      const xml = await res.text();
      expect(xml).not.toContain("/admin/");
    });

    it("should NOT contain /login or /signup in pages sitemap", async () => {
      const res = await fetch(`${DEV_URL}/sitemap-pages.xml`);
      const xml = await res.text();
      expect(xml).not.toContain("/login");
      expect(xml).not.toContain("/signup");
    });

    it("should NOT contain retired sections in pages sitemap", async () => {
      const res = await fetch(`${DEV_URL}/sitemap-pages.xml`);
      const xml = await res.text();
      expect(xml).not.toContain("/investors");
      expect(xml).not.toContain("/accelerators");
      expect(xml).not.toContain("/funding");
      expect(xml).not.toContain("/resources");
    });
  });

  // Fix 5: Title tags
  describe("Fix 5: Title tags use short format", () => {
    it(`should use 'Title | ${publication.name}' format on homepage`, async () => {
      const res = await fetch(`${DEV_URL}/`);
      const html = await res.text();
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      expect(titleMatch).not.toBeNull();
      expect(titleMatch![1]).toContain(publication.name);
    });
  });
});

// ============================================================
// Phase 2: Indexing Crisis Fix Tests
// ============================================================

function extractMeta(html: string, name: string): string | null {
  const propMatch = html.match(new RegExp(`property="${name}"[^>]*content="([^"]*)"`, "i"));
  if (propMatch) return propMatch[1];
  const nameMatch = html.match(new RegExp(`name="${name}"[^>]*content="([^"]*)"`, "i"));
  if (nameMatch) return nameMatch[1];
  const revPropMatch = html.match(new RegExp(`content="([^"]*)"[^>]*property="${name}"`, "i"));
  if (revPropMatch) return revPropMatch[1];
  const revNameMatch = html.match(new RegExp(`content="([^"]*)"[^>]*name="${name}"`, "i"));
  if (revNameMatch) return revNameMatch[1];
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([^<]+)<\/title>/);
  return match ? match[1] : null;
}

function extractCanonical(html: string): string | null {
  const match = html.match(/rel="canonical"[^>]*href="([^"]*)"/);
  return match ? match[1] : null;
}

function extractJsonLd(html: string): any[] {
  const matches = html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g);
  const results: any[] = [];
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch {}
  }
  return results;
}

// A category from the publication's seeded taxonomy (see server/config/editorial.ts).
const CATEGORY_SLUG = "construction";
const CATEGORY_NAME = "Construction";

describe.runIf(serverUp)("Indexing Crisis Fix: Category SSR for bare slug URLs", () => {
  it(`returns 200 with category-specific title for /${CATEGORY_SLUG}`, async () => {
    const res = await fetch(`${DEV_URL}/${CATEGORY_SLUG}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    const title = extractTitle(html);
    expect(title).toBeTruthy();
    expect(title).toContain(CATEGORY_NAME);
  });

  it("returns correct canonical for category page", async () => {
    const res = await fetch(`${DEV_URL}/${CATEGORY_SLUG}`);
    const html = await res.text();
    const canonical = extractCanonical(html);
    expect(canonical).toBe(`${SERVER_BASE}/${CATEGORY_SLUG}`);
  });

  it("returns og:url matching canonical for category page", async () => {
    const res = await fetch(`${DEV_URL}/${CATEGORY_SLUG}`);
    const html = await res.text();
    const ogUrl = extractMeta(html, "og:url");
    expect(ogUrl).toBe(`${SERVER_BASE}/${CATEGORY_SLUG}`);
  });
});

describe.runIf(serverUp)("Indexing Crisis Fix: 404 for non-existent pages", () => {
  it("returns 404 for unknown single-segment URL", async () => {
    const res = await fetch(`${DEV_URL}/nonexistent-page-xyz-12345`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-existent article", async () => {
    const res = await fetch(`${DEV_URL}/news/nonexistent-article-xyz-12345`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-existent company", async () => {
    const res = await fetch(`${DEV_URL}/companies/nonexistent-company-xyz`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-existent tag", async () => {
    const res = await fetch(`${DEV_URL}/tag/nonexistent-tag-xyz`);
    expect(res.status).toBe(404);
  });
});

describe.runIf(serverUp)("Indexing Crisis Fix: noindex for 404 and paginated pages", () => {
  it("has noindex for unknown single-segment URL", async () => {
    const res = await fetch(`${DEV_URL}/nonexistent-page-xyz-12345`);
    const html = await res.text();
    const robots = extractMeta(html, "robots");
    expect(robots).toContain("noindex");
  });

  // (inject404Response was fixed to append the robots meta when the shell
  // template lacks one.) Original bug note: the
  // function is documented to return "a 404-safe HTML response with noindex",
  // but it only regex-REPLACES an existing <meta name="robots"> tag — and
  // client/index.html contains no robots meta, so entity-miss 404 pages
  // (missing article/company/etc.) ship with NO noindex directive at all.
  // Only the 404 status code protects them. Skipped until the injector
  // appends the tag when the template lacks one.
  it("has noindex for non-existent article", async () => {
    const res = await fetch(`${DEV_URL}/news/nonexistent-article-xyz-12345`);
    const html = await res.text();
    const robots = extractMeta(html, "robots");
    expect(robots).toContain("noindex");
  });

  it("has noindex for non-existent company", async () => {
    const res = await fetch(`${DEV_URL}/companies/nonexistent-company-xyz`);
    const html = await res.text();
    const robots = extractMeta(html, "robots");
    expect(robots).toContain("noindex");
  });

  it("does NOT noindex paginated URLs (canonical consolidates instead)", async () => {
    // Deliberate behavior change: pagination (?page=N) is no longer
    // noindex'd — the canonical pointing at page 1 consolidates ranking
    // signals while keeping deep pages crawlable (see the comment in
    // server/_core/vite.ts / ssrServe.ts).
    const res = await fetch(`${DEV_URL}/news?page=2`);
    const html = await res.text();
    const robots = extractMeta(html, "robots");
    expect(robots).not.toContain("noindex");
  });
});

describe.runIf(serverUp)("Indexing Crisis Fix: Known static pages return 200 with index", () => {
  // /funding (and the other retired sections) are no longer known static
  // pages — /about stands in as the canonical public static page.
  it("returns 200 for /about", async () => {
    const res = await fetch(`${DEV_URL}/about`);
    expect(res.status).toBe(200);
  });

  it("has index,follow for known static pages", async () => {
    const res = await fetch(`${DEV_URL}/about`);
    const html = await res.text();
    const robots = extractMeta(html, "robots");
    expect(robots).toContain("index");
    expect(robots).toContain("follow");
    expect(robots).not.toContain("noindex");
  });
});

describe.runIf(serverUp)("Indexing Crisis Fix: Homepage WebSite + Organization JSON-LD", () => {
  it("has JSON-LD on homepage", async () => {
    const res = await fetch(`${DEV_URL}/`);
    const html = await res.text();
    const jsonLd = extractJsonLd(html);
    expect(jsonLd.length).toBeGreaterThan(0);
  });

  it("has WebSite schema with SearchAction", async () => {
    const res = await fetch(`${DEV_URL}/`);
    const html = await res.text();
    const jsonLd = extractJsonLd(html);
    const websites = jsonLd.filter(item => item["@type"] === "WebSite");
    expect(websites.length).toBeGreaterThan(0);
    const website = websites.find(w => w.potentialAction?.["@type"] === "SearchAction");
    expect(website).toBeTruthy();
    expect(website.name).toBe(publication.name);
    // The static shell stamps the canonical publication URL; the SSR
    // injection stamps the server's own base URL. Accept either.
    const normalized = String(website.url).replace(/\/$/, "");
    expect([publication.siteUrl, SERVER_BASE]).toContain(normalized);
  });

  it("has Organization schema", async () => {
    const res = await fetch(`${DEV_URL}/`);
    const html = await res.text();
    const jsonLd = extractJsonLd(html);
    // The publisher schema was upgraded to the more specific
    // NewsMediaOrganization type; accept any Organization subtype.
    const org = jsonLd.find(item => String(item["@type"]).includes("Organization"));
    expect(org).toBeTruthy();
    expect(org.name).toBe(publication.name);
    expect(org.logo).toBeTruthy();
  });
});

describe.runIf(serverUp)("Indexing Crisis Fix: Canonical URL injection for paginated pages", () => {
  it("strips query params from canonical on paginated URL", async () => {
    const res = await fetch(`${DEV_URL}/news?page=2`);
    const html = await res.text();
    const canonical = extractCanonical(html);
    expect(canonical).toBe(`${SERVER_BASE}/news`);
  });

  it("has og:url matching canonical (no query params)", async () => {
    const res = await fetch(`${DEV_URL}/news?page=2`);
    const html = await res.text();
    const ogUrl = extractMeta(html, "og:url");
    expect(ogUrl).toBe(`${SERVER_BASE}/news`);
  });

  it("has twitter:url matching canonical (no query params)", async () => {
    const res = await fetch(`${DEV_URL}/news?page=2`);
    const html = await res.text();
    const twitterUrl = extractMeta(html, "twitter:url");
    expect(twitterUrl).toBe(`${SERVER_BASE}/news`);
  });
});

describe.runIf(serverUp)("Indexing Crisis Fix: robots.txt includes /api/sitemap.xml", () => {
  it("includes /api/sitemap.xml as backup sitemap reference", async () => {
    const res = await fetch(`${DEV_URL}/api/robots.txt`);
    const text = await res.text();
    expect(text).toContain(`Sitemap: ${SERVER_BASE}/api/sitemap.xml`);
  });
});
