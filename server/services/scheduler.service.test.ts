import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database module
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// Mock the workflow service
vi.mock("./workflow.service", () => ({
  workflowService: {
    getStatusBySlug: vi.fn(),
  },
}));

import { schedulerService } from "./scheduler.service";
import { getDb } from "../db";
import { workflowService } from "./workflow.service";

describe("schedulerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("publishScheduledArticles", () => {
    it("should return error when database is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);

      const result = await schedulerService.publishScheduledArticles();

      expect(result.published).toBe(0);
      expect(result.errors).toContain("Database not available");
    });

    it("should return error when scheduled status is not found", async () => {
      const mockDb = {
        select: vi.fn(),
        update: vi.fn(),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      vi.mocked(workflowService.getStatusBySlug).mockResolvedValue(null);

      const result = await schedulerService.publishScheduledArticles();

      expect(result.published).toBe(0);
      expect(result.errors).toContain("Scheduled or Published status not found");
    });

    it("should publish scheduled articles when their time has passed", async () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const mockArticles = [
        { id: 1, title: "Test Article 1", scheduledAt: pastDate, publishedAt: null },
        { id: 2, title: "Test Article 2", scheduledAt: pastDate, publishedAt: pastDate },
      ];

      const mockSelectResult = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockArticles),
      };

      const mockUpdateResult = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const mockDb = {
        select: vi.fn().mockReturnValue(mockSelectResult),
        update: vi.fn().mockReturnValue(mockUpdateResult),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      vi.mocked(workflowService.getStatusBySlug)
        .mockResolvedValueOnce({ id: 8, slug: "scheduled", name: "Scheduled" } as any)
        .mockResolvedValueOnce({ id: 6, slug: "published", name: "Published" } as any);

      const result = await schedulerService.publishScheduledArticles();

      expect(result.published).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it("should not publish articles scheduled for the future", async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      
      // The query should return empty array since we filter by scheduledAt <= now
      const mockSelectResult = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]), // No articles match the criteria
      };

      const mockDb = {
        select: vi.fn().mockReturnValue(mockSelectResult),
        update: vi.fn(),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      vi.mocked(workflowService.getStatusBySlug)
        .mockResolvedValueOnce({ id: 8, slug: "scheduled", name: "Scheduled" } as any)
        .mockResolvedValueOnce({ id: 6, slug: "published", name: "Published" } as any);

      const result = await schedulerService.publishScheduledArticles();

      expect(result.published).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe("start", () => {
    it("should start the scheduler with specified interval", () => {
      vi.useFakeTimers();
      const publishSpy = vi.spyOn(schedulerService, "publishScheduledArticles").mockResolvedValue({ published: 0, errors: [] });

      const timer = schedulerService.start(1000);

      // start() defers the first run behind a 3s DB warm-up setTimeout, so
      // nothing fires synchronously any more.
      expect(publishSpy).not.toHaveBeenCalled();

      // Advance time by 1 second — first interval tick
      vi.advanceTimersByTime(1000);
      expect(publishSpy).toHaveBeenCalledTimes(1);

      // Advance time by another second — second interval tick
      vi.advanceTimersByTime(1000);
      expect(publishSpy).toHaveBeenCalledTimes(2);

      // At t=3000 both the third interval tick and the 3s warm-up
      // setTimeout fire.
      vi.advanceTimersByTime(1000);
      expect(publishSpy).toHaveBeenCalledTimes(4);

      clearInterval(timer);
      vi.useRealTimers();
    });
  });
});
