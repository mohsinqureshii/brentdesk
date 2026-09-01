import { describe, expect, it, vi, beforeEach } from "vitest";
import { hasDatabase } from "@test/dbAvailable";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ============================================================
// HELPERS
// ============================================================

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-open-id",
    email: "testuser@example.com",
    name: "Test User",
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
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ============================================================
// USER CONTENT TESTS
// ============================================================

describe.runIf(hasDatabase)("userContent", () => {
  describe("myContentStats", () => {
    it("returns content stats for authenticated user", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const stats = await caller.userContent.myContentStats();

      expect(stats).toBeDefined();
      expect(typeof stats.companies).toBe("number");
      expect(typeof stats.jobs).toBe("number");
      expect(typeof stats.people).toBe("number");
      expect(typeof stats.investors).toBe("number");
      expect(typeof stats.events).toBe("number");
      expect(typeof stats.accelerators).toBe("number");
      // All counts should be non-negative
      expect(stats.companies).toBeGreaterThanOrEqual(0);
      expect(stats.jobs).toBeGreaterThanOrEqual(0);
      expect(stats.people).toBeGreaterThanOrEqual(0);
      expect(stats.investors).toBeGreaterThanOrEqual(0);
      expect(stats.events).toBeGreaterThanOrEqual(0);
      expect(stats.accelerators).toBeGreaterThanOrEqual(0);
    });

    it("rejects unauthenticated users", async () => {
      const ctx = createAnonymousContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.userContent.myContentStats()).rejects.toThrow();
    });
  });

  describe("myCompanies", () => {
    it("returns paginated companies for authenticated user", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userContent.myCompanies({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("totalPages");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.page).toBe(1);
    });

    it("rejects unauthenticated users", async () => {
      const ctx = createAnonymousContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.userContent.myCompanies({ page: 1 })).rejects.toThrow();
    });
  });

  describe("myJobs", () => {
    it("returns paginated jobs for authenticated user", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userContent.myJobs({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe("myPeople", () => {
    it("returns paginated people for authenticated user", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userContent.myPeople({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe("myInvestors", () => {
    it("returns paginated investors for authenticated user", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userContent.myInvestors({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe("myEvents", () => {
    it("returns paginated events for authenticated user", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userContent.myEvents({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe("myAccelerators", () => {
    it("returns paginated accelerators for authenticated user", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userContent.myAccelerators({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
    });
  });
});

// ============================================================
// CLAIMED PROFILES TESTS
// ============================================================

describe.runIf(hasDatabase)("claimedProfiles", () => {
  describe("myClaimedProfiles", () => {
    it("returns claimed profiles for authenticated user", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const profiles = await caller.claimedProfiles.myClaimedProfiles();

      expect(profiles).toBeDefined();
      expect(Array.isArray(profiles)).toBe(true);
    });

    it("rejects unauthenticated users", async () => {
      const ctx = createAnonymousContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.claimedProfiles.myClaimedProfiles()).rejects.toThrow();
    });

    it("supports status filter", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const approved = await caller.claimedProfiles.myClaimedProfiles({ status: "approved" });
      expect(Array.isArray(approved)).toBe(true);

      const pending = await caller.claimedProfiles.myClaimedProfiles({ status: "pending" });
      expect(Array.isArray(pending)).toBe(true);
    });
  });

  describe("checkClaim", () => {
    it("returns claim status for a specific entity", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.claimedProfiles.checkClaim({
        entityType: "company",
        entityId: 9999, // Non-existent entity
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("claimed");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("role");
      expect(typeof result.claimed).toBe("boolean");
    });
  });
});

// ============================================================
// CLAIMED PROFILE EDITING TESTS
// ============================================================

describe.runIf(hasDatabase)("claimedProfiles editing", () => {
  describe("getClaimedEntityForEdit", () => {
    it("rejects unauthenticated users", async () => {
      const ctx = createAnonymousContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.claimedProfiles.getClaimedEntityForEdit({
          entityType: "company",
          entityId: 1,
        })
      ).rejects.toThrow();
    });

    it("rejects users without approved claim", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.claimedProfiles.getClaimedEntityForEdit({
          entityType: "company",
          entityId: 99999,
        })
      ).rejects.toThrow();
    });
  });

  describe("editClaimedCompany", () => {
    it("rejects unauthenticated users", async () => {
      const ctx = createAnonymousContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.claimedProfiles.editClaimedCompany({
          companyId: 1,
          name: "Updated Name",
        })
      ).rejects.toThrow();
    });

    it("rejects users without permission", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.claimedProfiles.editClaimedCompany({
          companyId: 99999,
          name: "Updated Name",
        })
      ).rejects.toThrow();
    });
  });

  describe("editClaimedPerson", () => {
    it("rejects users without permission", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.claimedProfiles.editClaimedPerson({
          personId: 99999,
          name: "Updated Name",
        })
      ).rejects.toThrow();
    });
  });

  describe("editClaimedInvestor", () => {
    it("rejects users without permission", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.claimedProfiles.editClaimedInvestor({
          investorId: 99999,
          name: "Updated Name",
        })
      ).rejects.toThrow();
    });
  });

  describe("editClaimedEvent", () => {
    it("rejects users without permission", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.claimedProfiles.editClaimedEvent({
          eventId: 99999,
          title: "Updated Title",
        })
      ).rejects.toThrow();
    });
  });

  describe("editClaimedAccelerator", () => {
    it("rejects users without permission", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.claimedProfiles.editClaimedAccelerator({
          acceleratorId: 99999,
          name: "Updated Name",
        })
      ).rejects.toThrow();
    });
  });

  describe("myClaimedCompanies", () => {
    it("returns claimed companies for authenticated user", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const companies = await caller.claimedProfiles.myClaimedCompanies();

      expect(companies).toBeDefined();
      expect(Array.isArray(companies)).toBe(true);
    });

    it("rejects unauthenticated users", async () => {
      const ctx = createAnonymousContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.claimedProfiles.myClaimedCompanies()).rejects.toThrow();
    });
  });

  describe("companyJobsDashboard", () => {
    it("rejects unauthenticated users", async () => {
      const ctx = createAnonymousContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.claimedProfiles.companyJobsDashboard({ companyId: 1 })
      ).rejects.toThrow();
    });

    it("rejects users without company claim", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.claimedProfiles.companyJobsDashboard({ companyId: 99999 })
      ).rejects.toThrow();
    });
  });
});

// ============================================================
// ADMIN USER SUBMISSIONS TESTS
// ============================================================

describe.runIf(hasDatabase)("admin.userSubmissions", () => {
  it("rejects non-admin users", async () => {
    const ctx = createUserContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.userSubmissions.list({
        page: 1,
        limit: 10,
      })
    ).rejects.toThrow();
  });

  it("allows admin users to list submissions", async () => {
    const ctx = createUserContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.userSubmissions.list({
      page: 1,
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });
});
