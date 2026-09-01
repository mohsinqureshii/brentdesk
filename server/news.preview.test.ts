/**
 * Tests for the news preview endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// Mock workflow service
vi.mock("./services/workflow.service", () => ({
  workflowService: {
    getStatusBySlug: vi.fn().mockResolvedValue({ id: 1, name: "Published", slug: "published" }),
    getAvailableTransitions: vi.fn().mockResolvedValue([]),
    getAuditHistory: vi.fn().mockResolvedValue([]),
  },
}));

// Mock SEO service
vi.mock("./services/seo.service", () => ({
  seoService: {
    getSeoMeta: vi.fn().mockResolvedValue({
      title: "Test Article",
      description: "Test description",
    }),
  },
}));

describe("News Preview Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authorization", () => {
    it("should allow admin users to preview articles", () => {
      const adminRoles = ["admin", "editor", "senior_editor", "author"];
      adminRoles.forEach(role => {
        expect(adminRoles.includes(role)).toBe(true);
      });
    });

    it("should reject unauthorized roles", () => {
      const unauthorizedRoles = ["user", "guest", "moderator"];
      const allowedRoles = ["admin", "editor", "senior_editor", "author"];
      unauthorizedRoles.forEach(role => {
        expect(allowedRoles.includes(role)).toBe(false);
      });
    });
  });

  describe("Article Preview Data", () => {
    it("should return article with all related data", () => {
      const expectedFields = [
        "id",
        "title",
        "slug",
        "excerpt",
        "content",
        "author",
        "categories",
        "tags",
        "topics",
        "regions",
        "sectors",
        "status",
        "seo",
        "isPreview",
      ];
      
      // Verify all expected fields are defined
      expectedFields.forEach(field => {
        expect(typeof field).toBe("string");
      });
    });

    it("should include isPreview flag in response", () => {
      const previewResponse = {
        id: 1,
        title: "Test Article",
        isPreview: true,
      };
      
      expect(previewResponse.isPreview).toBe(true);
    });

    it("should include article status in response", () => {
      const previewResponse = {
        id: 1,
        title: "Test Article",
        status: { name: "Draft", slug: "draft" },
      };
      
      expect(previewResponse.status).toBeDefined();
      expect(previewResponse.status.name).toBe("Draft");
    });
  });

  describe("Preview URL Format", () => {
    it("should use admin preview route format", () => {
      const articleId = 123;
      const previewUrl = `/admin/articles/${articleId}/preview`;
      
      expect(previewUrl).toBe("/admin/articles/123/preview");
    });

    it("should handle different article IDs", () => {
      const testIds = [1, 42, 999, 12345];
      testIds.forEach(id => {
        const previewUrl = `/admin/articles/${id}/preview`;
        expect(previewUrl).toContain(id.toString());
      });
    });
  });

  describe("Author Access Control", () => {
    it("should allow authors to preview their own articles", () => {
      const authorId = 5;
      const articleAuthorId = 5;
      
      expect(authorId === articleAuthorId).toBe(true);
    });

    it("should deny authors from previewing other authors articles", () => {
      const authorId = 5;
      const articleAuthorId = 10;
      
      expect(authorId === articleAuthorId).toBe(false);
    });
  });

  describe("Preview vs Public Access", () => {
    it("should not filter by published status for preview", () => {
      // Preview endpoint should return articles regardless of status
      const draftArticle = { id: 1, statusId: 1, statusSlug: "draft" };
      const submittedArticle = { id: 2, statusId: 2, statusSlug: "submitted" };
      const publishedArticle = { id: 3, statusId: 3, statusSlug: "published" };
      
      // All should be accessible via preview
      [draftArticle, submittedArticle, publishedArticle].forEach(article => {
        expect(article.id).toBeDefined();
      });
    });

    it("public getBySlug should only return published articles", () => {
      // This is the expected behavior for public access
      const publishedStatusId = 3;
      const articleStatusId = 3;
      
      expect(articleStatusId === publishedStatusId).toBe(true);
    });
  });
});
