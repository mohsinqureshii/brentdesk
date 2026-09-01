/**
 * Tests for Indexing Notification Service
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getBaseUrl } from "@shared/publication";

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
      const url = buildArticleUrl("energy", "project-award");
      expect(url).toBe(`${getBaseUrl()}/energy/project-award`);
    });

    it("should handle 'news' as default category", () => {
      const url = buildArticleUrl("news", "breaking-story");
      expect(url).toBe(`${getBaseUrl()}/news/breaking-story`);
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
        url: `${getBaseUrl()}/energy/test-article`,
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
      // pingSitemap now pings Bing AND Google in parallel (two fetches),
      // so both must fail for the sitemap ping to report failure.
      mockFetch
        .mockRejectedValueOnce(new Error("Network error")) // Bing ping fails
        .mockRejectedValueOnce(new Error("Network error")) // Google ping fails
        .mockResolvedValueOnce({ status: 200, ok: true, text: async () => "OK" }); // IndexNow succeeds

      const results = await notifySearchEngines({
        url: `${getBaseUrl()}/energy/test-article`,
      });

      const sitemapResult = results.find((r) => r.method === "sitemap_ping");
      expect(sitemapResult).toBeDefined();
      expect(sitemapResult!.success).toBe(false);
      // Promise.allSettled swallows the individual fetch errors; the result
      // reports the (zero) status rather than the network error text.
      expect(sitemapResult!.message).toContain("Sitemap ping returned");

      const indexNowResult = results.find((r) => r.method === "indexnow");
      expect(indexNowResult).toBeDefined();
      expect(indexNowResult!.success).toBe(true);
    });

    it("should handle IndexNow failure gracefully", async () => {
      mockFetch
        .mockResolvedValueOnce({ status: 200, ok: true, text: async () => "OK" }) // Bing sitemap ping succeeds
        .mockResolvedValueOnce({ status: 404, ok: false, text: async () => "" }) // Google ping deprecated (expected)
        .mockResolvedValueOnce({ status: 422, ok: false, text: async () => "Invalid key" }); // IndexNow fails

      const results = await notifySearchEngines({
        url: `${getBaseUrl()}/energy/test-article`,
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
        url: `${getBaseUrl()}/energy/test-article`,
      });

      const googleResult = results.find((r) => r.method === "google_indexing_api");
      expect(googleResult).toBeUndefined();
    });

    it("should include timestamps in all results", async () => {
      mockFetch.mockResolvedValue({ status: 200, ok: true, text: async () => "OK" });

      const results = await notifySearchEngines({
        url: `${getBaseUrl()}/energy/test-article`,
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
        `${getBaseUrl()}/energy/article-1`,
        `${getBaseUrl()}/manufacturing/article-2`,
        `${getBaseUrl()}/logistics/article-3`,
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

      const testUrl = `${getBaseUrl()}/news/test`;
      await notifySearchEnginesBatch([testUrl]);

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
      expect(body.urlList).toContain(testUrl);
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
        `${getBaseUrl()}/news/test`,
      ]);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(202);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("DNS resolution failed"));

      const result = await indexingNotificationService._submitIndexNow([
        `${getBaseUrl()}/news/test`,
      ]);

      expect(result.success).toBe(false);
      expect(result.message).toContain("DNS resolution failed");
    });
  });

  describe("Google Indexing API", () => {
    it("should skip when no service account is configured", async () => {
      const result = await indexingNotificationService._submitGoogleIndexingApi({
        url: `${getBaseUrl()}/news/test`,
        type: "URL_UPDATED",
      });

      expect(result).toBeNull();
    });
  });

  describe("Result structure", () => {
    it("should return consistent result objects", async () => {
      mockFetch.mockResolvedValue({ status: 200, ok: true, text: async () => "OK" });

      const results = await notifySearchEngines({
        url: `${getBaseUrl()}/energy/test`,
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
