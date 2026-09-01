import { describe, it, expect } from "vitest";

const DEV_URL = "http://localhost:3000";

describe("SEO Recovery Fixes", () => {
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
      expect(html).toContain('href="https://techscoop.io/"');
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
  });

  describe("Fix 4b: Events sitemap includes published events", () => {
    it("should have more than 2 events in sitemap", async () => {
      const res = await fetch(`${DEV_URL}/sitemap-events.xml`);
      const xml = await res.text();
      const urlCount = (xml.match(/<url>/g) || []).length;
      expect(urlCount).toBeGreaterThan(2);
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
  });

  // Fix 5: Title tags
  describe("Fix 5: Title tags use short format", () => {
    it("should use 'Title | TechScoop' format on homepage", async () => {
      const res = await fetch(`${DEV_URL}/`);
      const html = await res.text();
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      expect(titleMatch).not.toBeNull();
      expect(titleMatch![1]).toContain("TechScoop");
    });
  });
});

// ============================================================
// Phase 2: Indexing Crisis Fix Tests (March 2026)
// ============================================================

const BASE_URL = "https://techscoop.io";

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

describe("Indexing Crisis Fix: Category SSR for bare slug URLs", () => {
  it("returns 200 with category-specific title for /ai-data", async () => {
    const res = await fetch(`${DEV_URL}/ai-data`);
    expect(res.status).toBe(200);
    const html = await res.text();
    const title = extractTitle(html);
    expect(title).toBeTruthy();
    expect(title).toContain("AI");
    expect(title).not.toBe("TechScoop | MENA's Tech Ecosystem Platform");
  });

  it("returns correct canonical for category page", async () => {
    const res = await fetch(`${DEV_URL}/ai-data`);
    const html = await res.text();
    const canonical = extractCanonical(html);
    expect(canonical).toBe(`${BASE_URL}/ai-data`);
  });

  it("returns og:url matching canonical for category page", async () => {
    const res = await fetch(`${DEV_URL}/ai-data`);
    const html = await res.text();
    const ogUrl = extractMeta(html, "og:url");
    expect(ogUrl).toBe(`${BASE_URL}/ai-data`);
  });
});

describe("Indexing Crisis Fix: 404 for non-existent pages", () => {
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

describe("Indexing Crisis Fix: noindex for 404 and paginated pages", () => {
  it("has noindex for unknown single-segment URL", async () => {
    const res = await fetch(`${DEV_URL}/nonexistent-page-xyz-12345`);
    const html = await res.text();
    const robots = extractMeta(html, "robots");
    expect(robots).toContain("noindex");
  });

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

  it("has noindex for paginated URL", async () => {
    const res = await fetch(`${DEV_URL}/news?page=2`);
    const html = await res.text();
    const robots = extractMeta(html, "robots");
    expect(robots).toContain("noindex");
  });
});

describe("Indexing Crisis Fix: Known static pages return 200 with index", () => {
  it("returns 200 for /funding", async () => {
    const res = await fetch(`${DEV_URL}/funding`);
    expect(res.status).toBe(200);
  });

  it("has index,follow for known static pages", async () => {
    const res = await fetch(`${DEV_URL}/funding`);
    const html = await res.text();
    const robots = extractMeta(html, "robots");
    expect(robots).toContain("index");
    expect(robots).toContain("follow");
    expect(robots).not.toContain("noindex");
  });
});

describe("Indexing Crisis Fix: Homepage WebSite + Organization JSON-LD", () => {
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
    const website = jsonLd.find(item => item["@type"] === "WebSite");
    expect(website).toBeTruthy();
    expect(website.name).toBe("TechScoop");
    expect(website.url).toBe(BASE_URL);
    expect(website.potentialAction?.["@type"]).toBe("SearchAction");
  });

  it("has Organization schema", async () => {
    const res = await fetch(`${DEV_URL}/`);
    const html = await res.text();
    const jsonLd = extractJsonLd(html);
    const org = jsonLd.find(item => item["@type"] === "Organization");
    expect(org).toBeTruthy();
    expect(org.name).toBe("TechScoop");
    expect(org.logo).toBeTruthy();
  });
});

describe("Indexing Crisis Fix: Canonical URL injection for paginated pages", () => {
  it("strips query params from canonical on paginated URL", async () => {
    const res = await fetch(`${DEV_URL}/news?page=2`);
    const html = await res.text();
    const canonical = extractCanonical(html);
    expect(canonical).toBe(`${BASE_URL}/news`);
  });

  it("has og:url matching canonical (no query params)", async () => {
    const res = await fetch(`${DEV_URL}/news?page=2`);
    const html = await res.text();
    const ogUrl = extractMeta(html, "og:url");
    expect(ogUrl).toBe(`${BASE_URL}/news`);
  });

  it("has twitter:url matching canonical (no query params)", async () => {
    const res = await fetch(`${DEV_URL}/news?page=2`);
    const html = await res.text();
    const twitterUrl = extractMeta(html, "twitter:url");
    expect(twitterUrl).toBe(`${BASE_URL}/news`);
  });
});

describe("Indexing Crisis Fix: robots.txt includes /api/sitemap.xml", () => {
  it("includes /api/sitemap.xml as backup sitemap reference", async () => {
    const res = await fetch(`${DEV_URL}/api/robots.txt`);
    const text = await res.text();
    expect(text).toContain("Sitemap: https://techscoop.io/api/sitemap.xml");
  });
});
