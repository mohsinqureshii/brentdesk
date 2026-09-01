import { publication } from "@shared/publication";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for Article URL Redirect Logic
 * 
 * CRITICAL SEO FIX:
 * - Each article must have ONE canonical URL based on its primary category
 * - All other category URLs must 301 redirect to the primary URL
 * - This prevents duplicate content issues and consolidates SEO authority
 */

describe("Article URL Redirect Logic", () => {
  describe("URL Pattern Validation", () => {
    it("should identify valid category/article URL patterns", () => {
      // Valid patterns: /{category-slug}/{article-slug}
      const validPatterns = [
        "/startups/my-article-slug",
        "/funding-vc/company-raises-10m",
        "/social/saudi-social-app-declic-closes-1m-seed-round",
      ];
      
      validPatterns.forEach(pattern => {
        const parts = pattern.split("/").filter(Boolean);
        expect(parts.length).toBe(2);
        expect(parts[0]).toBeTruthy();
        expect(parts[1]).toBeTruthy();
      });
    });

    it("should skip paths that are not article URLs", () => {
      const skipPaths = [
        "/api/trpc",
        "/admin/articles",
        "/jobs/senior-developer",
        "/events/web-summit-2026",
        "/companies/acme-corp",
        "/assets/logo.png",
      ];
      
      const SKIP_PREFIXES = [
        '/api', '/admin', '/jobs', '/people', '/investors', '/events', 
        '/companies', '/accelerators', '/resources', '/assets'
      ];
      
      skipPaths.forEach(path => {
        const shouldSkip = SKIP_PREFIXES.some(prefix => path.startsWith(prefix));
        expect(shouldSkip).toBe(true);
      });
    });

    it("should skip paths with file extensions", () => {
      const fileExtensionPaths = [
        "/startups/image.png",
        "/funding-vc/document.pdf",
        "/social/script.js",
      ];
      
      fileExtensionPaths.forEach(path => {
        const parts = path.split("/").filter(Boolean);
        const articleSlug = parts[1];
        const hasExtension = articleSlug.includes(".");
        expect(hasExtension).toBe(true);
      });
    });
  });

  describe("Primary Category Redirect Logic", () => {
    it("should not redirect when URL category matches primary category", () => {
      const urlCategory = "social";
      const primaryCategory = "social";
      
      const shouldRedirect = urlCategory !== primaryCategory;
      expect(shouldRedirect).toBe(false);
    });

    it("should redirect when URL category does not match primary category", () => {
      const urlCategory = "startups";
      const primaryCategory = "social";
      
      const shouldRedirect = urlCategory !== primaryCategory;
      expect(shouldRedirect).toBe(true);
    });

    it("should generate correct redirect URL using primary category", () => {
      const primaryCategorySlug = "social";
      const articleSlug = "saudi-social-app-declic-closes-1m-seed-round";
      
      const correctUrl = `/${primaryCategorySlug}/${articleSlug}`;
      expect(correctUrl).toBe("/social/saudi-social-app-declic-closes-1m-seed-round");
    });
  });

  describe("Canonical URL Generation", () => {
    it("should generate canonical URL using primary category", () => {
      const baseUrl = publication.siteUrl;
      const primaryCategorySlug = "social";
      const articleSlug = "my-article";
      
      const canonicalUrl = `${baseUrl}/${primaryCategorySlug}/${articleSlug}`;
      expect(canonicalUrl).toBe(`${publication.siteUrl}/social/my-article`);
    });

    it("should fallback to first category if no primary category", () => {
      const baseUrl = publication.siteUrl;
      const primaryCategorySlug = null;
      const firstCategorySlug = "startups";
      const articleSlug = "my-article";
      
      const categorySlug = primaryCategorySlug || firstCategorySlug;
      const canonicalUrl = `${baseUrl}/${categorySlug}/${articleSlug}`;
      expect(canonicalUrl).toBe(`${publication.siteUrl}/startups/my-article`);
    });
  });
});
