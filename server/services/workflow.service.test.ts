import { describe, expect, it, vi, beforeEach } from "vitest";
import { 
  WorkflowService, 
  DEFAULT_EDITORIAL_STATUSES, 
  DEFAULT_MODERATION_STATUSES 
} from "./workflow.service";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

describe("WorkflowService", () => {
  let workflowService: WorkflowService;

  beforeEach(() => {
    workflowService = new WorkflowService();
  });

  describe("DEFAULT_EDITORIAL_STATUSES", () => {
    it("should have correct number of statuses", () => {
      expect(DEFAULT_EDITORIAL_STATUSES.length).toBe(10);
    });

    it("should have draft as initial status", () => {
      const draftStatus = DEFAULT_EDITORIAL_STATUSES.find(s => s.slug === "draft");
      expect(draftStatus).toBeDefined();
      // Status flags are MySQL tinyint values (1/0), not JS booleans.
      expect(draftStatus?.isInitial).toBe(1);
    });

    it("should have published as final and published status", () => {
      const publishedStatus = DEFAULT_EDITORIAL_STATUSES.find(s => s.slug === "published");
      expect(publishedStatus).toBeDefined();
      // tinyint semantics: the service stores 1/0 rather than true/false.
      expect(publishedStatus?.isFinal).toBe(1);
      expect(publishedStatus?.isPublished).toBe(1);
    });

    it("should have correct sort order", () => {
      const sortedStatuses = [...DEFAULT_EDITORIAL_STATUSES].sort((a, b) => 
        (a.sortOrder || 0) - (b.sortOrder || 0)
      );
      
      expect(sortedStatuses[0].slug).toBe("draft");
      expect(sortedStatuses[1].slug).toBe("submitted");
    });

    it("should have all required fields", () => {
      DEFAULT_EDITORIAL_STATUSES.forEach(status => {
        expect(status.name).toBeDefined();
        expect(status.slug).toBeDefined();
        expect(status.color).toBeDefined();
        expect(status.workflowType).toBe("editorial");
      });
    });

    it("should have valid color codes", () => {
      DEFAULT_EDITORIAL_STATUSES.forEach(status => {
        expect(status.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe("DEFAULT_MODERATION_STATUSES", () => {
    it("should have correct number of statuses", () => {
      expect(DEFAULT_MODERATION_STATUSES.length).toBe(4);
    });

    it("should have pending as initial status", () => {
      const pendingStatus = DEFAULT_MODERATION_STATUSES.find(s => s.slug === "pending");
      expect(pendingStatus).toBeDefined();
      // tinyint semantics: the service stores 1/0 rather than true/false.
      expect(pendingStatus?.isInitial).toBe(1);
    });

    it("should have approved and rejected as final statuses", () => {
      const approvedStatus = DEFAULT_MODERATION_STATUSES.find(s => s.slug === "approved");
      const rejectedStatus = DEFAULT_MODERATION_STATUSES.find(s => s.slug === "rejected");

      // tinyint semantics: the service stores 1/0 rather than true/false.
      expect(approvedStatus?.isFinal).toBe(1);
      expect(rejectedStatus?.isFinal).toBe(1);
    });

    it("should have all required fields", () => {
      DEFAULT_MODERATION_STATUSES.forEach(status => {
        expect(status.name).toBeDefined();
        expect(status.slug).toBeDefined();
        expect(status.color).toBeDefined();
        expect(status.workflowType).toBe("moderation");
      });
    });
  });

  describe("initializeWorkflows", () => {
    it("should throw error when database is not available", async () => {
      await expect(
        workflowService.initializeWorkflows()
      ).rejects.toThrow("Database not available");
    });
  });

  describe("getStatuses", () => {
    it("should throw error when database is not available", async () => {
      await expect(
        workflowService.getStatuses("editorial")
      ).rejects.toThrow("Database not available");
    });
  });

  describe("getAvailableTransitions", () => {
    it("should throw error when database is not available", async () => {
      await expect(
        workflowService.getAvailableTransitions("editorial", 1, "editor")
      ).rejects.toThrow("Database not available");
    });
  });

  describe("executeTransition", () => {
    it("should throw error when database is not available", async () => {
      await expect(
        workflowService.executeTransition({
          entityType: "article",
          entityId: 1,
          transitionId: 1,
          userId: 1,
          comment: "Test"
        })
      ).rejects.toThrow("Database not available");
    });
  });


});

describe("Workflow Status Validation", () => {
  it("should have unique slugs in editorial statuses", () => {
    const slugs = DEFAULT_EDITORIAL_STATUSES.map(s => s.slug);
    const uniqueSlugs = new Set(slugs);
    expect(slugs.length).toBe(uniqueSlugs.size);
  });

  it("should have unique slugs in moderation statuses", () => {
    const slugs = DEFAULT_MODERATION_STATUSES.map(s => s.slug);
    const uniqueSlugs = new Set(slugs);
    expect(slugs.length).toBe(uniqueSlugs.size);
  });

  it("should have exactly one initial status in editorial workflow", () => {
    const initialStatuses = DEFAULT_EDITORIAL_STATUSES.filter(s => s.isInitial);
    expect(initialStatuses.length).toBe(1);
  });

  it("should have exactly one initial status in moderation workflow", () => {
    const initialStatuses = DEFAULT_MODERATION_STATUSES.filter(s => s.isInitial);
    expect(initialStatuses.length).toBe(1);
  });

  it("should have at least one final status in editorial workflow", () => {
    const finalStatuses = DEFAULT_EDITORIAL_STATUSES.filter(s => s.isFinal);
    expect(finalStatuses.length).toBeGreaterThan(0);
  });

  it("should have at least one final status in moderation workflow", () => {
    const finalStatuses = DEFAULT_MODERATION_STATUSES.filter(s => s.isFinal);
    expect(finalStatuses.length).toBeGreaterThan(0);
  });
});

describe("Workflow Color Scheme", () => {
  it("should use appropriate colors for status types", () => {
    // Draft should be gray
    const draft = DEFAULT_EDITORIAL_STATUSES.find(s => s.slug === "draft");
    expect(draft?.color).toBe("#6B7280");

    // Published should be green
    const published = DEFAULT_EDITORIAL_STATUSES.find(s => s.slug === "published");
    expect(published?.color).toBe("#22C55E");

    // Rejected should be red
    const rejected = DEFAULT_EDITORIAL_STATUSES.find(s => s.slug === "rejected");
    expect(rejected?.color).toBe("#DC2626");
  });
});
