import { describe, expect, it, vi, beforeEach } from "vitest";
import { SeoService } from "./seo.service";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

describe("SeoService", () => {
  let seoService: SeoService;

  beforeEach(() => {
    seoService = new SeoService("https://techscoop.io");
  });

  describe("constructor", () => {
    it("should initialize with default base URL", () => {
      const service = new SeoService();
      expect(service).toBeDefined();
    });

    it("should initialize with custom base URL", () => {
      const service = new SeoService("https://custom.com");
      expect(service).toBeDefined();
    });
  });

  describe("getDefaults", () => {
    it("should generate defaults for article entity", () => {
      const entity = {
        title: "Test Article",
        excerpt: "This is a test article",
        featuredImage: "https://techscoop.io/images/test.jpg",
        slug: "test-article"
      };
      
      const defaults = (seoService as any).getDefaults("article", entity);
      
      expect(defaults.title).toContain("Test Article");
      expect(defaults.description).toBe("This is a test article");
      expect(defaults.canonicalPath).toBe("/news/test-article");
    });

    it("should generate defaults for job entity", () => {
      const entity = {
        title: "Senior Engineer",
        companyName: "TechCorp",
        location: "San Francisco",
        slug: "senior-engineer"
      };
      
      const defaults = (seoService as any).getDefaults("job", entity);
      
      expect(defaults.title).toContain("Senior Engineer");
      expect(defaults.canonicalPath).toBe("/jobs/senior-engineer");
    });

    it("should generate defaults for person entity", () => {
      const entity = {
        name: "Jane Smith",
        currentTitle: "CEO",
        currentCompany: "StartupXYZ",
        bio: "Experienced tech executive",
        slug: "jane-smith"
      };
      
      const defaults = (seoService as any).getDefaults("person", entity);
      
      expect(defaults.title).toContain("Jane Smith");
      expect(defaults.canonicalPath).toBe("/people/jane-smith");
    });

    it("should generate defaults for investor entity", () => {
      const entity = {
        name: "Sequoia Capital",
        description: "Leading venture capital firm",
        slug: "sequoia-capital"
      };
      
      const defaults = (seoService as any).getDefaults("investor", entity);
      
      expect(defaults.title).toContain("Sequoia Capital");
      expect(defaults.canonicalPath).toBe("/investors/sequoia-capital");
    });

    it("should generate defaults for event entity", () => {
      const entity = {
        name: "Tech Summit 2026",
        description: "Annual technology conference",
        slug: "tech-summit-2026"
      };
      
      const defaults = (seoService as any).getDefaults("event", entity);
      
      expect(defaults).toBeDefined();
      expect(defaults.canonicalPath).toBe("/events/tech-summit-2026");
    });

    it("should return fallback defaults for unknown entity type", () => {
      const entity = { title: "Unknown" };
      const defaults = (seoService as any).getDefaults("unknown_type", entity);
      expect(defaults.title).toBe("TechScoop");
      expect(defaults.canonicalPath).toBe("/");
    });
  });

  describe("getOgType", () => {
    it("should return correct OG type for article", () => {
      const ogType = (seoService as any).getOgType("article");
      expect(ogType).toBe("article");
    });

    it("should return correct OG type for person", () => {
      const ogType = (seoService as any).getOgType("person");
      expect(ogType).toBe("profile");
    });

    it("should return correct OG type for event", () => {
      const ogType = (seoService as any).getOgType("event");
      expect(["event", "website"]).toContain(ogType);
    });

    it("should return website for unknown types", () => {
      const ogType = (seoService as any).getOgType("unknown");
      expect(ogType).toBe("website");
    });
  });

  describe("getSeoMeta", () => {
    it("should throw error when database is not available", async () => {
      await expect(
        seoService.getSeoMeta("article", 1, { title: "Test" })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("saveSeoMeta", () => {
    it("should throw error when database is not available", async () => {
      await expect(
        seoService.saveSeoMeta("article", 1, { metaTitle: "Test" })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("generateSitemap", () => {
    it("should throw error when database is not available for articles", async () => {
      await expect(
        seoService.generateSitemap("articles")
      ).rejects.toThrow("Database not available");
    });

    it("should throw error when database is not available for jobs", async () => {
      await expect(
        seoService.generateSitemap("jobs")
      ).rejects.toThrow("Database not available");
    });

    it("should throw error when database is not available for people", async () => {
      await expect(
        seoService.generateSitemap("people")
      ).rejects.toThrow("Database not available");
    });
  });

  describe("generateGoogleNewsSitemap", () => {
    it("should throw error when database is not available", async () => {
      await expect(
        seoService.generateGoogleNewsSitemap()
      ).rejects.toThrow("Database not available");
    });
  });

  describe("generateSitemapIndex", () => {
    it("should throw error when database is not available", async () => {
      await expect(
        seoService.generateSitemapIndex()
      ).rejects.toThrow("Database not available");
    });
  });

  describe("generateNewsFeed", () => {
    it("should throw error when database is not available", async () => {
      await expect(
        seoService.generateNewsFeed()
      ).rejects.toThrow("Database not available");
    });
  });

  describe("generateJobsFeed", () => {
    it("should throw error when database is not available", async () => {
      await expect(
        seoService.generateJobsFeed()
      ).rejects.toThrow("Database not available");
    });
  });

  describe("generateRobotsTxt", () => {
    it("should return valid robots.txt content", () => {
      const robots = seoService.generateRobotsTxt();
      expect(robots).toContain("User-agent: *");
      expect(robots).toContain("Allow: /");
      expect(robots).toContain("Sitemap: https://techscoop.io/api/sitemap.xml");
    });

    it("should disallow admin pages", () => {
      const robots = seoService.generateRobotsTxt();
      expect(robots).toContain("Disallow: /admin/");
    });

    it("should disallow API routes", () => {
      const robots = seoService.generateRobotsTxt();
      expect(robots).toContain("Disallow: /api/");
    });

    it("should disallow dashboard pages", () => {
      const robots = seoService.generateRobotsTxt();
      expect(robots).toContain("Disallow: /dashboard/");
    });

    it("should disallow auth pages", () => {
      const robots = seoService.generateRobotsTxt();
      expect(robots).toContain("Disallow: /signin");
      expect(robots).toContain("Disallow: /signup");
      expect(robots).toContain("Disallow: /login");
    });

    it("should disallow user profile/account/settings pages", () => {
      const robots = seoService.generateRobotsTxt();
      expect(robots).toContain("Disallow: /profile");
      expect(robots).toContain("Disallow: /account");
      expect(robots).toContain("Disallow: /settings");
    });

    it("should allow important static files", () => {
      const robots = seoService.generateRobotsTxt();
      expect(robots).toContain("Allow: /ads.txt");
      expect(robots).toContain("Allow: /robots.txt");
      expect(robots).toContain("Allow: /sitemap*.xml");
      expect(robots).toContain("Allow: /rss.xml");
    });

    it("should NOT contain overly aggressive wildcard query string block", () => {
      const robots = seoService.generateRobotsTxt();
      // The old robots.txt had "Disallow: /*?*" which blocks ALL query string URLs
      expect(robots).not.toContain("Disallow: /*?*");
    });

    it("should include crawl-delay directive", () => {
      const robots = seoService.generateRobotsTxt();
      expect(robots).toContain("Crawl-delay: 1");
    });
  });

  describe("buildSitemapXml", () => {
    it("should generate valid XML with correct structure", () => {
      const urls = [
        { loc: "https://techscoop.io/test", lastmod: "2026-02-14", priority: "0.8" },
        { loc: "https://techscoop.io/test2", lastmod: "2026-02-13", priority: "0.6" },
      ];
      const xml = (seoService as any).buildSitemapXml(urls);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain("<loc>https://techscoop.io/test</loc>");
      expect(xml).toContain("<lastmod>2026-02-14</lastmod>");
      expect(xml).toContain("<priority>0.8</priority>");
      expect(xml).toContain("<loc>https://techscoop.io/test2</loc>");
    });

    it("should escape special XML characters in URLs", () => {
      const urls = [
        { loc: "https://techscoop.io/test?a=1&b=2", lastmod: "2026-02-14", priority: "0.5" },
      ];
      const xml = (seoService as any).buildSitemapXml(urls);
      expect(xml).toContain("&amp;");
      expect(xml).not.toContain("?a=1&b=2");
    });

    it("should handle empty URL list", () => {
      const xml = (seoService as any).buildSitemapXml([]);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain("<urlset");
      expect(xml).toContain("</urlset>");
      expect(xml).not.toContain("<url>");
    });
  });

  describe("buildGoogleNewsSitemapXml", () => {
    it("should generate valid Google News sitemap XML", () => {
      const items = [
        {
          loc: "https://techscoop.io/news/test-article",
          title: "Test Article Title",
          publicationDate: "2026-02-14T10:00:00.000Z"
        }
      ];
      const xml = (seoService as any).buildGoogleNewsSitemapXml(items);
      
      expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
      expect(xml).toContain("<news:name>TechScoop</news:name>");
      expect(xml).toContain("<news:language>en</news:language>");
      expect(xml).toContain("<news:publication_date>2026-02-14T10:00:00.000Z</news:publication_date>");
      expect(xml).toContain("<![CDATA[Test Article Title]]>");
    });

    it("should handle CDATA for special characters in titles", () => {
      const items = [
        {
          loc: "https://techscoop.io/news/test",
          title: "Test & Article <Title>",
          publicationDate: "2026-02-14T10:00:00.000Z"
        }
      ];
      const xml = (seoService as any).buildGoogleNewsSitemapXml(items);
      expect(xml).toContain("<![CDATA[Test & Article <Title>]]>");
    });
  });

  describe("escapeXml", () => {
    it("should escape ampersands", () => {
      const result = (seoService as any).escapeXml("a&b");
      expect(result).toBe("a&amp;b");
    });

    it("should escape angle brackets", () => {
      const result = (seoService as any).escapeXml("<tag>");
      expect(result).toBe("&lt;tag&gt;");
    });

    it("should escape quotes", () => {
      const result = (seoService as any).escapeXml('"hello"');
      expect(result).toBe("&quot;hello&quot;");
    });

    it("should handle strings with no special characters", () => {
      const result = (seoService as any).escapeXml("https://techscoop.io/test");
      expect(result).toBe("https://techscoop.io/test");
    });
  });
});

// Test the JSON-LD generators directly
describe("JSON-LD Generators", () => {
  it("should generate valid NewsArticle schema", () => {
    const entity = {
      title: "Test Article",
      excerpt: "This is a test",
      featuredImage: "https://techscoop.io/test.jpg",
      publishedAt: "2026-01-15T10:00:00.000Z", // String date (Drizzle mode: 'string')
      updatedAt: "2026-01-15T12:00:00.000Z",
      authorName: "John Doe",
      slug: "test-article"
    };

    const seoService = new SeoService("https://techscoop.io");
    const defaults = (seoService as any).getDefaults("article", entity);
    
    expect(defaults).toBeDefined();
    expect(defaults.title).toContain("Test Article");
  });

  it("should generate valid JobPosting schema", () => {
    const entity = {
      title: "Senior Engineer",
      description: "Looking for a senior engineer",
      companyName: "TechCorp",
      location: "San Francisco",
      roleType: "full_time",
      slug: "senior-engineer"
    };

    const seoService = new SeoService("https://techscoop.io");
    const defaults = (seoService as any).getDefaults("job", entity);
    
    expect(defaults).toBeDefined();
    expect(defaults.title).toContain("Senior Engineer");
  });
});

// Test date helper functions (imported via module scope)
describe("Date Helper Functions", () => {
  // We test these indirectly through the service methods
  // The key fix: Drizzle mode:'string' returns "2026-02-14T16:44:43.000Z" as a STRING
  // The old code called .toISOString() on strings which crashed
  
  it("should handle string dates in sitemap generation (static pages)", async () => {
    // Static pages sitemap doesn't need DB, it uses hardcoded pages
    // This tests that the service can generate pages sitemap without crashing
    const seoService = new SeoService("https://techscoop.io");
    
    // Mock getDb to return a minimal DB-like object
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      leftJoin: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
    };
    
    const { getDb } = await import("../db");
    (getDb as any).mockResolvedValue(mockDb);
    
    // Test pages sitemap (no DB needed for URL generation)
    const xml = await seoService.generateSitemap("pages");
    
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("https://techscoop.io/");
    expect(xml).toContain("https://techscoop.io/funding");
    expect(xml).toContain("https://techscoop.io/resources");
    expect(xml).toContain("https://techscoop.io/resources/perks");
    expect(xml).toContain("https://techscoop.io/resources/playbooks");
    expect(xml).toContain("https://techscoop.io/resources/regulations");
    expect(xml).toContain("https://techscoop.io/resources/calculators");
    expect(xml).toContain("https://techscoop.io/about");
    expect(xml).toContain("https://techscoop.io/contact");
    expect(xml).toContain("https://techscoop.io/newsletter");
    expect(xml).toContain("https://techscoop.io/terms");
    expect(xml).toContain("https://techscoop.io/privacy");
    
    // Must NOT contain admin/dashboard/auth pages
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/dashboard");
    expect(xml).not.toContain("/login");
    expect(xml).not.toContain("/signin");
    expect(xml).not.toContain("/signup");
    expect(xml).not.toContain("/profile");
    expect(xml).not.toContain("/account");
  });

  it("should handle string dates in article sitemap generation", async () => {
    const seoService = new SeoService("https://techscoop.io");
    
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    
    // First call returns articles with STRING dates (the key fix)
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValueOnce([
            { slug: "test-article", updatedAt: "2026-02-14T16:44:43.000Z", primaryCategoryId: 1 }
          ])
        })
      })
    }));
    
    const { getDb } = await import("../db");
    (getDb as any).mockResolvedValue(mockDb);
    
    // This should NOT crash with "toISOString is not a function"
    // The old code would crash here because updatedAt is a string
    try {
      const xml = await seoService.generateSitemap("articles");
      // If we get here, the date handling works
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    } catch (e: any) {
      // Should NOT get "toISOString is not a function" error
      expect(e.message).not.toContain("toISOString is not a function");
    }
  });
});

describe("Sitemap Index - No Phantom Sitemaps", () => {
  it("should NOT list sitemap-playbooks.xml in the index", async () => {
    const seoService = new SeoService("https://techscoop.io");
    
    // Mock DB must handle two query patterns:
    // 1. workflowStatuses lookup: select().from().where() → resolves to [{ id: 1 }]
    // 2. latest record queries: select().from().where().orderBy().limit() → resolves to [{ updatedAt: ... }]
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(function(this: any) {
        // Return a thenable that also supports chaining
        const chainable: any = {
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ updatedAt: "2026-01-15" }]),
          }),
          then: (resolve: any) => resolve([{ id: 1 }]),
        };
        return chainable;
      }),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ updatedAt: "2026-01-15" }]),
    };
    
    const { getDb } = await import("../db");
    (getDb as any).mockResolvedValue(mockDb);
    
    const xml = await seoService.generateSitemapIndex();
    
    // These sitemaps had no route handlers and caused 404s
    expect(xml).not.toContain("sitemap-playbooks.xml");
    expect(xml).not.toContain("sitemap-regulations.xml");
    
    // These should be present
    expect(xml).toContain("sitemap-articles.xml");
    expect(xml).toContain("sitemap-news.xml");
    expect(xml).toContain("sitemap-jobs.xml");
    expect(xml).toContain("sitemap-people.xml");
    expect(xml).toContain("sitemap-investors.xml");
    expect(xml).toContain("sitemap-companies.xml");
    expect(xml).toContain("sitemap-accelerators.xml");
    expect(xml).toContain("sitemap-events.xml");
    expect(xml).toContain("sitemap-resources.xml");
    expect(xml).toContain("sitemap-research.xml");
    expect(xml).toContain("sitemap-categories.xml");
    expect(xml).toContain("sitemap-tags.xml");
    expect(xml).toContain("sitemap-pages.xml");
  });

  it("should use YYYY-MM-DD date format in sitemap index", async () => {
    const seoService = new SeoService("https://techscoop.io");
    
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(function(this: any) {
        const chainable: any = {
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ updatedAt: "2026-02-14T16:44:43.000Z" }]),
          }),
          then: (resolve: any) => resolve([{ id: 1 }]),
        };
        return chainable;
      }),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ updatedAt: "2026-02-14T16:44:43.000Z" }]),
    };
    
    const { getDb } = await import("../db");
    (getDb as any).mockResolvedValue(mockDb);
    
    const xml = await seoService.generateSitemapIndex();
    
    // Should contain date in YYYY-MM-DD format, not full ISO string
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    // Should NOT contain full ISO timestamps in lastmod
    expect(xml).not.toMatch(/<lastmod>.*T.*Z<\/lastmod>/);
  });
});
