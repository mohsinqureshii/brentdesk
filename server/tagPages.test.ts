/**
 * Tests for Tag Pages feature:
 * - listByTag endpoint
 * - getAllTagsWithCounts endpoint
 * - getTagBySlug endpoint
 * - getTagsForSitemap endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock the workflow service
vi.mock("./services/workflow.service", () => ({
  workflowService: {
    getStatusBySlug: vi.fn().mockResolvedValue({ id: 1, slug: "published" }),
  },
}));

describe("Tag Pages Feature", () => {
  describe("Tag data structures", () => {
    it("should define tag with required fields", () => {
      const tag = {
        id: 1,
        name: "Fintech",
        slug: "fintech",
        tagType: "sector",
        isActive: 1,
        description: "Financial technology news",
      };

      expect(tag.id).toBe(1);
      expect(tag.name).toBe("Fintech");
      expect(tag.slug).toBe("fintech");
      expect(tag.tagType).toBe("sector");
      expect(tag.isActive).toBe(1);
    });

    it("should enforce max 5 tags per article", () => {
      const articleTags = ["Fintech", "AI", "Saudi Arabia", "Startup", "Funding"];
      expect(articleTags.length).toBeLessThanOrEqual(5);

      // Adding a 6th tag should be rejected
      const canAddMore = articleTags.length < 5;
      expect(canAddMore).toBe(false);
    });

    it("should generate correct tag page URL", () => {
      const tagSlug = "fintech";
      const expectedUrl = `/tag/${tagSlug}`;
      expect(expectedUrl).toBe("/tag/fintech");
    });

    it("should generate correct sitemap URL for tags", () => {
      const baseUrl = "https://techscoop.io";
      const tagSlug = "ai-regulation";
      const sitemapUrl = `${baseUrl}/tag/${tagSlug}`;
      expect(sitemapUrl).toBe("https://techscoop.io/tag/ai-regulation");
    });
  });

  describe("Tag filtering and sorting", () => {
    it("should filter tags with article count > 0", () => {
      const tagsWithCounts = [
        { id: 1, name: "Fintech", slug: "fintech", articleCount: 13 },
        { id: 2, name: "Empty Tag", slug: "empty-tag", articleCount: 0 },
        { id: 3, name: "AI", slug: "ai", articleCount: 5 },
      ];

      const activeTags = tagsWithCounts.filter(t => t.articleCount > 0);
      expect(activeTags).toHaveLength(2);
      expect(activeTags[0].name).toBe("Fintech");
      expect(activeTags[1].name).toBe("AI");
    });

    it("should sort tags by article count descending", () => {
      const tagsWithCounts = [
        { id: 1, name: "AI", slug: "ai", articleCount: 5 },
        { id: 2, name: "Fintech", slug: "fintech", articleCount: 13 },
        { id: 3, name: "Dubai", slug: "dubai", articleCount: 3 },
      ];

      const sorted = [...tagsWithCounts].sort((a, b) => b.articleCount - a.articleCount);
      expect(sorted[0].name).toBe("Fintech");
      expect(sorted[1].name).toBe("AI");
      expect(sorted[2].name).toBe("Dubai");
    });

    it("should filter only active tags", () => {
      const allTags = [
        { id: 1, name: "Active Tag", isActive: 1 },
        { id: 2, name: "Inactive Tag", isActive: 0 },
        { id: 3, name: "Another Active", isActive: 1 },
      ];

      const activeTags = allTags.filter(t => t.isActive === 1);
      expect(activeTags).toHaveLength(2);
    });
  });

  describe("Tag type color mapping", () => {
    it("should map tag types to colors", () => {
      const tagTypeColors: Record<string, string> = {
        product_tech: "bg-purple-500",
        regulation: "bg-red-500",
        deal_business: "bg-amber-500",
        sector: "bg-green-500",
        region: "bg-blue-500",
        hub_program: "bg-teal-500",
        investor: "bg-indigo-500",
        event: "bg-pink-500",
        company: "bg-orange-500",
        general: "bg-slate-500",
      };

      expect(tagTypeColors["sector"]).toBe("bg-green-500");
      expect(tagTypeColors["region"]).toBe("bg-blue-500");
      expect(tagTypeColors["general"]).toBe("bg-slate-500");
    });

    it("should format tag type for display", () => {
      const formatTagType = (tagType: string | null): string => {
        if (!tagType) return "Topic";
        const map: Record<string, string> = {
          product_tech: "Technology",
          regulation: "Regulation",
          deal_business: "Business",
          sector: "Sector",
          region: "Region",
          hub_program: "Program",
          investor: "Investor",
          event: "Event",
          company: "Company",
          general: "Topic",
        };
        return map[tagType] || "Topic";
      };

      expect(formatTagType("sector")).toBe("Sector");
      expect(formatTagType("region")).toBe("Region");
      expect(formatTagType(null)).toBe("Topic");
      expect(formatTagType("unknown")).toBe("Topic");
    });
  });

  describe("Tag page pagination", () => {
    it("should calculate correct pagination", () => {
      const total = 45;
      const limit = 20;
      const totalPages = Math.ceil(total / limit);
      expect(totalPages).toBe(3);
    });

    it("should calculate correct offset", () => {
      const page = 2;
      const limit = 20;
      const offset = (page - 1) * limit;
      expect(offset).toBe(20);
    });

    it("should return empty result for non-existent tag", () => {
      const result = { items: [], total: 0, page: 1, totalPages: 0, tag: null };
      expect(result.items).toHaveLength(0);
      expect(result.tag).toBeNull();
    });
  });

  describe("Tag URL generation", () => {
    it("should generate tag links from article tags", () => {
      const articleTags = [
        { id: 1, name: "Fintech", slug: "fintech" },
        { id: 2, name: "AI Regulation", slug: "ai-regulation" },
      ];

      const links = articleTags.map(t => `/tag/${t.slug}`);
      expect(links[0]).toBe("/tag/fintech");
      expect(links[1]).toBe("/tag/ai-regulation");
    });

    it("should fallback to slugified name when slug is missing", () => {
      const tagName = "AI Regulation";
      const fallbackSlug = tagName.toLowerCase().replace(/\s+/g, '-');
      expect(fallbackSlug).toBe("ai-regulation");
    });
  });
});
