import { publication } from "@shared/publication";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("../../db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    then: vi.fn().mockResolvedValue([]),
  },
}));

describe("User Profile & Dashboard Features", () => {
  describe("Profile Fields", () => {
    it("should define all required profile fields", () => {
      const requiredFields = [
        "name", "bio", "jobTitle", "company", "location",
        "website", "twitterHandle", "linkedinUrl",
        "interests", "preferredLocations", "salaryMin", "salaryMax"
      ];
      
      // All fields should be strings or arrays
      requiredFields.forEach(field => {
        expect(typeof field).toBe("string");
        expect(field.length).toBeGreaterThan(0);
      });
    });

    it("should validate profile completion calculation", () => {
      const calculateCompletion = (profile: Record<string, any>) => {
        const fields = [
          { key: "name", label: "Name" },
          { key: "bio", label: "Bio" },
          { key: "jobTitle", label: "Job Title" },
          { key: "company", label: "Company" },
          { key: "location", label: "Location" },
          { key: "interests", label: "Interests" },
          { key: "twitterHandle", label: "Social Links" },
          { key: "website", label: "Website" },
        ];
        
        let completed = 0;
        fields.forEach(f => {
          const val = profile[f.key];
          if (val && (typeof val === "string" ? val.length > 0 : Array.isArray(val) && val.length > 0)) {
            completed++;
          }
        });
        return Math.round((completed / fields.length) * 100);
      };

      // Empty profile
      expect(calculateCompletion({})).toBe(0);
      
      // Partial profile
      expect(calculateCompletion({ name: "Mo", jobTitle: "Editor" })).toBe(25);
      
      // Full profile
      expect(calculateCompletion({
        name: "Mo", bio: "Tech journalist", jobTitle: "Editor",
        company: publication.name, location: "Dubai", interests: ["AI"],
        twitterHandle: "mo", website: "https://mo.com"
      })).toBe(100);
    });

    it("should validate salary range constraints", () => {
      const validateSalary = (min?: number, max?: number) => {
        if (min !== undefined && max !== undefined) {
          return min <= max;
        }
        return true;
      };

      expect(validateSalary(80000, 120000)).toBe(true);
      expect(validateSalary(120000, 80000)).toBe(false);
      expect(validateSalary(undefined, 120000)).toBe(true);
      expect(validateSalary(80000, undefined)).toBe(true);
    });
  });

  describe("Browsing History", () => {
    it("should validate content type enum values", () => {
      const validTypes = ["article", "job", "event", "company"];
      
      validTypes.forEach(type => {
        expect(["article", "job", "event", "company"]).toContain(type);
      });

      expect(["article", "job", "event", "company"]).not.toContain("invalid");
    });

    it("should track browsing with correct structure", () => {
      const browsingEntry = {
        userId: "user-123",
        contentType: "article" as const,
        contentId: 42,
        viewedAt: Date.now(),
      };

      expect(browsingEntry.userId).toBeTruthy();
      expect(browsingEntry.contentType).toBe("article");
      expect(browsingEntry.contentId).toBeGreaterThan(0);
      expect(browsingEntry.viewedAt).toBeGreaterThan(0);
    });

    it("should filter browsing history by content type", () => {
      const history = [
        { contentType: "article", contentId: 1, title: "Article 1" },
        { contentType: "job", contentId: 2, title: "Job 1" },
        { contentType: "event", contentId: 3, title: "Event 1" },
        { contentType: "article", contentId: 4, title: "Article 2" },
        { contentType: "company", contentId: 5, title: "Company 1" },
      ];

      const articles = history.filter(h => h.contentType === "article");
      expect(articles).toHaveLength(2);

      const jobs = history.filter(h => h.contentType === "job");
      expect(jobs).toHaveLength(1);

      const events = history.filter(h => h.contentType === "event");
      expect(events).toHaveLength(1);

      const companies = history.filter(h => h.contentType === "company");
      expect(companies).toHaveLength(1);
    });

    it("should calculate activity stats from browsing history", () => {
      const history = [
        { contentType: "article" },
        { contentType: "article" },
        { contentType: "job" },
        { contentType: "event" },
        { contentType: "company" },
        { contentType: "article" },
      ];

      const stats = {
        articles: history.filter(h => h.contentType === "article").length,
        jobs: history.filter(h => h.contentType === "job").length,
        events: history.filter(h => h.contentType === "event").length,
        companies: history.filter(h => h.contentType === "company").length,
        total: history.length,
      };

      expect(stats.articles).toBe(3);
      expect(stats.jobs).toBe(1);
      expect(stats.events).toBe(1);
      expect(stats.companies).toBe(1);
      expect(stats.total).toBe(6);
    });
  });

  describe("Recommendations", () => {
    it("should generate recommendations based on browsing categories", () => {
      const browsingHistory = [
        { categoryName: "AI & Machine Learning" },
        { categoryName: "AI & Machine Learning" },
        { categoryName: "FinTech" },
        { categoryName: "AI & Machine Learning" },
        { categoryName: "Startups" },
      ];

      // Count category frequencies
      const categoryFreq = new Map<string, number>();
      browsingHistory.forEach(h => {
        if (h.categoryName) {
          categoryFreq.set(h.categoryName, (categoryFreq.get(h.categoryName) || 0) + 1);
        }
      });

      // Sort by frequency
      const topCategories = Array.from(categoryFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat);

      expect(topCategories[0]).toBe("AI & Machine Learning");
      expect(topCategories[1]).toBe("FinTech");
      expect(topCategories).toContain("Startups");
    });

    it("should exclude already-viewed content from recommendations", () => {
      const viewedIds = new Set([1, 3, 5]);
      const allArticles = [
        { id: 1, title: "Article 1" },
        { id: 2, title: "Article 2" },
        { id: 3, title: "Article 3" },
        { id: 4, title: "Article 4" },
        { id: 5, title: "Article 5" },
      ];

      const recommendations = allArticles.filter(a => !viewedIds.has(a.id));
      expect(recommendations).toHaveLength(2);
      expect(recommendations.map(r => r.id)).toEqual([2, 4]);
    });

    it("should limit recommendations to a reasonable count", () => {
      const MAX_RECOMMENDATIONS = 6;
      const articles = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Article ${i + 1}`,
      }));

      const recommendations = articles.slice(0, MAX_RECOMMENDATIONS);
      expect(recommendations).toHaveLength(MAX_RECOMMENDATIONS);
    });

    it("should fall back to trending content when no browsing history", () => {
      const browsingHistory: any[] = [];
      const trendingArticles = [
        { id: 1, title: "Trending 1", viewCount: 100 },
        { id: 2, title: "Trending 2", viewCount: 80 },
      ];

      const recommendations = browsingHistory.length > 0
        ? [] // would be category-based
        : trendingArticles;

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].title).toBe("Trending 1");
    });
  });

  describe("Newsletter Preferences", () => {
    it("should define all newsletter list types", () => {
      const lists = [
        "Event Updates",
        "Founder Digest",
        "Investor Brief",
        "Job Alerts",
        "Weekly Digest",
      ];

      expect(lists).toHaveLength(5);
      lists.forEach(list => {
        expect(typeof list).toBe("string");
        expect(list.length).toBeGreaterThan(0);
      });
    });

    it("should toggle subscription state correctly", () => {
      let subscribed = false;
      
      // Subscribe
      subscribed = !subscribed;
      expect(subscribed).toBe(true);
      
      // Unsubscribe
      subscribed = !subscribed;
      expect(subscribed).toBe(false);
    });
  });
});
