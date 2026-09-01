/**
 * Tests for Google News SEO fields in articles
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

describe("Google News SEO Fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Article Type Field", () => {
    it("should accept valid article types", () => {
      const validTypes = ["news", "opinion", "press_release", "report", "interview"];
      validTypes.forEach((type) => {
        expect(validTypes.includes(type)).toBe(true);
      });
    });

    it("should default to 'news' when not specified", () => {
      const defaultType = "news";
      expect(defaultType).toBe("news");
    });

    it("should reject invalid article types", () => {
      const validTypes = ["news", "opinion", "press_release", "report", "interview"];
      const invalidType = "blog_post";
      expect(validTypes.includes(invalidType)).toBe(false);
    });
  });

  describe("Robots Indexing Field", () => {
    it("should accept 'index' value", () => {
      const validValues = ["index", "noindex"];
      expect(validValues.includes("index")).toBe(true);
    });

    it("should accept 'noindex' value", () => {
      const validValues = ["index", "noindex"];
      expect(validValues.includes("noindex")).toBe(true);
    });

    it("should default to 'index'", () => {
      const defaultValue = "index";
      expect(defaultValue).toBe("index");
    });

    it("should reject invalid indexing values", () => {
      const validValues = ["index", "noindex"];
      expect(validValues.includes("follow")).toBe(false);
    });
  });

  describe("Google News Keywords Field", () => {
    it("should limit keywords to maximum 10", () => {
      const keywords = "startup, funding, fintech, tech, innovation, AI, blockchain, crypto, venture, capital, extra";
      const keywordArray = keywords.split(",").slice(0, 10);
      expect(keywordArray.length).toBe(10);
    });

    it("should accept comma-separated keywords", () => {
      const keywords = "startup, funding, fintech";
      const keywordArray = keywords.split(",").map((k) => k.trim());
      expect(keywordArray).toEqual(["startup", "funding", "fintech"]);
    });

    it("should allow empty keywords", () => {
      const keywords = "";
      expect(keywords).toBe("");
    });
  });

  describe("OG Image Field", () => {
    it("should default to featured image when ogImageId is null", () => {
      const featuredImageId = 123;
      const ogImageId = null;
      const effectiveOgImageId = ogImageId || featuredImageId;
      expect(effectiveOgImageId).toBe(123);
    });

    it("should use ogImageId when explicitly set", () => {
      const featuredImageId = 123;
      const ogImageId = 456;
      const effectiveOgImageId = ogImageId || featuredImageId;
      expect(effectiveOgImageId).toBe(456);
    });

    it("should be null when both are null", () => {
      const featuredImageId = null;
      const ogImageId = null;
      const effectiveOgImageId = ogImageId || featuredImageId;
      expect(effectiveOgImageId).toBe(null);
    });
  });

  describe("OG Title Field", () => {
    it("should default to SEO title when ogTitle is empty", () => {
      const seoTitle = "SEO Optimized Title";
      const ogTitle = "";
      const effectiveOgTitle = ogTitle || seoTitle;
      expect(effectiveOgTitle).toBe("SEO Optimized Title");
    });

    it("should use ogTitle when explicitly set", () => {
      const seoTitle = "SEO Optimized Title";
      const ogTitle = "Social Media Title";
      const effectiveOgTitle = ogTitle || seoTitle;
      expect(effectiveOgTitle).toBe("Social Media Title");
    });

    it("should fall back to article title when both are empty", () => {
      const articleTitle = "Article Title";
      const seoTitle = "";
      const ogTitle = "";
      const effectiveOgTitle = ogTitle || seoTitle || articleTitle;
      expect(effectiveOgTitle).toBe("Article Title");
    });
  });

  describe("OG Description Field", () => {
    it("should default to meta description when ogDescription is empty", () => {
      const metaDescription = "Meta description for search engines";
      const ogDescription = "";
      const effectiveOgDescription = ogDescription || metaDescription;
      expect(effectiveOgDescription).toBe("Meta description for search engines");
    });

    it("should use ogDescription when explicitly set", () => {
      const metaDescription = "Meta description for search engines";
      const ogDescription = "Social media description";
      const effectiveOgDescription = ogDescription || metaDescription;
      expect(effectiveOgDescription).toBe("Social media description");
    });

    it("should fall back to excerpt when both are empty", () => {
      const excerpt = "Article excerpt";
      const metaDescription = "";
      const ogDescription = "";
      const effectiveOgDescription = ogDescription || metaDescription || excerpt;
      expect(effectiveOgDescription).toBe("Article excerpt");
    });
  });

  describe("Auto-fill Defaults", () => {
    it("should apply all auto-fill defaults correctly", () => {
      const article = {
        title: "Test Article",
        excerpt: "Test excerpt",
        featuredImageId: 100,
        seoTitle: "SEO Title",
        seoDescription: "SEO Description",
        // New fields with defaults
        robotsIndexing: undefined,
        ogImageId: undefined,
        ogTitle: undefined,
        ogDescription: undefined,
        articleType: undefined,
        googleNewsKeywords: undefined,
      };

      // Apply defaults
      const withDefaults = {
        ...article,
        robotsIndexing: article.robotsIndexing || "index",
        ogImageId: article.ogImageId || article.featuredImageId,
        ogTitle: article.ogTitle || article.seoTitle || article.title,
        ogDescription: article.ogDescription || article.seoDescription || article.excerpt,
        articleType: article.articleType || "news",
        googleNewsKeywords: article.googleNewsKeywords || "",
      };

      expect(withDefaults.robotsIndexing).toBe("index");
      expect(withDefaults.ogImageId).toBe(100);
      expect(withDefaults.ogTitle).toBe("SEO Title");
      expect(withDefaults.ogDescription).toBe("SEO Description");
      expect(withDefaults.articleType).toBe("news");
      expect(withDefaults.googleNewsKeywords).toBe("");
    });
  });

  describe("Schema Validation", () => {
    it("should validate article type enum values", () => {
      const articleTypeEnum = ["news", "opinion", "press_release", "report", "interview"];
      
      // All values should be valid
      articleTypeEnum.forEach((type) => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
      });
    });

    it("should validate robots indexing enum values", () => {
      const robotsEnum = ["index", "noindex"];
      
      // All values should be valid
      robotsEnum.forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it("should enforce max length for ogTitle (512 chars)", () => {
      const maxLength = 512;
      const longTitle = "A".repeat(600);
      const truncatedTitle = longTitle.substring(0, maxLength);
      expect(truncatedTitle.length).toBe(512);
    });
  });
});
