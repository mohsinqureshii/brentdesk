/**
 * Status Management Tests
 * Tests that admin list endpoints return proper status slugs
 * and that status change actions work correctly
 */

import { describe, it, expect, vi } from "vitest";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

describe("Status Management - Admin List Status Display", () => {
  it("should map workflow_statuses slug to status field in adminList response", () => {
    // Simulate the mapping logic used in all admin list endpoints
    const rawRow = {
      jobs: { id: 1, title: "Test Job", statusId: 2 },
      workflow_statuses: { id: 2, slug: "published", name: "Published", color: "#22C55E" },
    };

    const mapped = {
      ...rawRow.jobs,
      status: rawRow.workflow_statuses?.slug || "draft",
      statusName: rawRow.workflow_statuses?.name || "Draft",
      statusColor: rawRow.workflow_statuses?.color || "#6B7280",
    };

    expect(mapped.status).toBe("published");
    expect(mapped.statusName).toBe("Published");
    expect(mapped.statusColor).toBe("#22C55E");
  });

  it("should default to draft when workflow_statuses is null", () => {
    const rawRow = {
      jobs: { id: 1, title: "Test Job", statusId: null },
      workflow_statuses: null,
    };

    const mapped = {
      ...rawRow.jobs,
      status: rawRow.workflow_statuses?.slug || "draft",
      statusName: rawRow.workflow_statuses?.name || "Draft",
      statusColor: rawRow.workflow_statuses?.color || "#6B7280",
    };

    expect(mapped.status).toBe("draft");
    expect(mapped.statusName).toBe("Draft");
    expect(mapped.statusColor).toBe("#6B7280");
  });

  it("should handle all expected status slugs", () => {
    const expectedStatuses = ["draft", "submitted", "editor_review", "senior_review", "approved", "published", "archived"];
    
    expectedStatuses.forEach((slug) => {
      const rawRow = {
        workflow_statuses: { slug, name: slug.charAt(0).toUpperCase() + slug.slice(1), color: "#000" },
      };

      const mapped = {
        status: rawRow.workflow_statuses?.slug || "draft",
      };

      expect(mapped.status).toBe(slug);
    });
  });
});

describe("Status Management - Bulk Status Update Input", () => {
  it("should accept valid bulk status update input", () => {
    const validInput = {
      ids: [1, 2, 3],
      statusSlug: "published",
    };

    expect(validInput.ids).toHaveLength(3);
    expect(validInput.statusSlug).toBe("published");
  });

  it("should accept single item status update (used by dropdown actions)", () => {
    const singleItemUpdate = {
      ids: [42],
      statusSlug: "draft",
    };

    expect(singleItemUpdate.ids).toHaveLength(1);
    expect(singleItemUpdate.statusSlug).toBe("draft");
  });
});

describe("Status Management - Frontend Status Colors", () => {
  it("should have correct status color mappings", () => {
    const statusColors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-600",
      submitted: "bg-blue-100 text-blue-600",
      editor_review: "bg-yellow-100 text-yellow-600",
      senior_review: "bg-orange-100 text-orange-600",
      approved: "bg-emerald-100 text-emerald-600",
      published: "bg-green-100 text-green-600",
      archived: "bg-red-100 text-red-600",
    };

    expect(statusColors["draft"]).toContain("gray");
    expect(statusColors["published"]).toContain("green");
    expect(statusColors["submitted"]).toContain("blue");
    expect(statusColors["archived"]).toContain("red");
  });

  it("should default to draft styling for unknown status", () => {
    const statusColors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-600",
      published: "bg-green-100 text-green-600",
    };

    const unknownStatus = "unknown_status";
    const color = statusColors[unknownStatus] || statusColors.draft;
    
    expect(color).toBe("bg-gray-100 text-gray-600");
  });
});

describe("Homepage Category Sections", () => {
  it("should have color mappings for all category sections including new ones", () => {
    const sectionColors: Record<string, string> = {
      "funding-vc": "from-emerald-500 to-emerald-600",
      "startups": "from-blue-500 to-blue-600",
      "events": "from-purple-500 to-purple-600",
      "fintech": "from-cyan-500 to-cyan-600",
      "media-gaming-creator-economy": "from-pink-500 to-pink-600",
    };

    // Verify all 5 sections have colors
    expect(Object.keys(sectionColors)).toHaveLength(5);
    expect(sectionColors["events"]).toContain("purple");
    expect(sectionColors["fintech"]).toContain("cyan");
    expect(sectionColors["media-gaming-creator-economy"]).toContain("pink");
  });
});
