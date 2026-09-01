import { describe, it, expect, beforeEach, vi } from "vitest";
import { submissionsRouter } from "./submissions.router";
import { getDb } from "../../db";

vi.mock("../../db");
vi.mock("../../services/email.service", () => ({
  emailService: {
    adminFormNotificationEmail: vi.fn(() => ({
      subject: "Test",
      html: "<p>Test</p>",
      text: "Test",
    })),
    sendEmail: vi.fn().mockResolvedValue(true),
  },
}));

describe("Submissions Router", () => {
  describe("submitStartup", () => {
    it("should accept valid startup submission", async () => {
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
        }),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = submissionsRouter.createCaller({
        req: {
          headers: {
            "x-forwarded-for": "192.168.1.1",
            "user-agent": "Test Agent",
          },
          socket: { remoteAddress: "192.168.1.1" },
        },
        user: null,
      } as any);

      const result = await caller.submitStartup({
        startupName: "TechFlow AI",
        website: "https://techflow.ai",
        description: "An AI-powered platform for automating business workflows",
        category: "ai-ml",
        founderName: "John Doe",
        founderEmail: "john@techflow.ai",
        founderRole: "CEO",
        location: "Dubai, UAE",
        fundingStage: "seed",
        additionalInfo: "We are looking for Series A funding",
      });

      expect(result).toEqual({ success: true, submissionId: 1 });
    });

    it("should reject submission with missing required fields", async () => {
      const mockDb = {
        insert: vi.fn(),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = submissionsRouter.createCaller({
        req: {
          headers: {
            "x-forwarded-for": "192.168.1.1",
            "user-agent": "Test Agent",
          },
          socket: { remoteAddress: "192.168.1.1" },
        },
        user: null,
      } as any);

      // Missing founderEmail
      await expect(
        caller.submitStartup({
          startupName: "TechFlow AI",
          website: "https://techflow.ai",
          description: "An AI-powered platform for automating business workflows",
          category: "ai-ml",
          founderName: "John Doe",
          founderEmail: "", // Invalid
          founderRole: "CEO",
          location: "Dubai, UAE",
          fundingStage: "seed",
        })
      ).rejects.toThrow();
    });

    it("should reject submission with invalid email", async () => {
      const mockDb = {
        insert: vi.fn(),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = submissionsRouter.createCaller({
        req: {
          headers: {
            "x-forwarded-for": "192.168.1.1",
            "user-agent": "Test Agent",
          },
          socket: { remoteAddress: "192.168.1.1" },
        },
        user: null,
      } as any);

      await expect(
        caller.submitStartup({
          startupName: "TechFlow AI",
          website: "https://techflow.ai",
          description: "An AI-powered platform for automating business workflows",
          category: "ai-ml",
          founderName: "John Doe",
          founderEmail: "invalid-email", // Invalid email format
          founderRole: "CEO",
          location: "Dubai, UAE",
          fundingStage: "seed",
        })
      ).rejects.toThrow();
    });

    it("should reject submission with description too short", async () => {
      const mockDb = {
        insert: vi.fn(),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = submissionsRouter.createCaller({
        req: {
          headers: {
            "x-forwarded-for": "192.168.1.1",
            "user-agent": "Test Agent",
          },
          socket: { remoteAddress: "192.168.1.1" },
        },
        user: null,
      } as any);

      await expect(
        caller.submitStartup({
          startupName: "TechFlow AI",
          website: "https://techflow.ai",
          description: "Short", // Too short (min 10 chars)
          category: "ai-ml",
          founderName: "John Doe",
          founderEmail: "john@techflow.ai",
          founderRole: "CEO",
          location: "Dubai, UAE",
          fundingStage: "seed",
        })
      ).rejects.toThrow();
    });

    it("should accept submission with optional fields omitted", async () => {
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([{ insertId: 2 }]),
        }),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = submissionsRouter.createCaller({
        req: {
          headers: {
            "x-forwarded-for": "192.168.1.1",
            "user-agent": "Test Agent",
          },
          socket: { remoteAddress: "192.168.1.1" },
        },
        user: null,
      } as any);

      const result = await caller.submitStartup({
        startupName: "TechFlow AI",
        description: "An AI-powered platform for automating business workflows",
        founderName: "John Doe",
        founderEmail: "john@techflow.ai",
      });

      expect(result).toEqual({ success: true, submissionId: 2 });
    });
  });
});
