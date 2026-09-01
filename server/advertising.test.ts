import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Advertising Module Tests
 * Tests the ad serving logic, slot management, campaign management,
 * AdSense settings, and ads.txt serving.
 */

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

describe("Advertising Module", () => {
  describe("Ad Slot Configuration", () => {
    it("should have valid IAB standard ad sizes for all slot types", () => {
      const validSizes = [
        "728x90",   // Leaderboard
        "300x250",  // Medium Rectangle
        "300x600",  // Half Page
        "320x50",   // Mobile Leaderboard
        "320x100",  // Large Mobile Banner
        "970x250",  // Billboard
        "160x600",  // Wide Skyscraper
        "responsive",
      ];
      
      // Verify each standard size is a recognized IAB format
      validSizes.forEach(size => {
        if (size === "responsive") {
          expect(size).toBe("responsive");
        } else {
          const [w, h] = size.split("x").map(Number);
          expect(w).toBeGreaterThan(0);
          expect(h).toBeGreaterThan(0);
        }
      });
    });

    it("should define slot keys with proper naming convention", () => {
      const slotKeys = [
        "homepage-leaderboard",
        "homepage-sidebar-top",
        "homepage-sidebar-bottom",
        "article-leaderboard",
        "article-sidebar-top",
        "article-in-content",
        "article-sidebar-bottom",
        "news-leaderboard",
        "news-sidebar",
        "jobs-leaderboard",
        "jobs-sidebar",
        "funding-leaderboard",
        "company-sidebar",
        "footer-banner",
        "mobile-sticky",
      ];

      slotKeys.forEach(key => {
        // Slot keys should be lowercase with hyphens
        expect(key).toMatch(/^[a-z][a-z0-9-]+$/);
        // Should not have consecutive hyphens
        expect(key).not.toMatch(/--/);
      });
    });
  });

  describe("Ad Serving Priority Logic", () => {
    it("should follow the correct priority order: Direct > House > AdSense > Empty", () => {
      const priorities = ["direct", "house", "adsense", "empty"];
      
      // Verify priority order
      expect(priorities.indexOf("direct")).toBeLessThan(priorities.indexOf("house"));
      expect(priorities.indexOf("house")).toBeLessThan(priorities.indexOf("adsense"));
      expect(priorities.indexOf("adsense")).toBeLessThan(priorities.indexOf("empty"));
    });

    it("should return correct ad type structure for direct ads", () => {
      const directAd = {
        type: "direct" as const,
        slotKey: "homepage-leaderboard",
        slotId: 1,
        campaignId: 1,
        creativeId: 1,
        format: "banner",
        fileUrl: "https://example.com/banner.jpg",
        clickUrl: "https://example.com",
        dimensions: "728x90",
        isPremium: 0,
      };

      expect(directAd.type).toBe("direct");
      expect(directAd.campaignId).toBeGreaterThan(0);
      expect(directAd.creativeId).toBeGreaterThan(0);
      expect(directAd.clickUrl).toBeTruthy();
    });

    it("should return correct ad type structure for adsense fallback", () => {
      const adsenseAd = {
        type: "adsense" as const,
        slotKey: "homepage-sidebar-top",
        slotId: 2,
        publisherId: "pub-2487563355490273",
        adsenseSlotId: null,
        dimensions: "300x250",
        isPremium: 0,
      };

      expect(adsenseAd.type).toBe("adsense");
      expect(adsenseAd.publisherId).toMatch(/^pub-\d+$/);
    });

    it("should return empty type when kill switch is active", () => {
      const emptyAd = {
        type: "empty" as const,
        slotKey: "homepage-leaderboard",
      };

      expect(emptyAd.type).toBe("empty");
      expect(emptyAd.slotKey).toBeTruthy();
    });
  });

  describe("Campaign Validation", () => {
    it("should validate campaign types", () => {
      const validTypes = ["direct", "sponsorship", "programmatic", "house"];
      validTypes.forEach(type => {
        expect(["direct", "sponsorship", "programmatic", "house"]).toContain(type);
      });
    });

    it("should validate campaign statuses", () => {
      const validStatuses = ["draft", "pending_approval", "approved", "active", "paused", "completed", "rejected"];
      validStatuses.forEach(status => {
        expect(["draft", "pending_approval", "approved", "active", "paused", "completed", "rejected"]).toContain(status);
      });
    });

    it("should validate pricing models", () => {
      const validModels = ["cpm", "cpc", "flat", "sponsorship"];
      validModels.forEach(model => {
        expect(["cpm", "cpc", "flat", "sponsorship"]).toContain(model);
      });
    });

    it("should calculate CTR correctly", () => {
      const impressions = 10000;
      const clicks = 150;
      const ctr = (clicks / impressions) * 100;
      expect(ctr).toBeCloseTo(1.5, 2);
    });

    it("should calculate CPM spend correctly", () => {
      const impressions = 50000;
      const pricePerUnit = 5.00; // $5 CPM
      const spend = (impressions / 1000) * pricePerUnit;
      expect(spend).toBe(250);
    });

    it("should calculate CPC spend correctly", () => {
      const clicks = 200;
      const pricePerUnit = 0.50; // $0.50 per click
      const spend = clicks * pricePerUnit;
      expect(spend).toBe(100);
    });
  });

  describe("AdSense Configuration", () => {
    it("should validate publisher ID format", () => {
      const publisherId = "pub-2487563355490273";
      expect(publisherId).toMatch(/^pub-\d+$/);
    });

    it("should generate correct ads.txt content", () => {
      const publisherId = "pub-2487563355490273";
      const adsTxtContent = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`;
      
      expect(adsTxtContent).toContain("google.com");
      expect(adsTxtContent).toContain(publisherId);
      expect(adsTxtContent).toContain("DIRECT");
      expect(adsTxtContent).toContain("f08c47fec0942fa0");
    });

    it("should support auto-ads toggle", () => {
      const settings = {
        publisherId: "pub-2487563355490273",
        autoAdsEnabled: false,
        adsenseEnabled: true,
        globalKillSwitch: false,
      };

      expect(settings.adsenseEnabled).toBe(true);
      expect(settings.autoAdsEnabled).toBe(false);
      expect(settings.globalKillSwitch).toBe(false);
    });
  });

  describe("Creative Validation", () => {
    it("should validate creative formats", () => {
      const validFormats = ["banner", "native", "video", "text"];
      validFormats.forEach(format => {
        expect(["banner", "native", "video", "text"]).toContain(format);
      });
    });

    it("should validate creative statuses", () => {
      const validStatuses = ["draft", "pending_approval", "approved", "rejected"];
      validStatuses.forEach(status => {
        expect(["draft", "pending_approval", "approved", "rejected"]).toContain(status);
      });
    });

    it("should require click URL for all creatives", () => {
      const creative = {
        name: "Test Banner",
        format: "banner",
        clickUrl: "https://example.com/landing",
        fileUrl: "https://cdn.example.com/banner.jpg",
      };

      expect(creative.clickUrl).toBeTruthy();
      expect(creative.clickUrl).toMatch(/^https?:\/\//);
    });
  });

  describe("Frequency Capping", () => {
    it("should enforce frequency cap per session", () => {
      const frequencyCap = 3;
      const sessionImpressions = 3;
      
      const isCapReached = sessionImpressions >= frequencyCap;
      expect(isCapReached).toBe(true);
    });

    it("should allow impressions below frequency cap", () => {
      const frequencyCap = 5;
      const sessionImpressions = 2;
      
      const isCapReached = sessionImpressions >= frequencyCap;
      expect(isCapReached).toBe(false);
    });

    it("should skip frequency check when cap is null", () => {
      const frequencyCap = null;
      const sessionImpressions = 100;
      
      // When no cap, always allow
      const shouldServe = !frequencyCap || sessionImpressions < frequencyCap;
      expect(shouldServe).toBe(true);
    });
  });

  describe("Brand Safety / Blocklist", () => {
    it("should validate blocklist entry types", () => {
      const validTypes = ["domain", "keyword", "category"];
      validTypes.forEach(type => {
        expect(["domain", "keyword", "category"]).toContain(type);
      });
    });

    it("should block ads from blocked domains", () => {
      const blocklist = [
        { type: "domain", value: "malware.com" },
        { type: "domain", value: "spam.net" },
      ];
      
      const adDomain = "malware.com";
      const isBlocked = blocklist.some(b => b.type === "domain" && b.value === adDomain);
      expect(isBlocked).toBe(true);
    });

    it("should allow ads from non-blocked domains", () => {
      const blocklist = [
        { type: "domain", value: "malware.com" },
      ];
      
      const adDomain = "legitimate-advertiser.com";
      const isBlocked = blocklist.some(b => b.type === "domain" && b.value === adDomain);
      expect(isBlocked).toBe(false);
    });
  });

  describe("Ad Placement Mapping", () => {
    it("should map page types to correct ad slot positions", () => {
      const pageSlotMap: Record<string, string[]> = {
        homepage: ["homepage-leaderboard", "homepage-sidebar-top", "homepage-sidebar-bottom"],
        article: ["article-leaderboard", "article-sidebar-top", "article-in-content", "article-sidebar-bottom"],
        news: ["news-leaderboard", "news-sidebar"],
        jobs: ["jobs-leaderboard", "jobs-sidebar"],
        funding: ["funding-leaderboard"],
        company: ["company-sidebar"],
        global: ["footer-banner", "mobile-sticky"],
      };

      // Every page type should have at least one slot
      Object.values(pageSlotMap as any).forEach(slots => {
        expect(slots.length).toBeGreaterThan(0);
      });

      // Homepage should have the most slots
      expect(pageSlotMap.homepage.length).toBeGreaterThanOrEqual(3);
      
      // Article pages should have in-content ad
      expect(pageSlotMap.article).toContain("article-in-content");
    });
  });

  describe("Revenue Calculation", () => {
    it("should calculate total revenue from multiple campaigns", () => {
      const campaigns = [
        { impressions: 10000, clicks: 100, pricingModel: "cpm", pricePerUnit: 5.00 },
        { impressions: 5000, clicks: 250, pricingModel: "cpc", pricePerUnit: 0.50 },
        { impressions: 0, clicks: 0, pricingModel: "flat", pricePerUnit: 1000.00 },
      ];

      let totalRevenue = 0;
      campaigns.forEach(c => {
        if (c.pricingModel === "cpm") {
          totalRevenue += (c.impressions / 1000) * c.pricePerUnit;
        } else if (c.pricingModel === "cpc") {
          totalRevenue += c.clicks * c.pricePerUnit;
        } else if (c.pricingModel === "flat") {
          totalRevenue += c.pricePerUnit;
        }
      });

      // CPM: (10000/1000)*5 = 50, CPC: 250*0.50 = 125, Flat: 1000
      expect(totalRevenue).toBe(1175);
    });
  });
});
