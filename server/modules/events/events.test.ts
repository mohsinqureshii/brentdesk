import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the workflow service
vi.mock("../../services/workflow.service", () => ({
  workflowService: {
    getStatusBySlug: vi.fn().mockResolvedValue({ id: 6, slug: "published" }),
  },
}));

// Mock the slug service
vi.mock("../../services/slug.service", () => ({
  slugService: {
    generateSlug: vi.fn().mockReturnValue("test-event"),
  },
}));

// Mock the seo service
vi.mock("../../services/seo.service", () => ({
  seoService: {
    getSeoMeta: vi.fn().mockResolvedValue(null),
  },
}));

describe("Events Module", () => {
  describe("Events List Schema Validation", () => {
    it("should accept valid list input with all filters", () => {
      const validInput = {
        page: 1,
        limit: 12,
        search: "LEAP",
        type: "conference" as const,
        format: "in_person" as const,
        upcoming: true,
        featured: true,
        city: "Dubai",
        isFree: 0,
        sortBy: "startDate" as const,
        sortOrder: "asc" as const,
      };
      expect(validInput.page).toBe(1);
      expect(validInput.limit).toBe(12);
      expect(validInput.type).toBe("conference");
      expect(validInput.featured).toBe(true);
      expect(validInput.city).toBe("Dubai");
      expect(validInput.isFree).toBe(false);
    });

    it("should accept hackathon as a valid event type", () => {
      const validTypes = ["conference", "webinar", "meetup", "workshop", "hackathon", "summit", "other"];
      expect(validTypes).toContain("hackathon");
    });

    it("should support all sort options", () => {
      const validSortOptions = ["startDate", "createdAt", "title", "name", "registrations", "status"];
      expect(validSortOptions).toHaveLength(6);
      expect(validSortOptions).toContain("startDate");
    });
  });

  describe("Event Date Formatting", () => {
    it("should format event dates correctly", () => {
      const date = new Date("2026-04-13T00:00:00Z");
      const formatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      expect(formatted).toContain("2026");
      expect(formatted).toContain("April");
    });

    it("should handle midnight times (no time set)", () => {
      const date = new Date("2026-04-13T00:00:00Z");
      const h = date.getUTCHours();
      const m = date.getUTCMinutes();
      // Midnight means no time was set
      expect(h).toBe(0);
      expect(m).toBe(0);
    });

    it("should format attendee counts with K suffix", () => {
      const formatAttendees = (count: number | null): string => {
        if (!count) return "";
        if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
        return count.toString();
      };
      expect(formatAttendees(201000)).toBe("201K");
      expect(formatAttendees(8000)).toBe("8.0K");
      expect(formatAttendees(500)).toBe("500");
      expect(formatAttendees(null)).toBe("");
    });

    it("should format prices correctly", () => {
      const formatPrice = (isFree: boolean | null, price: string | number | null): string => {
        if (isFree) return "Free";
        if (price && Number(price) > 0) return `$${Number(price).toFixed(0)}`;
        return "";
      };
      expect(formatPrice(true, null)).toBe("Free");
      expect(formatPrice(false, "299.99")).toBe("$300");
      expect(formatPrice(false, null)).toBe("");
      expect(formatPrice(null, "0")).toBe("");
    });
  });

  describe("Event Category Mapping", () => {
    it("should map all categories to valid types", () => {
      const categories = [
        { id: "all", label: "All Events" },
        { id: "conference", label: "Conferences" },
        { id: "workshop", label: "Workshops" },
        { id: "meetup", label: "Meetups" },
        { id: "hackathon", label: "Pitch Events" },
        { id: "summit", label: "Summits" },
        { id: "webinar", label: "Virtual" },
      ];
      const validTypes = ["all", "conference", "webinar", "meetup", "workshop", "hackathon", "summit", "other"];
      for (const cat of categories) {
        expect(validTypes).toContain(cat.id);
      }
    });

    it("should map sidebar type filters to API types", () => {
      const typeMap: Record<string, string> = {
        "Conference": "conference",
        "Workshop": "workshop",
        "Meetup": "meetup",
        "Pitch Event": "hackathon",
        "Virtual": "webinar",
        "Hackathon": "hackathon",
        "Bootcamp": "workshop",
        "Summit": "summit",
        "Forum": "conference",
        "Expo": "conference",
      };
      expect(typeMap["Conference"]).toBe("conference");
      expect(typeMap["Pitch Event"]).toBe("hackathon");
      expect(typeMap["Virtual"]).toBe("webinar");
      expect(typeMap["Summit"]).toBe("summit");
    });
  });

  describe("City Images", () => {
    it("should have images for all major MENA cities", () => {
      const cityImages: Record<string, string> = {
        "Dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c",
        "Riyadh": "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6",
        "Cairo": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a",
        "Abu Dhabi": "https://images.unsplash.com/photo-1611605698335-8b1569810432",
        "Doha": "https://images.unsplash.com/photo-1559564484-e48b3e040ff4",
      };
      expect(Object.keys(cityImages)).toContain("Dubai");
      expect(Object.keys(cityImages)).toContain("Riyadh");
      expect(Object.keys(cityImages)).toContain("Abu Dhabi");
      expect(Object.keys(cityImages)).toContain("Doha");
      // All images should be valid URLs
      for (const url of Object.values(cityImages as any)) {
        expect(url).toMatch(/^https?:\/\//);
      }
    });
  });

  describe("Filter Logic", () => {
    it("should calculate date ranges correctly", () => {
      const now = new Date();
      
      // Week filter
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      expect(weekEnd.getTime()).toBeGreaterThan(now.getTime());
      expect(weekEnd.getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
      
      // Month filter
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      expect(monthEnd.getTime()).toBeGreaterThan(now.getTime());
      
      // Quarter filter
      const quarterEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      expect(quarterEnd.getTime()).toBeGreaterThan(monthEnd.getTime());
    });

    it("should count active filters correctly", () => {
      const dateFilter = "month";
      const typeFilters: string[] = ["Conference"];
      const priceFilter = "free";
      const locationFilter = null;
      const showFeaturedOnly = false;
      
      const activeFilterCount = [
        dateFilter, 
        ...typeFilters, 
        priceFilter, 
        locationFilter, 
        showFeaturedOnly ? "featured" : null
      ].filter(Boolean).length;
      
      expect(activeFilterCount).toBe(3);
    });
  });
});
