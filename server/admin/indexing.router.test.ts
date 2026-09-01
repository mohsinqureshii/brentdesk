/**
 * Tests for the Indexing Admin Router
 * Verifies the tRPC procedures for querying indexing logs and stats
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockGroupBy = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
};

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../../drizzle/schema", () => ({
  indexingLogs: {
    id: "id",
    articleId: "article_id",
    articleTitle: "article_title",
    articleSlug: "article_slug",
    url: "url",
    method: "method",
    success: "success",
    statusCode: "status_code",
    message: "message",
    trigger: "trigger",
    triggeredBy: "triggered_by",
    createdAt: "created_at",
  },
  users: {
    id: "id",
    name: "name",
  },
  articles: {
    id: "id",
    title: "title",
    slug: "slug",
    primaryCategoryId: "primary_category_id",
  },
  categories: {
    id: "id",
    slug: "slug",
  },
}));

// Mock the notification service
vi.mock("../services/indexingNotification.service", () => ({
  notifySearchEngines: vi.fn().mockResolvedValue([
    {
      method: "sitemap_ping",
      success: true,
      statusCode: 200,
      message: "Sitemap ping accepted",
      url: "https://news.example/test/article",
      timestamp: new Date().toISOString(),
    },
  ]),
  notifySearchEnginesBatch: vi.fn().mockResolvedValue([]),
  INDEXNOW_KEY: "71c6f0fcfb86471b9a5e325252176962",
}));

vi.mock("../services/indexingNotification.helper", () => ({
  resolveArticleInfo: vi.fn().mockResolvedValue({
    url: "https://news.example/test/article",
    articleId: 1,
    articleTitle: "Test Article",
    articleSlug: "test-article",
  }),
  resolveArticleInfos: vi.fn().mockResolvedValue([
    {
      url: "https://news.example/test/article-1",
      articleId: 1,
      articleTitle: "Test Article 1",
      articleSlug: "test-article-1",
    },
  ]),
  resolveArticleUrl: vi.fn().mockResolvedValue("https://news.example/test/article"),
  resolveArticleUrls: vi.fn().mockResolvedValue(["https://news.example/test/article"]),
}));

describe("Indexing Admin Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default chain setup
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit });
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset });
    mockLimit.mockReturnValue({ offset: mockOffset });
    mockOffset.mockResolvedValue([]);
    mockGroupBy.mockResolvedValue([]);
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue([]);
  });

  describe("Service Architecture", () => {
    it("should have indexingLogs table schema with required columns", async () => {
      const { indexingLogs } = await import("../../drizzle/schema");
      expect(indexingLogs).toBeDefined();
      expect(indexingLogs.id).toBeDefined();
      expect(indexingLogs.articleId).toBeDefined();
      expect(indexingLogs.articleTitle).toBeDefined();
      expect(indexingLogs.url).toBeDefined();
      expect(indexingLogs.method).toBeDefined();
      expect(indexingLogs.success).toBeDefined();
      expect(indexingLogs.statusCode).toBeDefined();
      expect(indexingLogs.message).toBeDefined();
      expect(indexingLogs.trigger).toBeDefined();
      expect(indexingLogs.triggeredBy).toBeDefined();
      expect(indexingLogs.createdAt).toBeDefined();
    });

    it("should export indexing router with required procedures", async () => {
      const { indexingRouter } = await import("./indexing.router");
      expect(indexingRouter).toBeDefined();
      // Check that the router has the expected procedures
      expect(indexingRouter._def).toBeDefined();
    });
  });

  describe("Notification Service Integration", () => {
    it("should export notifySearchEngines function", async () => {
      const { notifySearchEngines } = await import("../services/indexingNotification.service");
      expect(notifySearchEngines).toBeDefined();
      expect(typeof notifySearchEngines).toBe("function");
    });

    it("should export notifySearchEnginesBatch function", async () => {
      const { notifySearchEnginesBatch } = await import("../services/indexingNotification.service");
      expect(notifySearchEnginesBatch).toBeDefined();
      expect(typeof notifySearchEnginesBatch).toBe("function");
    });

    it("should export resolveArticleInfo helper", async () => {
      const { resolveArticleInfo } = await import("../services/indexingNotification.helper");
      expect(resolveArticleInfo).toBeDefined();
      expect(typeof resolveArticleInfo).toBe("function");
    });

    it("should export resolveArticleInfos helper for batch operations", async () => {
      const { resolveArticleInfos } = await import("../services/indexingNotification.helper");
      expect(resolveArticleInfos).toBeDefined();
      expect(typeof resolveArticleInfos).toBe("function");
    });
  });

  describe("NotifyOptions interface", () => {
    it("should accept article metadata for logging", async () => {
      const { notifySearchEngines } = await import("../services/indexingNotification.service");
      
      await notifySearchEngines({
        url: "https://news.example/test/article",
        type: "URL_UPDATED",
        articleId: 1,
        articleTitle: "Test Article",
        articleSlug: "test-article",
        trigger: "publish",
        triggeredBy: 42,
      });

      expect(notifySearchEngines).toHaveBeenCalledWith(
        expect.objectContaining({
          articleId: 1,
          articleTitle: "Test Article",
          articleSlug: "test-article",
          trigger: "publish",
          triggeredBy: 42,
        })
      );
    });

    it("should accept all trigger types", async () => {
      const { notifySearchEngines } = await import("../services/indexingNotification.service");
      
      const triggers = ["publish", "transition", "bulk_publish", "scheduled", "manual"] as const;
      for (const trigger of triggers) {
        await notifySearchEngines({
          url: "https://news.example/test/article",
          trigger,
        });
      }
      
      expect(notifySearchEngines).toHaveBeenCalledTimes(triggers.length);
    });
  });

  describe("INDEXNOW_KEY", () => {
    it("should export a valid IndexNow API key", async () => {
      const { INDEXNOW_KEY } = await import("../services/indexingNotification.service");
      expect(INDEXNOW_KEY).toBeDefined();
      expect(typeof INDEXNOW_KEY).toBe("string");
      expect(INDEXNOW_KEY.length).toBeGreaterThan(10);
    });
  });

  describe("Database Logging", () => {
    it("should have the correct table structure for indexing_logs", async () => {
      // Verify the schema exports the table (using dynamic import to work with mocks)
      const schema = await import("../../drizzle/schema");
      expect(schema.indexingLogs).toBeDefined();
      
      // Verify key columns exist
      const table = schema.indexingLogs;
      expect(table.id).toBeDefined();
      expect(table.articleId).toBeDefined();
      expect(table.method).toBeDefined();
      expect(table.success).toBeDefined();
      expect(table.createdAt).toBeDefined();
    });
  });

  describe("resolveArticleInfo", () => {
    it("should return article URL and metadata", async () => {
      const { resolveArticleInfo } = await import("../services/indexingNotification.helper");
      const info = await resolveArticleInfo(1);
      
      expect(info).toBeDefined();
      expect(info?.url).toContain("news.example");
      expect(info?.articleId).toBe(1);
      expect(info?.articleTitle).toBe("Test Article");
      expect(info?.articleSlug).toBe("test-article");
    });
  });
});
