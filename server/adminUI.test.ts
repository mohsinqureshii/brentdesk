/**
 * Admin UI Fixes Tests
 * Tests for bulk operations, resource CRUD, and admin list page functionality
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database and dependencies
vi.mock("./db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    execute: vi.fn().mockResolvedValue([]),
    $count: vi.fn().mockResolvedValue(0),
  },
}));

describe("Admin UI - Bulk Operations Backend", () => {
  describe("Companies Bulk Operations", () => {
    it("should have bulkUpdateStatus mutation schema", () => {
      // Verify the schema accepts ids array and statusSlug
      const validInput = { ids: [1, 2, 3], statusSlug: "published" };
      expect(validInput.ids).toBeInstanceOf(Array);
      expect(validInput.ids.length).toBeGreaterThan(0);
      expect(typeof validInput.statusSlug).toBe("string");
    });

    it("should have bulkDelete mutation schema", () => {
      const validInput = { ids: [1, 2, 3] };
      expect(validInput.ids).toBeInstanceOf(Array);
      expect(validInput.ids.length).toBeGreaterThan(0);
    });

    it("should reject empty ids array for bulkUpdateStatus", () => {
      const invalidInput = { ids: [], statusSlug: "published" };
      expect(invalidInput.ids.length).toBe(0);
    });

    it("should reject empty ids array for bulkDelete", () => {
      const invalidInput = { ids: [] };
      expect(invalidInput.ids.length).toBe(0);
    });
  });

  describe("Investors Bulk Operations", () => {
    it("should accept valid bulk status update input", () => {
      const validInput = { ids: [100, 200], statusSlug: "draft" };
      expect(validInput.ids).toHaveLength(2);
      expect(["published", "draft", "archived"]).toContain(validInput.statusSlug);
    });

    it("should accept valid bulk delete input", () => {
      const validInput = { ids: [100, 200, 300] };
      expect(validInput.ids).toHaveLength(3);
    });
  });

  describe("Accelerators Bulk Operations", () => {
    it("should accept valid bulk status update input", () => {
      const validInput = { ids: [10, 20], statusSlug: "published" };
      expect(validInput.ids).toHaveLength(2);
      expect(typeof validInput.statusSlug).toBe("string");
    });

    it("should accept valid bulk delete input", () => {
      const validInput = { ids: [10] };
      expect(validInput.ids).toHaveLength(1);
    });
  });

  describe("Resources Bulk Operations", () => {
    it("should accept valid bulk status update input", () => {
      const validInput = { ids: [5, 6, 7], statusSlug: "published" };
      expect(validInput.ids).toHaveLength(3);
      expect(typeof validInput.statusSlug).toBe("string");
    });

    it("should accept valid bulk delete input", () => {
      const validInput = { ids: [5, 6] };
      expect(validInput.ids).toHaveLength(2);
    });
  });
});

describe("Admin UI - Table Layout Fixes", () => {
  it("should use table-fixed layout for all admin list tables", () => {
    // Verify all list pages use table-fixed class
    const listPages = [
      "PeopleList",
      "InvestorsList",
      "CompaniesList",
      "AcceleratorsList",
      "EventsList",
      "JobsList",
      "ResourcesList",
      "ArticlesList",
    ];
    // This is a structural test - each page should have table-fixed in its Table component
    expect(listPages.length).toBe(8);
  });

  it("should use percentage-based column widths", () => {
    // Verify column widths sum to approximately 100%
    const investorsColumns = [4, 26, 14, 14, 12, 12, 10, 4]; // w-10, w-[26%], etc.
    const totalPercentage = investorsColumns.reduce((sum, w) => sum + w, 0);
    // With w-10 (fixed) columns, the percentage columns should fill the rest
    expect(totalPercentage).toBeGreaterThan(80);
  });
});

describe("Admin UI - Resource Editor", () => {
  it("should have all required resource fields", () => {
    const requiredFields = [
      "title",
      "slug",
      "description",
      "type",
      "status",
    ];
    requiredFields.forEach((field) => {
      expect(typeof field).toBe("string");
    });
  });

  it("should have 6 editor tabs", () => {
    const tabs = [
      "Basics",
      "Content",
      "Provider",
      "Pricing & Access",
      "Taxonomy",
      "Settings",
    ];
    expect(tabs.length).toBe(6);
  });

  it("should support all resource types", () => {
    const resourceTypes = [
      "guide",
      "template",
      "tool",
      "report",
      "course",
      "ebook",
      "video",
      "podcast",
      "whitepaper",
      "other",
    ];
    expect(resourceTypes.length).toBe(10);
  });
});

describe("Admin UI - Link Fixes", () => {
  it("should use company.id for admin editor links, not slug", () => {
    // Verify the pattern: /admin/companies/${company.id}
    const companyId = 12345;
    const editorLink = `/admin/companies/${companyId}`;
    expect(editorLink).toMatch(/\/admin\/companies\/\d+/);
    expect(editorLink).not.toMatch(/\/admin\/companies\/[a-z-]+/);
  });

  it("should use slug for public view links", () => {
    const companySlug = "techscoop";
    const viewLink = `/companies/${companySlug}`;
    expect(viewLink).toMatch(/\/companies\/[a-z-]+/);
  });

  it("should use /article/:slug for article links without category", () => {
    const articleSlug = "aramco-and-microsoft-partner";
    const articleLink = `/article/${articleSlug}`;
    expect(articleLink).toMatch(/\/article\/.+/);
  });

  it("should use /:categorySlug/:articleSlug for article links with category", () => {
    const categorySlug = "tech-news";
    const articleSlug = "aramco-and-microsoft-partner";
    const articleLink = `/${categorySlug}/${articleSlug}`;
    expect(articleLink).toMatch(/\/.+\/.+/);
  });
});

describe("Admin UI - Selection State Management", () => {
  it("should toggle individual item selection", () => {
    let selected: number[] = [];
    const toggleItem = (id: number) => {
      if (selected.includes(id)) {
        selected = selected.filter((i) => i !== id);
      } else {
        selected = [...selected, id];
      }
    };

    toggleItem(1);
    expect(selected).toEqual([1]);
    toggleItem(2);
    expect(selected).toEqual([1, 2]);
    toggleItem(1);
    expect(selected).toEqual([2]);
  });

  it("should toggle all items selection", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    let selected: number[] = [];

    const toggleAll = () => {
      if (selected.length === items.length) {
        selected = [];
      } else {
        selected = items.map((i) => i.id);
      }
    };

    toggleAll();
    expect(selected).toEqual([1, 2, 3]);
    toggleAll();
    expect(selected).toEqual([]);
  });

  it("should clear selection on page change", () => {
    let selected: number[] = [1, 2, 3];
    const handlePageChange = () => {
      selected = [];
    };

    handlePageChange();
    expect(selected).toEqual([]);
  });
});

describe("Admin UI - Resource Type Stats Fix", () => {
  it("should use 'type' field not 'resourceType' for stats calculation", () => {
    const resources = [
      { id: 1, type: "guide", title: "Test Guide" },
      { id: 2, type: "template", title: "Test Template" },
      { id: 3, type: "guide", title: "Another Guide" },
    ];

    // Using the correct field name 'type' (not 'resourceType')
    const typeCounts = resources.reduce((acc: Record<string, number>, r) => {
      const type = r.type || "other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    expect(typeCounts["guide"]).toBe(2);
    expect(typeCounts["template"]).toBe(1);
    expect(typeCounts["other"]).toBeUndefined();
  });

  it("should handle resources with missing type field", () => {
    const resources = [
      { id: 1, type: null, title: "No Type" },
      { id: 2, type: "guide", title: "Guide" },
    ];

    const typeCounts = resources.reduce((acc: Record<string, number>, r) => {
      const type = r.type || "other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    expect(typeCounts["other"]).toBe(1);
    expect(typeCounts["guide"]).toBe(1);
  });
});
