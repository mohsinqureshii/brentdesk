/**
 * Tests for Indexing Notification Service
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
import {
  notifySearchEngines,
  notifySearchEnginesBatch,
  buildArticleUrl,
  INDEXNOW_KEY,
  indexingNotificationService,
} from "./indexingNotification.service";

describe("Indexing Notification Service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("INDEXNOW_KEY", () => {
    it("should be a 32-character hex string", () => {
      expect(INDEXNOW_KEY).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe("buildArticleUrl", () => {
    it("should build correct article URL with category and slug", () => {
      const url = buildArticleUrl("funding", "startup-raises-10m");
      expect(url).toBe("https://techscoop.io/funding/startup-raises-10m");
    });

    it("should handle 'news' as default category", () => {
      const url = buildArticleUrl("news", "breaking-story");
      expect(url).toBe("https://techscoop.io/news/breaking-story");
    });
  });

  describe("notifySearchEngines", () => {
    it("should call both sitemap ping and IndexNow", async () => {
      // Mock successful responses for both
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        text: async () => "OK",
      });

      const results = await notifySearchEngines({
        url: "https://techscoop.io/funding/test-article",
      });

      // Should have at least 2 results (sitemap ping + IndexNow)
      // Google Indexing API is skipped when no service account is configured
      expect(results.length).toBeGreaterThanOrEqual(2);

      // Check sitemap ping was called
      const sitemapResult = results.find((r) => r.method === "sitemap_ping");
      expect(sitemapResult).toBeDefined();
      expect(sitemapResult!.success).toBe(true);

      // Check IndexNow was called
      const indexNowResult = results.find((r) => r.method === "indexnow");
      expect(indexNowResult).toBeDefined();
      expect(indexNowResult!.success).toBe(true);
    });

    it("should handle sitemap ping failure gracefully", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error")) // sitemap ping fails
        .mockResolvedValueOnce({ status: 200, ok: true, text: async () => "OK" }); // IndexNow succeeds

      const results = await notifySearchEngines({
        url: "https://techscoop.io/funding/test-article",
      });

      const sitemapResult = results.find((r) => r.method === "sitemap_ping");
      expect(sitemapResult).toBeDefined();
      expect(sitemapResult!.success).toBe(false);
      expect(sitemapResult!.message).toContain("Network error");

      const indexNowResult = results.find((r) => r.method === "indexnow");
      expect(indexNowResult).toBeDefined();
      expect(indexNowResult!.success).toBe(true);
    });

    it("should handle IndexNow failure gracefully", async () => {
      mockFetch
        .mockResolvedValueOnce({ status: 200, ok: true, text: async () => "OK" }) // sitemap ping succeeds
        .mockResolvedValueOnce({ status: 422, ok: false, text: async () => "Invalid key" }); // IndexNow fails

      const results = await notifySearchEngines({
        url: "https://techscoop.io/funding/test-article",
      });

      const sitemapResult = results.find((r) => r.method === "sitemap_ping");
      expect(sitemapResult!.success).toBe(true);

      const indexNowResult = results.find((r) => r.method === "indexnow");
      expect(indexNowResult!.success).toBe(false);
      expect(indexNowResult!.statusCode).toBe(422);
    });

    it("should not include Google Indexing API result when no credentials", async () => {
      mockFetch.mockResolvedValue({ status: 200, ok: true, text: async () => "OK" });

      const results = await notifySearchEngines({
        url: "https://techscoop.io/funding/test-article",
      });

      const googleResult = results.find((r) => r.method === "google_indexing_api");
      expect(googleResult).toBeUndefined();
    });

    it("should include timestamps in all results", async () => {
      mockFetch.mockResolvedValue({ status: 200, ok: true, text: async () => "OK" });

      const results = await notifySearchEngines({
        url: "https://techscoop.io/funding/test-article",
      });

      for (const result of results) {
        expect(result.timestamp).toBeDefined();
        expect(new Date(result.timestamp).getTime()).not.toBeNaN();
      }
    });
  });

  describe("notifySearchEnginesBatch", () => {
    it("should handle empty URL array", async () => {
      const results = await notifySearchEnginesBatch([]);
      expect(results).toHaveLength(0);
    });

    it("should send batch of URLs via IndexNow", async () => {
      mockFetch.mockResolvedValue({ status: 200, ok: true, text: async () => "OK" });

      const urls = [
        "https://techscoop.io/funding/article-1",
        "https://techscoop.io/ai/article-2",
        "https://techscoop.io/startups/article-3",
      ];

      const results = await notifySearchEnginesBatch(urls);

      // Should have sitemap ping + IndexNow batch
      expect(results.length).toBeGreaterThanOrEqual(2);

      const indexNowResult = results.find((r) => r.method === "indexnow");
      expect(indexNowResult).toBeDefined();
      expect(indexNowResult!.success).toBe(true);
      expect(indexNowResult!.message).toContain("3 URL(s)");
    });

    it("should send correct IndexNow payload format", async () => {
      mockFetch.mockResolvedValue({ status: 200, ok: true, text: async () => "OK" });

      await notifySearchEnginesBatch(["https://techscoop.io/news/test"]);

      // Find the IndexNow call (POST to api.indexnow.org)
      const indexNowCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("indexnow.org")
      );

      expect(indexNowCall).toBeDefined();
      const body = JSON.parse(indexNowCall![1].body);
      expect(body).toHaveProperty("host");
      expect(body).toHaveProperty("key", INDEXNOW_KEY);
      expect(body).toHaveProperty("keyLocation");
      expect(body).toHaveProperty("urlList");
      expect(body.urlList).toContain("https://techscoop.io/news/test");
    });
  });

  describe("Sitemap Ping", () => {
    it("should ping Google with the correct sitemap URL", async () => {
      mockFetch.mockResolvedValue({ status: 200, ok: true, text: async () => "OK" });

      await indexingNotificationService._pingSitemap();

      const googleCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("google.com/ping")
      );

      expect(googleCall).toBeDefined();
      expect(googleCall![0]).toContain("sitemap=");
      expect(googleCall![0]).toContain("sitemap.xml");
    });

    it("should handle non-200 responses", async () => {
      mockFetch.mockResolvedValue({ status: 503, ok: false, text: async () => "Service Unavailable" });

      const result = await indexingNotificationService._pingSitemap();
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(503);
    });
  });

  describe("IndexNow", () => {
    it("should accept 202 as success", async () => {
      mockFetch.mockResolvedValue({ status: 202, ok: true, text: async () => "Accepted" });

      const result = await indexingNotificationService._submitIndexNow([
        "https://techscoop.io/news/test",
      ]);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(202);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("DNS resolution failed"));

      const result = await indexingNotificationService._submitIndexNow([
        "https://techscoop.io/news/test",
      ]);

      expect(result.success).toBe(false);
      expect(result.message).toContain("DNS resolution failed");
    });
  });

  describe("Google Indexing API", () => {
    it("should skip when no service account is configured", async () => {
      const result = await indexingNotificationService._submitGoogleIndexingApi({
        url: "https://techscoop.io/news/test",
        type: "URL_UPDATED",
      });

      expect(result).toBeNull();
    });
  });

  describe("Result structure", () => {
    it("should return consistent result objects", async () => {
      mockFetch.mockResolvedValue({ status: 200, ok: true, text: async () => "OK" });

      const results = await notifySearchEngines({
        url: "https://techscoop.io/funding/test",
        type: "URL_UPDATED",
      });

      for (const result of results) {
        expect(result).toHaveProperty("method");
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("message");
        expect(result).toHaveProperty("url");
        expect(result).toHaveProperty("timestamp");
        expect(["sitemap_ping", "indexnow", "google_indexing_api"]).toContain(result.method);
      }
    });
  });
});
