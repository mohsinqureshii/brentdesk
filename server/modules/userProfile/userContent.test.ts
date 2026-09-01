import { describe, it, expect } from "vitest";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "test-user-content",
    email: "content-test@example.com",
    name: "Content Test User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

const caller = appRouter.createCaller;

describe("userContent router", () => {
  // ============================================================
  // MY CONTENT OVERVIEW
  // ============================================================
  describe("myContentStats", () => {
    it("should return stats for authenticated user", async () => {
      const ctx = createAuthContext();
      const result = await caller(ctx).userContent.myContentStats();
      expect(result).toBeDefined();
      expect(result).toHaveProperty("companies");
      expect(result).toHaveProperty("jobs");
      expect(result).toHaveProperty("people");
      expect(result).toHaveProperty("investors");
      expect(result).toHaveProperty("events");
      expect(result).toHaveProperty("accelerators");
      expect(typeof result.companies).toBe("number");
      expect(typeof result.jobs).toBe("number");
    });

    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(caller(ctx).userContent.myContentStats()).rejects.toThrow();
    });
  });

  // ============================================================
  // MY COMPANIES
  // ============================================================
  describe("myCompanies", () => {
    it("should return list for authenticated user", async () => {
      const ctx = createAuthContext();
      const result = await caller(ctx).userContent.myCompanies();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(caller(ctx).userContent.myCompanies()).rejects.toThrow();
    });
  });

  // ============================================================
  // CREATE COMPANY
  // ============================================================
  describe("createCompany", () => {
    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(
        caller(ctx).userContent.createCompany({
          name: "Test Company",
          description: "A test company",
        })
      ).rejects.toThrow();
    });

    it("should reject empty name", async () => {
      const ctx = createAuthContext();
      await expect(
        caller(ctx).userContent.createCompany({
          name: "",
          description: "A test company",
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // MY JOBS
  // ============================================================
  describe("myJobs", () => {
    it("should return list for authenticated user", async () => {
      const ctx = createAuthContext();
      const result = await caller(ctx).userContent.myJobs();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(caller(ctx).userContent.myJobs()).rejects.toThrow();
    });
  });

  // ============================================================
  // CREATE JOB
  // ============================================================
  describe("createJob", () => {
    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(
        caller(ctx).userContent.createJob({
          title: "Test Job",
          companyName: "Test Co",
        })
      ).rejects.toThrow();
    });

    it("should reject empty title", async () => {
      const ctx = createAuthContext();
      await expect(
        caller(ctx).userContent.createJob({
          title: "",
          companyName: "Test Co",
        })
      ).rejects.toThrow();
    });

    it("should reject empty company name", async () => {
      const ctx = createAuthContext();
      await expect(
        caller(ctx).userContent.createJob({
          title: "Test Job",
          companyName: "",
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // MY PEOPLE
  // ============================================================
  describe("myPeople", () => {
    it("should return list for authenticated user", async () => {
      const ctx = createAuthContext();
      const result = await caller(ctx).userContent.myPeople();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(caller(ctx).userContent.myPeople()).rejects.toThrow();
    });
  });

  // ============================================================
  // CREATE PERSON
  // ============================================================
  describe("createPerson", () => {
    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(
        caller(ctx).userContent.createPerson({ name: "John Doe" })
      ).rejects.toThrow();
    });

    it("should reject empty name", async () => {
      const ctx = createAuthContext();
      await expect(
        caller(ctx).userContent.createPerson({ name: "" })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // MY INVESTORS
  // ============================================================
  describe("myInvestors", () => {
    it("should return list for authenticated user", async () => {
      const ctx = createAuthContext();
      const result = await caller(ctx).userContent.myInvestors();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(caller(ctx).userContent.myInvestors()).rejects.toThrow();
    });
  });

  // ============================================================
  // CREATE INVESTOR
  // ============================================================
  describe("createInvestor", () => {
    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(
        caller(ctx).userContent.createInvestor({ name: "Test VC", type: "vc" })
      ).rejects.toThrow();
    });

    it("should reject empty name", async () => {
      const ctx = createAuthContext();
      await expect(
        caller(ctx).userContent.createInvestor({ name: "", type: "vc" })
      ).rejects.toThrow();
    });

    it("should reject invalid type", async () => {
      const ctx = createAuthContext();
      await expect(
        caller(ctx).userContent.createInvestor({ name: "Test", type: "invalid" as any })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // MY EVENTS
  // ============================================================
  describe("myEvents", () => {
    it("should return list for authenticated user", async () => {
      const ctx = createAuthContext();
      const result = await caller(ctx).userContent.myEvents();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(caller(ctx).userContent.myEvents()).rejects.toThrow();
    });
  });

  // ============================================================
  // CREATE EVENT
  // ============================================================
  describe("createEvent", () => {
    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(
        caller(ctx).userContent.createEvent({
          title: "Test Event",
          type: "conference",
          startDate: new Date().toISOString(),
        })
      ).rejects.toThrow();
    });

    it("should reject empty title", async () => {
      const ctx = createAuthContext();
      await expect(
        caller(ctx).userContent.createEvent({
          title: "",
          type: "conference",
          startDate: new Date().toISOString(),
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // MY ACCELERATORS
  // ============================================================
  describe("myAccelerators", () => {
    it("should return list for authenticated user", async () => {
      const ctx = createAuthContext();
      const result = await caller(ctx).userContent.myAccelerators();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(caller(ctx).userContent.myAccelerators()).rejects.toThrow();
    });
  });

  // ============================================================
  // CREATE ACCELERATOR
  // ============================================================
  describe("createAccelerator", () => {
    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(
        caller(ctx).userContent.createAccelerator({ name: "Test Accel" })
      ).rejects.toThrow();
    });

    it("should reject empty name", async () => {
      const ctx = createAuthContext();
      await expect(
        caller(ctx).userContent.createAccelerator({ name: "" })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // COMPANY JOBS DASHBOARD
  // ============================================================
  describe("companyJobsDashboard", () => {
    it("should reject unauthenticated user", async () => {
      const ctx = createUnauthContext();
      await expect(
        caller(ctx).userContent.companyJobsDashboard({ companyId: 1 })
      ).rejects.toThrow();
    });
  });
});
